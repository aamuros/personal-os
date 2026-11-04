import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Plus } from 'lucide-react'
import { Card, Dialog, Empty, Field, PageHeader, RemoveButton, Segmented, cx, ic } from '../components/ui'
import { formatDate, shortDate, untilPhrase } from '../lib/date'
import { useToday } from '../lib/hooks'
import { clearParam, useLocation } from '../lib/router'
import { actions, useStore } from '../lib/store'
import type { EventKind, LifeEvent } from '../lib/types'

const KINDS: Array<{ value: EventKind; label: string; plural: string }> = [
  { value: 'milestone', label: 'Milestone', plural: 'Milestones' },
  { value: 'memory', label: 'Memory', plural: 'Memories' },
  { value: 'achievement', label: 'Achievement', plural: 'Achievements' },
]
const kindLabel = (kind: EventKind) => KINDS.find((k) => k.value === kind)?.label ?? kind

export default function Timeline() {
  const today = useToday()
  const { param } = useLocation()
  const events = useStore((s) => s.events)
  const birthYear = useStore((s) => Number(s.profile.birthDate.slice(0, 4)))
  const [filter, setFilter] = useState<EventKind | 'all'>('all')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (param === 'new') setAdding(true)
    if (param) clearParam('timeline')
  }, [param])

  const filtered = useMemo(() => events.filter((e) => filter === 'all' || e.kind === filter), [events, filter])
  const upcoming = filtered.filter((e) => e.date > today).sort((a, b) => a.date.localeCompare(b.date))
  const years = useMemo(() => {
    const past = filtered.filter((e) => e.date <= today).sort((a, b) => b.date.localeCompare(a.date))
    const groups = new Map<string, LifeEvent[]>()
    for (const e of past) {
      const year = e.date.slice(0, 4)
      groups.set(year, [...(groups.get(year) ?? []), e])
    }
    return [...groups.entries()]
  }, [filtered, today])

  const counts = Object.fromEntries(KINDS.map((k) => [k.value, events.filter((e) => e.kind === k.value).length]))
  const month = today.slice(5, 7)
  const thisMonth = events
    .filter((e) => e.date.slice(5, 7) === month && e.date.slice(0, 4) < today.slice(0, 4))
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      <PageHeader
        eyebrow="Reflect"
        title="Timeline"
        subtitle="The moments, milestones, and achievements that shaped your story."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
            <Plus {...ic} />
            Add event
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter events">
        <button type="button" className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
          All <span className="tabular-nums opacity-60">{events.length}</span>
        </button>
        {KINDS.map((k) => (
          <button
            key={k.value}
            type="button"
            className="chip"
            aria-pressed={filter === k.value}
            onClick={() => setFilter(k.value)}
          >
            <span className="tl-dot" data-kind={k.value} aria-hidden />
            {k.plural} <span className="tabular-nums opacity-60">{counts[k.value]}</span>
          </button>
        ))}
      </div>

      <div className="grid items-start gap-4 sm:gap-6 xl:grid-cols-[minmax(0,728fr)_minmax(0,368fr)]">
        <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
          {upcoming.length > 0 && (
            <Card title="Upcoming">
              <EventList events={upcoming} today={today} />
            </Card>
          )}
          <section className="card" aria-label="Past events">
            {years.length === 0 ? (
              <Empty>No events here yet. Add a memory, milestone, or achievement.</Empty>
            ) : (
              years.map(([year, list], i) => (
                <div key={year} className={cx(i > 0 && 'mt-6')}>
                  <div className="mb-1 flex items-baseline gap-2">
                    <h2 className="text-title font-medium tabular-nums">{year}</h2>
                    <span className="text-caption text-muted">Age {Number(year) - birthYear}</span>
                  </div>
                  <EventList events={list} today={today} />
                </div>
              ))
            )}
          </section>
        </div>

        <div className="grid min-w-0 items-start gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-1">
          <Card title={`${formatDate(today, { month: 'long' })} in past years`}>
            {thisMonth.length === 0 ? (
              <Empty>Nothing recorded for this month yet.</Empty>
            ) : (
              <ul className="-mt-1 flex flex-col gap-3">
                {thisMonth.slice(0, 4).map((e) => (
                  <li key={e.id} className="flex items-start gap-3">
                    <span className="tl-dot m-0 mt-1.5 shadow-none" data-kind={e.kind} aria-hidden />
                    <div className="min-w-0">
                      <p className="text-label text-secondary">{e.title}</p>
                      <p className="text-caption text-muted">
                        {Number(today.slice(0, 4)) - Number(e.date.slice(0, 4))} years ago · {e.date.slice(0, 4)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="At a glance">
            <ul className="-mt-1 flex flex-col gap-2.5">
              {KINDS.map((k) => (
                <li key={k.value} className="flex items-center gap-2.5 text-label">
                  <span className="tl-dot m-0 shadow-none" data-kind={k.value} aria-hidden />
                  <span className="flex-1 text-secondary">{k.plural}</span>
                  <span className="tabular-nums text-muted">{counts[k.value]}</span>
                </li>
              ))}
            </ul>
            <div className="divider my-4" />
            <a href="#life-calendar" className="card-link">
              See them on your life calendar
              <ArrowRight size={12} strokeWidth={1.75} />
            </a>
          </Card>
        </div>
      </div>

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add event" description="Record a moment worth remembering.">
        <AddEventForm today={today} onDone={() => setAdding(false)} />
      </Dialog>
    </>
  )
}

function EventList({ events, today }: { events: LifeEvent[]; today: string }) {
  return (
    <ol>
      {events.map((e) => (
        <li key={e.id} className="tl-item reveal">
          <time className="pt-0.5 text-caption tabular-nums text-muted" dateTime={e.date}>
            {shortDate(e.date)}
          </time>
          <span className="tl-rail" aria-hidden>
            <span className="tl-dot" data-kind={e.kind} />
          </span>
          <div className="min-w-0">
            <p className="text-body font-medium">{e.title}</p>
            {e.note && <p className="mt-0.5 text-label text-muted">{e.note}</p>}
            <p className="mt-1 text-caption text-faint">
              {kindLabel(e.kind)}
              {e.date > today && ` · ${untilPhrase(e.date, today)}`}
            </p>
          </div>
          <RemoveButton label={`Remove ${e.title}`} onClick={() => actions.removeEvent(e.id)} className="-my-1" />
        </li>
      ))}
    </ol>
  )
}

function AddEventForm({ today, onDone }: { today: string; onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today)
  const [kind, setKind] = useState<EventKind>('memory')
  const [note, setNote] = useState('')

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim() || !date) return
        actions.addEvent({ title: title.trim(), date, kind, note: note.trim() || undefined })
        onDone()
      }}
    >
      <Field label="What happened?">
        <input
          autoFocus
          className="input"
          maxLength={80}
          placeholder="Moved to a new city"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Field label="Date">
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Type" group>
          <div>
            <Segmented label="Type" value={kind} onChange={setKind} options={KINDS.map((k) => ({ value: k.value, label: k.label }))} />
          </div>
        </Field>
      </div>
      <Field label="Note" optional>
        <textarea
          className="input"
          rows={2}
          maxLength={200}
          placeholder="A detail you want to remember"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      <button type="submit" className="btn btn-primary mt-1 w-full" disabled={!title.trim() || !date}>
        Add to timeline
      </button>
    </form>
  )
}
