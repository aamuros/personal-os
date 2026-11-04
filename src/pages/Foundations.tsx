import { useState } from 'react'
import { ArrowDown, ArrowUp, Check as CheckIcon, Plus } from 'lucide-react'
import { FoundationsGap } from '../components/FoundationsGap'
import { Card, Dialog, Empty, InlineAdd, PageHeader, RemoveButton, ic } from '../components/ui'
import { sincePhrase } from '../lib/date'
import { useToday } from '../lib/hooks'
import { actions, useStore } from '../lib/store'
import type { LifeArea } from '../lib/types'
import { NewGoalForm } from './Goals'

export default function Foundations() {
  const today = useToday()
  const reviewedOn = useStore((s) => s.profile.reviewedOn)
  const reviewedToday = reviewedOn === today

  return (
    <>
      <PageHeader
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
      <div className="grid items-start gap-4 xl:grid-cols-2">
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
  const values = useStore((s) => s.values)
  const today = useToday()
  const [goalArea, setGoalArea] = useState<LifeArea | null>(null)
  const [editingImportance, setEditingImportance] = useState(false)
  const [createdGoal, setCreatedGoal] = useState(false)

  return (
    <div className="mt-4">
      <FoundationsGap
        areas={areas}
        onSatisfactionChange={(id, value) => actions.rateArea(id, 'satisfaction', value)}
        onCreateGoal={(area) => {
          setCreatedGoal(false)
          setGoalArea(area)
        }}
        onEditImportance={() => setEditingImportance(true)}
      />
      <p role="status" className={createdGoal ? 'mt-3 text-label text-muted' : 'sr-only'}>
        {createdGoal && <>Goal created. <a href="#goals" className="text-fg underline underline-offset-4">View goals</a></>}
      </p>
      <Dialog
        open={goalArea !== null}
        onClose={() => setGoalArea(null)}
        title={`New goal for ${goalArea?.name ?? 'a life area'}`}
        description="Give this area a little more attention with a concrete next step."
      >
        <NewGoalForm
          today={today}
          values={values}
          initialWhy={goalArea ? `${goalArea.name} matters to me, and I want to give it more attention.` : ''}
          onCreated={() => {
            setGoalArea(null)
            setCreatedGoal(true)
          }}
        />
      </Dialog>
      <Dialog
        open={editingImportance}
        onClose={() => setEditingImportance(false)}
        title="Edit importance"
        description="Rate how much each area matters to you, from 1 to 5."
      >
        <ul className="flex flex-col divide-y divide-line">
          {areas.map((area) => (
            <li key={area.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="text-body font-medium">{area.name}</span>
              <Rater
                label={`${area.name} importance`}
                value={area.importance}
                onChange={(value) => actions.rateArea(area.id, 'importance', value)}
              />
            </li>
          ))}
        </ul>
        <div className="mt-5 flex justify-end">
          <button type="button" className="btn btn-primary" onClick={() => setEditingImportance(false)}>Done</button>
        </div>
      </Dialog>
    </div>
  )
}

function Rater({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (value: number) => void
  label: string
}) {
  return (
    <span role="group" aria-label={label} className="rater">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-pressed={value === n}
          aria-label={`${n} of 5`}
          data-on={n <= value}
          onClick={() => onChange(n)}
        />
      ))}
    </span>
  )
}
