import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import type { LifeArea } from '../lib/types'
import './foundations-gap.css'

const MAX = 5
const SORTS = [
  { id: 'gap', label: 'Gap' },
  { id: 'importance', label: 'Importance' },
  { id: 'yours', label: 'Yours' },
] as const
type Sort = (typeof SORTS)[number]['id']
type Kind = 'have' | 'gap' | 'ahead'
const STATUS = { need: 'Needs attention', grow: 'Room to grow', ok: 'Aligned', ahead: 'Ahead' }
const LEGEND: Record<Kind, string> = { have: 'Satisfied', gap: 'Gap', ahead: 'Ahead' }
const rating = (n: number) => Math.min(MAX, Math.max(0, Math.round(Number.isFinite(n) ? n : 0)))
const vars = (values: Record<string, number>) => values as CSSProperties

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return reduced
}

function Percentage({ value, label, still }: { value: number; label: string; still: boolean }) {
  const previous = useRef(value)
  const mounted = useRef(false)
  const direction = value < previous.current ? 'down' : 'up'
  useEffect(() => {
    previous.current = value
    mounted.current = true
  }, [value])
  const digits = String(value).split('')
  return (
    <span className="fg-num">
      <span className="fg-sr">{value}% {label}</span>
      <span className="fg-roll" aria-hidden="true">
        {digits.map((digit, index) => (
          <span className="fg-wheel" key={digits.length - index}>
            <span
              key={digit}
              className="fg-digit"
              data-pop={mounted.current && !still || undefined}
              data-dir={direction}
              style={vars({ '--i': index })}
            >{digit}</span>
          </span>
        ))}
      </span>
      <span className="fg-pct" aria-hidden="true">%</span>
    </span>
  )
}

export function FoundationsGap({ areas, onSatisfactionChange, onCreateGoal, onEditImportance }: {
  areas: LifeArea[]
  onSatisfactionChange: (id: string, value: number) => void
  onCreateGoal: (area: LifeArea) => void
  onEditImportance: () => void
}) {
  const id = useId()
  const reduced = useReducedMotion()
  const card = useRef<HTMLElement>(null)
  const [seen, setSeen] = useState(false)
  const [intro, setIntro] = useState(false)
  const [sort, setSort] = useState<Sort>('gap')
  const [hovered, setHovered] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [lens, setLens] = useState<Kind | null>(null)
  const [previewLens, setPreviewLens] = useState<Kind | null>(null)
  const active = dragging ?? hovered ?? focused
  const rows = useMemo(() => areas.map((area) => {
    const importance = rating(area.importance)
    const satisfaction = rating(area.satisfaction)
    const gap = importance - satisfaction
    const state = gap >= 2 ? 'need' : gap === 1 ? 'grow' : gap === 0 ? 'ok' : 'ahead'
    return { ...area, importance, satisfaction, gap, state } as const
  }), [areas])
  const sorted = useMemo(() => {
    const ordered = [...rows]
    if (sort === 'gap') ordered.sort((a, b) => b.gap - a.gap || b.importance - a.importance)
    if (sort === 'importance') ordered.sort((a, b) => b.importance - a.importance || b.gap - a.gap)
    return ordered.map((area) => area.id)
  }, [rows, sort])

  // Keep the DOM and visual order stable while a bar is being edited.
  const [frozen, setFrozen] = useState<string[] | null>(null)
  const order = frozen
    ? [...frozen.filter((areaId) => sorted.includes(areaId)), ...sorted.filter((areaId) => !frozen.includes(areaId))]
    : sorted
  const orderRef = useRef(order)
  orderRef.current = order
  const releaseTimer = useRef(0)
  const holdOrder = (delay: number | null) => {
    window.clearTimeout(releaseTimer.current)
    setFrozen((current) => current ?? orderRef.current)
    if (delay !== null) releaseTimer.current = window.setTimeout(() => setFrozen(null), reduced ? 0 : delay)
  }
  useEffect(() => () => window.clearTimeout(releaseTimer.current), [])

  useEffect(() => {
    const element = card.current
    if (!element || typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setSeen(true)
        observer.disconnect()
      }
    }, { threshold: 0.25 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!seen || reduced) {
      setIntro(false)
      return
    }
    setIntro(true)
    const timer = window.setTimeout(() => setIntro(false), rows.length * 70 + MAX * 40 + 400)
    return () => window.clearTimeout(timer)
  }, [seen, reduced, rows.length])

  const selected = rows.find((area) => area.id === active)
  const importance = rows.reduce((total, area) => total + area.importance, 0)
  const satisfied = rows.reduce((total, area) => total + Math.min(area.satisfaction, area.importance), 0)
  const percent = selected
    ? selected.importance === 0 ? 100 : Math.round(100 * Math.min(selected.satisfaction, selected.importance) / selected.importance)
    : importance === 0 ? 100 : Math.round(100 * satisfied / importance)
  const context = selected
    ? `${selected.name} · feels ${selected.satisfaction}, matters ${selected.importance}`
    : 'aligned overall'
  const biggest = [...rows].sort((a, b) => b.gap - a.gap || b.importance - a.importance)[0]
  const kinds: Kind[] = []
  if (rows.some((area) => Math.min(area.satisfaction, area.importance) > 0)) kinds.push('have')
  if (rows.some((area) => area.gap > 0)) kinds.push('gap')
  if (rows.some((area) => area.gap < 0)) kinds.push('ahead')
  const requestedLens = previewLens ?? lens
  const activeLens = requestedLens && kinds.includes(requestedLens) ? requestedLens : null

  const change = (area: LifeArea, value: number) => {
    const next = rating(value)
    if (next !== area.satisfaction) onSatisfactionChange(area.id, next)
  }
  const pointer = useRef<{
    id: string; pointerId: number; x: number; y: number; raw: number; moved: boolean; touch: boolean
  } | null>(null)
  const atPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return rect.width > 0 ? rating(Math.ceil((event.clientX - rect.left) / rect.width * MAX)) : 0
  }
  const startDrag = (event: PointerEvent<HTMLDivElement>, area: LifeArea) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return
    const raw = atPointer(event)
    const touch = event.pointerType === 'touch'
    pointer.current = { id: area.id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, raw, moved: false, touch }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.focus({ preventScroll: true })
    setDragging(area.id)
    holdOrder(null)
    if (!touch) change(area, raw === 1 && area.satisfaction === 1 ? 0 : raw)
  }
  const moveDrag = (event: PointerEvent<HTMLDivElement>, area: LifeArea) => {
    const session = pointer.current
    if (!session || session.id !== area.id || session.pointerId !== event.pointerId) return
    if (session.touch && !session.moved) {
      const dx = Math.abs(event.clientX - session.x)
      if (dx < 4 || dx <= Math.abs(event.clientY - session.y)) return
      session.moved = true
    }
    const raw = atPointer(event)
    if (raw !== session.raw || session.touch) {
      session.raw = raw
      change(area, raw)
    }
  }
  const endDrag = (event: PointerEvent<HTMLDivElement>, area: LifeArea) => {
    const session = pointer.current
    if (!session || session.pointerId !== event.pointerId) return
    if (event.type === 'pointerup' && session.touch && !session.moved) {
      change(area, session.raw === 1 && area.satisfaction === 1 ? 0 : session.raw)
    }
    pointer.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    setDragging(null)
    holdOrder(380)
  }
  const rateWithKey = (event: KeyboardEvent<HTMLDivElement>, area: LifeArea) => {
    let next: number
    switch (event.key) {
      case 'ArrowRight': case 'ArrowUp': next = area.satisfaction + 1; break
      case 'ArrowLeft': case 'ArrowDown': next = area.satisfaction - 1; break
      case 'Home': next = 0; break
      case 'End': next = MAX; break
      default: return
    }
    event.preventDefault()
    holdOrder(800)
    change(area, next)
  }

  return (
    <section ref={card} className="fg" aria-labelledby={`${id}-title`} data-stroke="on"
      data-lens={activeLens ?? undefined} data-seen={seen || undefined}
      data-intro={intro || undefined} data-still={reduced || undefined}>
      <header className="fg-head">
        <div className="fg-titles">
          <h2 className="fg-title" id={`${id}-title`}>Life priorities</h2>
          <p className="fg-sub">How each area feels against how much it matters</p>
        </div>
        <div className="fg-sort" role="group" aria-label="Sort areas by" style={vars({ '--at': SORTS.findIndex((option) => option.id === sort) })}>
          <span className="fg-thumb" aria-hidden="true" />
          {SORTS.map((option) => (
            <button key={option.id} type="button" className="fg-tab" aria-pressed={sort === option.id}
              data-on={sort === option.id || undefined} onClick={() => {
                window.clearTimeout(releaseTimer.current)
                setFrozen(null)
                setSort(option.id)
              }}>{option.label}</button>
          ))}
        </div>
      </header>
      <div className="fg-figure">
        <Percentage value={percent} label={context} still={reduced} />
        <span className="fg-of" aria-hidden="true">{context}</span>
      </div>
      <div className="fg-insight">
        <p className="fg-note" key={biggest ? `${biggest.id}:${biggest.state}` : 'empty'}>
          {!biggest ? 'Add a life area to see where it stands.' : biggest.gap >= 2 ? (
            <><b>{biggest.name}</b> {biggest.importance >= 4 ? 'matters a lot' : 'matters'} but feels neglected right now.</>
          ) : biggest.gap === 1 ? (
            <><b>{biggest.name}</b> has some room to grow.</>
          ) : 'Everything you care about is getting its share of attention.'}
        </p>
        {biggest && biggest.gap > 0 && (
          <button type="button" className="fg-act" aria-label={`Add a goal for ${biggest.name}`}
            onClick={() => onCreateGoal(areas.find((area) => area.id === biggest.id)!)}>Add a goal</button>
        )}
      </div>
      {kinds.length > 0 && (
        <div className="fg-legend" role="group" aria-label="Highlight">
          {kinds.map((kind) => (
            <button key={kind} type="button" className="fg-chip" aria-pressed={lens === kind}
              data-on={activeLens === kind || undefined}
              onPointerEnter={() => setPreviewLens(kind)} onPointerLeave={() => setPreviewLens(null)}
              onFocus={(event) => { if (event.currentTarget.matches(':focus-visible')) setPreviewLens(kind) }}
              onBlur={() => setPreviewLens(null)} onClick={() => setLens((current) => current === kind ? null : kind)}>
              <i className="fg-swatch" data-k={kind} aria-hidden="true" />{LEGEND[kind]}
            </button>
          ))}
        </div>
      )}
      <ul className="fg-rows" style={vars({ '--n': rows.length, '--steps': MAX })}>
        {rows.map((area) => (
          <li key={area.id} className="fg-row" data-state={area.state}
            data-on={active === area.id || undefined} data-dim={active !== null && active !== area.id || undefined}
            data-drag={dragging === area.id || undefined} style={vars({ '--i': order.indexOf(area.id) })}
            onPointerEnter={() => setHovered(area.id)} onPointerLeave={() => setHovered(null)}
            onFocus={() => setFocused(area.id)} onBlur={() => setFocused(null)}>
            <span className="fg-name" title={area.name}>{area.name}</span>
            <div className="fg-scale" data-editable role="slider" tabIndex={0} aria-label={`${area.name}, how it feels`}
              aria-valuemin={0} aria-valuemax={MAX} aria-valuenow={area.satisfaction}
              aria-valuetext={`${area.satisfaction} of ${MAX}. Matters ${area.importance} of ${MAX}. ${STATUS[area.state]}.`}
              onPointerDown={(event) => startDrag(event, area)} onPointerMove={(event) => moveDrag(event, area)}
              onPointerUp={(event) => endDrag(event, area)} onPointerCancel={(event) => endDrag(event, area)}
              onLostPointerCapture={(event) => endDrag(event, area)} onKeyDown={(event) => rateWithKey(event, area)}>
              <div className="fg-track" aria-hidden="true">
                {Array.from({ length: MAX }, (_, index) => {
                  const step = index + 1
                  const have = step <= Math.min(area.satisfaction, area.importance)
                  const ahead = step > area.importance && step <= area.satisfaction
                  return (
                    <i key={step} className="fg-seg" data-k={have ? 'have' : ahead ? 'ahead' : step <= area.importance ? 'gap' : 'room'}
                      data-want={step <= area.importance || undefined} data-fill={have ? 'have' : ahead ? 'ahead' : undefined}
                      style={vars({ '--s': index })} />
                  )
                })}
              </div>
            </div>
            <span className="fg-status" data-state={area.state}><i className="fg-dot" aria-hidden="true" />{STATUS[area.state]}</span>
          </li>
        ))}
      </ul>
      {rows.length > 0 && (
        <footer className="fg-foot">
          <p>Drag a bar, or use ← → on a row, to rate how it feels right now.</p>
          <button type="button" className="fg-edit" onClick={onEditImportance}>Edit importance</button>
        </footer>
      )}
    </section>
  )
}
