import { useState } from 'react'
import { ArrowDown, ArrowUp, Check as CheckIcon, Plus } from 'lucide-react'
import { Card, Empty, InlineAdd, PageHeader, RemoveButton, cx, ic } from '../components/ui'
import { sincePhrase } from '../lib/date'
import { useToday } from '../lib/hooks'
import { actions, useStore } from '../lib/store'
import type { LifeArea } from '../lib/types'

export default function Foundations() {
  const today = useToday()
  const reviewedOn = useStore((s) => s.profile.reviewedOn)
  const reviewedToday = reviewedOn === today

  return (
    <>
      <PageHeader
        eyebrow="Understand"
        title="Guiding foundations"
        subtitle="The values, principles, and priorities everything else is built on. Revisit them once a week."
        actions={
          <>
            <span className="text-caption text-muted">
              {reviewedOn ? `Reviewed ${sincePhrase(reviewedOn, today)}` : 'Not reviewed yet'}
            </span>
            <button type="button" className="btn btn-subtle" disabled={reviewedToday} onClick={actions.markReviewed}>
              <CheckIcon {...ic} />
              {reviewedToday ? 'Reviewed' : 'Mark reviewed'}
            </button>
          </>
        }
      />
      <div className="grid items-start gap-4 sm:gap-6 xl:grid-cols-2">
        <ValuesCard />
        <PrinciplesCard />
      </div>
      <AreasCard />
    </>
  )
}

function ValuesCard() {
  const values = useStore((s) => s.values)
  const [adding, setAdding] = useState(false)

  return (
    <Card title="Core values" aside={<span className="text-caption text-muted">In order of importance</span>}>
      {values.length === 0 && <Empty>What matters most to you? Start with three to five values.</Empty>}
      <ol className="-mt-1 flex flex-col gap-0.5">
        {values.map((v, i) => (
          <li key={v.id} className="row row-interactive items-start py-3">
            <span className="w-4 shrink-0 text-label tabular-nums text-faint">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="text-body font-medium">{v.name}</p>
              {v.description && <p className="mt-0.5 text-label text-muted">{v.description}</p>}
            </div>
            <div className="row-action -my-1 flex shrink-0 gap-0.5">
              <button
                type="button"
                className="icon-btn"
                aria-label={`Move ${v.name} up`}
                disabled={i === 0}
                onClick={() => actions.moveValue(v.id, -1)}
              >
                <ArrowUp size={14} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Move ${v.name} down`}
                disabled={i === values.length - 1}
                onClick={() => actions.moveValue(v.id, 1)}
              >
                <ArrowDown size={14} strokeWidth={1.5} />
              </button>
              <RemoveButton label={`Remove ${v.name}`} onClick={() => actions.removeValue(v.id)} className="opacity-100" />
            </div>
          </li>
        ))}
      </ol>
      {adding ? (
        <AddValueForm onDone={() => setAdding(false)} />
      ) : (
        <button type="button" className="btn btn-ghost mt-2 -ml-3.5" onClick={() => setAdding(true)}>
          <Plus {...ic} />
          Add value
        </button>
      )}
    </Card>
  )
}

function AddValueForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  return (
    <form
      className="mt-2 -mx-3 flex flex-col gap-1 rounded-row bg-wash p-3"
      onKeyDown={(e) => e.key === 'Escape' && onDone()}
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        actions.addValue(name.trim(), description.trim())
        onDone()
      }}
    >
      <input
        autoFocus
        className="inline-input font-medium"
        placeholder="Value, e.g. Courage"
        aria-label="Value name"
        maxLength={40}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="inline-input text-label"
        placeholder="What it means to you, in one line"
        aria-label="Value description"
        maxLength={120}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={!name.trim()}>
          Add value
        </button>
      </div>
    </form>
  )
}

function PrinciplesCard() {
  const principles = useStore((s) => s.principles)
  return (
    <Card title="Principles" aside={<span className="text-caption text-muted">Rules you choose to live by</span>}>
      {principles.length === 0 && <Empty>Short, memorable rules that make decisions easier.</Empty>}
      <ul className="-mt-1 flex flex-col gap-0.5">
        {principles.map((p) => (
          <li key={p.id} className="row row-interactive items-start py-2.5">
            <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-faint" aria-hidden />
            <p className="min-w-0 flex-1 text-body text-secondary">{p.text}</p>
            <RemoveButton label="Remove principle" onClick={() => actions.removePrinciple(p.id)} className="-my-1 -mr-1.5" />
          </li>
        ))}
      </ul>
      <InlineAdd buttonLabel="Add principle" placeholder="e.g. Leave every place better than I found it" onSubmit={actions.addPrinciple} />
    </Card>
  )
}

function AreasCard() {
  const areas = useStore((s) => s.areas)
  const biggest = areas.reduce<LifeArea | undefined>(
    (best, a) =>
      !best || a.importance - a.satisfaction > best.importance - best.satisfaction ? a : best,
    undefined,
  )
  const showInsight = biggest && biggest.importance - biggest.satisfaction >= 2

  return (
    <Card
      className="mt-4 sm:mt-6"
      title="Life priorities"
      aside={
        <span className="hidden items-center gap-4 text-caption text-muted sm:flex">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-secondary" />
            Importance
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-cyan" />
            Satisfaction
          </span>
        </span>
      }
    >
      <p className="-mt-2 mb-5 text-label text-muted">
        {showInsight ? (
          <>
            <span className="text-fg">{biggest.name}</span> matters a lot but feels neglected right now. Consider a
            goal or habit for it.
          </>
        ) : (
          'Rate how much each area matters and how satisfied you feel with it today.'
        )}
      </p>
      <div className="hidden grid-cols-[minmax(0,1fr)_116px_116px_132px] gap-6 pb-2 text-caption font-medium text-muted sm:grid">
        <span>Area</span>
        <span>Importance</span>
        <span>Satisfaction</span>
        <span className="text-right">Status</span>
      </div>
      <ul>
        {areas.map((a) => {
          const gap = a.importance - a.satisfaction
          return (
            <li
              key={a.id}
              className="grid grid-cols-2 items-center gap-x-6 gap-y-3 border-t border-line py-3.5 sm:grid-cols-[minmax(0,1fr)_116px_116px_132px]"
            >
              <span className="text-body font-medium">{a.name}</span>
              <span className="text-right text-label sm:order-last">
                {gap >= 2 ? (
                  <span className="text-amber">Needs attention</span>
                ) : gap === 1 ? (
                  <span className="text-tertiary">Room to grow</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-tertiary">
                    <span className="size-1.5 rounded-full bg-green" aria-hidden />
                    Aligned
                  </span>
                )}
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-caption text-muted sm:hidden">Importance</span>
                <Rater label={`${a.name} importance`} value={a.importance} onChange={(n) => actions.rateArea(a.id, 'importance', n)} />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-caption text-muted sm:hidden">Satisfaction</span>
                <Rater
                  label={`${a.name} satisfaction`}
                  value={a.satisfaction}
                  tone="cyan"
                  onChange={(n) => actions.rateArea(a.id, 'satisfaction', n)}
                />
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function Rater({
  value,
  onChange,
  label,
  tone,
}: {
  value: number
  onChange: (value: number) => void
  label: string
  tone?: 'cyan'
}) {
  return (
    <span role="radiogroup" aria-label={label} className={cx('rater')} data-tone={tone}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} of 5`}
          data-on={n <= value}
          onClick={() => onChange(n)}
        />
      ))}
    </span>
  )
}
