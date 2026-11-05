import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { GripVertical } from 'lucide-react'
import type { Value } from '../lib/types'
import { RemoveButton } from './ui'

type DragView = { id: string; from: number; to: number; offset: number; height: number }
type DragSession = {
  view: DragView
  pointerId: number
  x: number
  y: number
  startY: number
  scrollTop: number
  container: HTMLElement
  rows: DOMRect[]
  pageTarget: HTMLButtonElement | null
}

/** Adapts Bencho Arrange's direct pointer tracking and displaced neighbors.
 * The saved order changes only on drop; cancellation leaves it untouched. */
export function ValueReorderList({ values, start, pageSize, listId, onMove, onRemove }: {
  values: Value[]
  start: number
  pageSize: number
  listId: string
  onMove: (id: string, index: number) => void
  onRemove: (id: string) => void
}) {
  const [drag, setDrag] = useState<DragView | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const instructionsId = useId()
  const listRef = useRef<HTMLOListElement>(null)
  const session = useRef<DragSession | null>(null)
  const frame = useRef(0)
  const dropPositions = useRef<Map<string, number> | null>(null)
  const settling = useRef<Animation[]>([])

  useLayoutEffect(() => {
    const positions = dropPositions.current
    if (drag || !positions) return
    dropPositions.current = null
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Continue from the painted drag positions before the reordered DOM is shown.
    // Neighbors may still be mid-transition when the pointer is released.
    settling.current = Array.from(listRef.current?.children ?? []).flatMap((row) => {
      const top = positions.get((row as HTMLElement).dataset.valueId ?? '')
      if (top === undefined) return []
      const offset = top - row.getBoundingClientRect().top
      if (Math.abs(offset) < 0.5) return []
      return [row.animate([
        { transform: `translateY(${offset}px)` },
        { transform: 'translateY(0)' },
      ], { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' })]
    })
  }, [drag, values, start])

  useEffect(() => () => {
    cancelAnimationFrame(frame.current)
    settling.current.forEach((animation) => animation.cancel())
    session.current?.pageTarget?.removeAttribute('data-drag-over')
    session.current = null
  }, [])

  const finish = (commit: boolean) => {
    const current = session.current
    if (!current) return
    cancelAnimationFrame(frame.current)
    current.pageTarget?.removeAttribute('data-drag-over')
    dropPositions.current = new Map(Array.from(listRef.current?.children ?? []).map((row) => [
      (row as HTMLElement).dataset.valueId!, row.getBoundingClientRect().top,
    ]))
    session.current = null
    setDrag(null)
    const { id, to } = current.view
    const name = values.find((value) => value.id === id)?.name ?? 'Value'
    if (commit) {
      onMove(id, to)
      setAnnouncement(`${name}, position ${to + 1} of ${values.length}.`)
    } else {
      setAnnouncement(`Reordering ${name} cancelled.`)
    }
  }

  const track = () => {
    const current = session.current
    if (!current) return
    const { container, rows, view } = current
    const bounds = container.getBoundingClientRect()
    const inside = current.x >= bounds.left && current.x <= bounds.right
    // Scroll the bounded list while held near its edge, even with a still pointer.
    if (inside && current.y >= bounds.top && current.y <= bounds.bottom) {
      if (current.y < bounds.top + 28) container.scrollTop -= 5
      else if (current.y > bounds.bottom - 28) container.scrollTop += 5
    }
    const scrolled = container.scrollTop - current.scrollTop
    const origin = rows[view.from]
    const offset = Math.max(rows[0].top - origin.top,
      Math.min(current.y - current.startY + scrolled, rows[rows.length - 1].bottom - origin.bottom))
    const center = origin.top + origin.height / 2 + offset
    let to = start + rows.filter((row, index) => index !== view.from && row.top + row.height / 2 < center).length
    const target = document.elementFromPoint(current.x, current.y)?.closest<HTMLButtonElement>('[data-value-page-target]') ?? null
    const pageTarget = target && !target.disabled && container.closest('.foundations-card')?.contains(target) ? target : null
    if (pageTarget !== current.pageTarget) {
      current.pageTarget?.removeAttribute('data-drag-over')
      pageTarget?.setAttribute('data-drag-over', 'true')
      current.pageTarget = pageTarget
    }
    if (pageTarget) to = Number(pageTarget.dataset.valuePageTarget)
    current.view = { ...view, to, offset }
    setDrag((previous) => previous?.to === to && previous.offset === offset ? previous : current.view)
    frame.current = requestAnimationFrame(track)
  }

  return (
    <>
      <p id={instructionsId} className="sr-only">Drag to reorder. Use Up or Down to move one position, or Home and End to move to the beginning or end. Escape cancels a drag. Drop on a page arrow to move between pages.</p>
      <span role="status" className="sr-only">{announcement}</span>
      <ol ref={listRef} id={listId} start={start + 1} className="foundations-list" aria-label="Core values">
        {values.slice(start, start + pageSize).map((value, offset) => {
          const index = start + offset
          const held = drag?.id === value.id
          let shift = 0
          if (drag) {
            // Neighbors move by the held row's measured height plus the 2px gap.
            if (index > start + drag.from && index <= drag.to) shift = -drag.height - 2
            if (index < start + drag.from && index >= drag.to) shift = drag.height + 2
          }
          return (
            <li key={value.id} className="row row-interactive foundations-entry foundations-value-row"
              data-value-id={value.id}
              data-held={held || undefined} data-reordering={!!drag || undefined}
              style={{ transform: `translateY(${held ? drag.offset : shift}px)` }}>
              <button type="button" className="foundations-grip" aria-label={`Reorder ${value.name}, position ${index + 1} of ${values.length}`}
                aria-describedby={instructionsId} title="Drag to reorder · Arrow keys to move"
                onPointerDown={(event) => {
                  if (!event.isPrimary || event.button !== 0 || session.current) return
                  settling.current.forEach((animation) => animation.cancel())
                  settling.current = []
                  const container = listRef.current?.parentElement
                  const rows = Array.from(listRef.current?.children ?? []).map((row) => row.getBoundingClientRect())
                  if (!container || !rows[offset]) return
                  event.preventDefault()
                  event.currentTarget.focus()
                  event.currentTarget.setPointerCapture(event.pointerId)
                  const view = { id: value.id, from: offset, to: index, offset: 0, height: rows[offset].height }
                  session.current = { view, pointerId: event.pointerId, x: event.clientX, y: event.clientY, startY: event.clientY,
                    scrollTop: container.scrollTop, container, rows, pageTarget: null }
                  setDrag(view)
                  setAnnouncement(`Picked up ${value.name}. Drag to a new position; Escape cancels.`)
                  frame.current = requestAnimationFrame(track)
                }}
                onPointerMove={(event) => {
                  if (session.current?.pointerId !== event.pointerId) return
                  session.current.x = event.clientX
                  session.current.y = event.clientY
                }}
                onPointerUp={(event) => {
                  const current = session.current
                  if (current?.pointerId !== event.pointerId) return
                  current.x = event.clientX
                  current.y = event.clientY
                  cancelAnimationFrame(frame.current)
                  track()
                  const bounds = current.container.getBoundingClientRect()
                  finish(!!current.pageTarget || (event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom))
                }}
                onPointerCancel={() => finish(false)}
                onLostPointerCapture={() => finish(false)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape' && session.current) { event.preventDefault(); finish(false); return }
                  if (session.current) return
                  const target = event.key === 'ArrowUp' ? index - 1 : event.key === 'ArrowDown' ? index + 1
                    : event.key === 'Home' ? 0 : event.key === 'End' ? values.length - 1 : null
                  if (target === null) return
                  event.preventDefault()
                  const to = Math.max(0, Math.min(values.length - 1, target))
                  onMove(value.id, to)
                  setAnnouncement(`${value.name}, position ${to + 1} of ${values.length}.`)
                }}>
                <GripVertical size={16} strokeWidth={1.5} aria-hidden="true" />
              </button>
              <div className="foundations-entry-copy">
                <p className="text-body font-medium">{value.name}</p>
                {value.description && <p className="mt-0.5 text-label text-muted">{value.description}</p>}
              </div>
              <RemoveButton label={`Remove ${value.name}`} onClick={() => onRemove(value.id)} className="self-center -mr-1.5" />
            </li>
          )
        })}
      </ol>
    </>
  )
}
