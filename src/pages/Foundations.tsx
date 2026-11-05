import { useEffect, useId, useRef, useState } from 'react'
import { Check as CheckIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { ValueReorderList } from '../components/ValueReorderList'
import { FoundationsGap } from '../components/FoundationsGap'
import { Card, Dialog, Empty, Field, PageHeader, RemoveButton, ic } from '../components/ui'
import { sincePhrase } from '../lib/date'
import { useToday } from '../lib/hooks'
import { actions, useStore } from '../lib/store'
import type { LifeArea } from '../lib/types'
import { NewGoalForm } from './Goals'
import './foundations.css'

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
      <div className="grid items-stretch gap-4 xl:grid-cols-2">
        <ValuesCard />
        <PrinciplesCard />
      </div>
      <AreasCard />
    </>
  )
}

const FOUNDATION_PAGE_SIZE = 5
const PRINCIPLES_PAGE_SIZE = 8

function useFoundationPage(count: number, pageSize = FOUNDATION_PAGE_SIZE) {
  const [requestedPage, setPage] = useState(0)
  const page = Math.min(requestedPage, Math.max(0, Math.ceil(count / pageSize) - 1))
  const listId = useId()
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Keep the next set of entries anchored at the top, including after deletion.
    if (listRef.current) listRef.current.scrollTop = 0
  }, [page])

  return { page, start: page * pageSize, setPage, listId, listRef }
}

function FoundationFooter({
  label,
  count,
  page,
  listId,
  pageSize = FOUNDATION_PAGE_SIZE,
  onPageChange,
  onAdd,
}: {
  label: 'value' | 'principle'
  count: number
  page: number
  listId: string
  pageSize?: number
  onPageChange: (page: number) => void
  onAdd: () => void
}) {
  const start = page * pageSize
  return (
    <div className="foundations-footer">
      <button type="button" className="btn btn-ghost foundations-add" onClick={onAdd}>
        <Plus {...ic} />
        Add {label}
      </button>
      {count > pageSize && (
        <nav className="foundations-pagination" aria-label={`${label === 'value' ? 'Core values' : 'Principles'} pages`}>
          <span role="status" className="foundations-range">
            <span className="sr-only">{label === 'value' ? 'Values' : 'Principles'} </span>
            {start + 1}–{Math.min(start + pageSize, count)} of {count}
          </span>
          <button
            type="button"
            className="icon-btn"
            aria-label={`Previous ${label}s`}
            data-value-page-target={label === 'value' ? start - 1 : undefined}
            aria-controls={listId}
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft {...ic} />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={`Next ${label}s`}
            data-value-page-target={label === 'value' ? start + pageSize : undefined}
            aria-controls={listId}
            disabled={start + pageSize >= count}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight {...ic} />
          </button>
        </nav>
      )}
    </div>
  )
}

function ValuesCard() {
  const values = useStore((s) => s.values)
  const [adding, setAdding] = useState(false)
  const { page, start, setPage, listId, listRef } = useFoundationPage(values.length)

  return (
    <Card
      className="foundations-card"
      title={<>Core values <span className="foundations-count">{values.length}</span></>}
      aside={<span className="text-caption text-muted">Drag to reorder</span>}
    >
      <div className="foundations-list-window" ref={listRef}>
        {values.length === 0 && <Empty>What matters most to you? Start with three to five values.</Empty>}
        <ValueReorderList
          values={values}
          start={start}
          pageSize={FOUNDATION_PAGE_SIZE}
          listId={listId}
          onMove={(id, index) => {
            actions.reorderValue(id, index)
            setPage(Math.floor(index / FOUNDATION_PAGE_SIZE))
          }}
          onRemove={(id) => {
            actions.removeValue(id)
            setPage(Math.min(page, Math.max(0, Math.ceil((values.length - 1) / FOUNDATION_PAGE_SIZE) - 1)))
          }}
        />
      </div>
      <FoundationFooter label="value" count={values.length} page={page} listId={listId} onPageChange={setPage} onAdd={() => setAdding(true)} />
      <Dialog open={adding} onClose={() => setAdding(false)} title="Add value" description="Name what matters to you and what it means in everyday life.">
        <AddValueForm onCancel={() => setAdding(false)} onSubmit={(name, description) => {
          actions.addValue(name, description)
          setPage(Math.floor(values.length / FOUNDATION_PAGE_SIZE))
          setAdding(false)
        }} />
      </Dialog>
    </Card>
  )
}

function AddValueForm({ onSubmit, onCancel }: { onSubmit: (name: string, description: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  return (
    <form className="flex flex-col gap-5" onSubmit={(e) => {
      e.preventDefault()
      if (name.trim()) onSubmit(name.trim(), description.trim())
    }}>
      <Field label="Value name">
        <input
          autoFocus
          required
          className="input"
          placeholder="e.g. Courage"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field label="What it means to you" optional>
        <textarea
          className="input"
          placeholder="Describe it in one line"
          rows={2}
          maxLength={120}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={!name.trim()}>Add value</button>
      </div>
    </form>
  )
}

function PrinciplesCard() {
  const principles = useStore((s) => s.principles)
  const [adding, setAdding] = useState(false)
  const { page, start, setPage, listId, listRef } = useFoundationPage(principles.length, PRINCIPLES_PAGE_SIZE)
  return (
    <Card
      className="foundations-card"
      title={<>Principles <span className="foundations-count">{principles.length}</span></>}
      aside={<span className="text-caption text-muted">Rules you choose to live by</span>}
    >
      <div className="foundations-list-window" ref={listRef}>
        {principles.length === 0 && <Empty>Short, memorable rules that make decisions easier.</Empty>}
        <ul id={listId} className="foundations-list" aria-label="Principles">
          {principles.slice(start, start + PRINCIPLES_PAGE_SIZE).map((p) => (
            <li key={p.id} className="row row-interactive foundations-entry foundations-principle">
              <q className="foundations-entry-copy foundations-quote text-body text-secondary">{p.text}</q>
              <RemoveButton label={`Remove principle: ${p.text}`} onClick={() => {
                actions.removePrinciple(p.id)
                setPage(Math.min(page, Math.max(0, Math.ceil((principles.length - 1) / PRINCIPLES_PAGE_SIZE) - 1)))
              }} className="-my-1 -mr-1.5" />
            </li>
          ))}
        </ul>
      </div>
      <FoundationFooter pageSize={PRINCIPLES_PAGE_SIZE} label="principle" count={principles.length} page={page} listId={listId} onPageChange={setPage} onAdd={() => setAdding(true)} />
      <Dialog open={adding} onClose={() => setAdding(false)} title="Add principle" description="A short, memorable rule to help guide your decisions.">
        <AddPrincipleForm onCancel={() => setAdding(false)} onSubmit={(text) => {
          actions.addPrinciple(text)
          setPage(Math.floor(principles.length / PRINCIPLES_PAGE_SIZE))
          setAdding(false)
        }} />
      </Dialog>
    </Card>
  )
}

function AddPrincipleForm({ onSubmit, onCancel }: { onSubmit: (text: string) => void; onCancel: () => void }) {
  const [text, setText] = useState('')
  return (
    <form className="flex flex-col gap-5" onSubmit={(e) => {
      e.preventDefault()
      if (text.trim()) onSubmit(text.trim())
    }}>
      <Field label="Principle">
        <textarea
          autoFocus
          required
          className="input"
          placeholder="e.g. Leave every place better than I found it"
          rows={3}
          maxLength={140}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </Field>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={!text.trim()}>Add principle</button>
      </div>
    </form>
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
