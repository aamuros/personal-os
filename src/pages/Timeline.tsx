import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Dialog, PageHeader } from '../components/ui'
import { TimelineWheel } from '../components/TimelineWheel'
import { daysBetween, formatDate, fromKey, toKey } from '../lib/date'
import { useToday } from '../lib/hooks'
import { clearParam, useLocation } from '../lib/router'
import { actions, useStore } from '../lib/store'
import type { EventKind, LifeEvent } from '../lib/types'
import './timeline.css'

const KINDS: Array<{ value: EventKind; label: string; plural: string }> = [
  { value: 'milestone', label: 'Milestone', plural: 'Milestones' },
  { value: 'memory', label: 'Memory', plural: 'Memories' },
  { value: 'achievement', label: 'Achievement', plural: 'Achievements' },
]
const kindLabel = (kind: EventKind) => KINDS.find((k) => k.value === kind)?.label ?? kind

function eventAge(date: string, birthDate: string) {
  return Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4)) - (date.slice(5) < birthDate.slice(5) ? 1 : 0)
}

function eventRelative(date: string, today: string) {
  const days = daysBetween(today, date)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 14) return `in ${days} days`
  if (days < 70) return `in ${Math.round(days / 7)} weeks`
  return `in ${Math.round(days / 30.44)} months`
}

export default function Timeline() {
  const today = useToday()
  const { param } = useLocation()
  const events = useStore((s) => s.events)
  const profile = useStore((s) => s.profile)
  const [tab, setTab] = useState<'events' | 'wheel'>('events')
  const [filter, setFilter] = useState<EventKind | 'all'>('all')
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming')
  const [adding, setAdding] = useState(false)
  const [removed, setRemoved] = useState<LifeEvent | null>(null)

  useEffect(() => {
    if (param === 'new') setAdding(true)
    if (param) clearParam('timeline')
  }, [param])

  useEffect(() => {
    if (!removed) return
    const timer = window.setTimeout(() => setRemoved(null), 6000)
    return () => window.clearTimeout(timer)
  }, [removed])

  const filtered = useMemo(() => events.filter((e) => filter === 'all' || e.kind === filter), [events, filter])
  const upcoming = filtered.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date))
  const past = filtered.filter((e) => e.date < today).sort((a, b) => b.date.localeCompare(a.date))
  const counts = Object.fromEntries(KINDS.map((k) => [k.value, events.filter((e) => e.kind === k.value).length]))

  function removeEvent(event: LifeEvent) {
    actions.removeEvent(event.id)
    setRemoved(event)
  }

  function showEvent(event: Omit<LifeEvent, 'id'>) {
    setFilter('all')
    setView(event.date >= today ? 'upcoming' : 'past')
  }

  const renderEvents = (list: LifeEvent[]) => (
    <EventList events={list} today={today} birthDate={profile.birthDate} onRemove={removeEvent} />
  )

  return (
    <div className="timeline-page" data-view={view}>
      <PageHeader
        eyebrow="Reflect"
        title="Timeline"
        subtitle="The moments, milestones, and achievements that shaped your story."
        actions={<button type="button" className="timeline-button" onClick={() => setAdding(true)}>Add event</button>}
      />

      <div className="timeline-bar">
        <div className="timeline-segment" role="tablist" aria-label="Timeline view"
          onKeyDown={(e) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
            e.preventDefault()
            const next = e.key === 'Home' ? 'events' : e.key === 'End' ? 'wheel' : tab === 'events' ? 'wheel' : 'events'
            setTab(next)
            e.currentTarget.querySelector<HTMLButtonElement>(`#timeline-tab-${next}`)?.focus()
          }}>
          {(['events', 'wheel'] as const).map((option) => (
            <button key={option} type="button" role="tab" id={`timeline-tab-${option}`} aria-selected={tab === option}
              aria-controls={`timeline-panel-${option}`} tabIndex={tab === option ? 0 : -1} onClick={() => setTab(option)}>
              {option === 'events' ? 'Events' : 'Wheel'}
            </button>
          ))}
        </div>
        <div className="timeline-filters" role="group" aria-label="Filter events">
          <button type="button" className="timeline-chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
            All <span className="timeline-filter-count">{events.length}</span>
          </button>
          {KINDS.map((kind) => (
            <button key={kind.value} type="button" className="timeline-chip" aria-pressed={filter === kind.value} onClick={() => setFilter(kind.value)}>
              <i className="timeline-dot" data-kind={kind.value} aria-hidden="true" />
              {kind.plural} <span className="timeline-filter-count">{counts[kind.value]}</span>
            </button>
          ))}
        </div>
      </div>

      <div role="tabpanel" id="timeline-panel-events" aria-labelledby="timeline-tab-events" hidden={tab !== 'events'}>
        <div className="timeline-segment timeline-switch" role="group" aria-label="Show events">
          {(['upcoming', 'past'] as const).map((option) => (
            <button key={option} type="button" aria-pressed={view === option} onClick={() => setView(option)}>
              {option === 'upcoming' ? 'Upcoming' : 'Past'}
            </button>
          ))}
        </div>
        <div className="timeline-columns">
          {(['upcoming', 'past'] as const).map((column) => {
            const list = column === 'upcoming' ? upcoming : past
            return (
              <section key={column} className="timeline-slab" data-column={column} aria-labelledby={`timeline-${column}-heading`}>
                <div className="timeline-heading">
                  <h2 id={`timeline-${column}-heading`}>{column === 'upcoming' ? 'Upcoming' : 'Past'}</h2>
                  <span className="timeline-count"><RollingCount value={list.length} /> {list.length === 1 ? 'event' : 'events'}</span>
                </div>
                {list.length ? renderEvents(list) : <p className="timeline-empty">{events.length ? 'Nothing here yet.' : 'No events yet. Add your first one.'}</p>}
              </section>
            )
          })}
        </div>
      </div>

      <div role="tabpanel" id="timeline-panel-wheel" aria-labelledby="timeline-tab-wheel" hidden={tab !== 'wheel'}>
        {tab === 'wheel' && <TimelineWheel profile={profile} today={today} events={filtered} renderEvents={renderEvents} />}
      </div>

      {removed && <div className="timeline-toast" role="status" aria-live="polite">
        <span>Removed “{removed.title}”</span>
        <button type="button" className="timeline-button timeline-secondary timeline-small" onClick={() => {
          const { id: _id, ...event } = removed
          actions.addEvent(event)
          showEvent(event)
          setRemoved(null)
        }}>Undo</button>
      </div>}

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add event" className="timeline-dialog">
        <AddEventForm today={today} onCancel={() => setAdding(false)} onDone={(event) => {
          actions.addEvent(event)
          showEvent(event)
          setTab('events')
          setAdding(false)
        }} />
      </Dialog>
    </div>
  )
}

function RollingCount({ value }: { value: number }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  return <span className="timeline-roll" role="img" aria-label={String(value)}>
    {Array.from(String(value), (digit, index) => <span key={index} className="timeline-digit" aria-hidden="true">
      <span className="timeline-digits" style={{ transform: `translateY(calc(var(--timeline-digit-height) * -${ready ? Number(digit) : 0}))`, transitionDelay: `${index * 70}ms` }}>
        {Array.from('0123456789', (number) => <b key={number}>{number}</b>)}
      </span>
    </span>)}
  </span>
}

function EventList({ events, today, birthDate, onRemove }: {
  events: LifeEvent[]; today: string; birthDate: string; onRemove: (event: LifeEvent) => void
}) {
  return <ul className="timeline-list">
    {events.map((event) => <EventRow key={event.id} event={event} today={today} birthDate={birthDate} onRemove={onRemove} />)}
  </ul>
}

function EventRow({ event, today, birthDate, onRemove }: {
  event: LifeEvent; today: string; birthDate: string; onRemove: (event: LifeEvent) => void
}) {
  const [removing, setRemoving] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const upcoming = event.date >= today
  const age = eventAge(event.date, birthDate)
  return <li className="timeline-item" data-removing={removing || undefined}>
    <div><div className="timeline-row">
      <div className="timeline-event-copy">
        <p className="timeline-event-title" title={event.title}>{event.title}</p>
        <p className="timeline-event-meta">
          <span className="timeline-kind"><i className="timeline-dot" data-kind={event.kind} data-upcoming={upcoming || undefined} aria-hidden="true" />{kindLabel(event.kind)}</span>
          {event.note && <span className="timeline-note" title={event.note}>{event.note}</span>}
        </p>
      </div>
      <div className="timeline-event-date">
        <time dateTime={event.date}>{formatDate(event.date, { month: 'short', day: 'numeric', year: 'numeric' })}</time>
        <span>{upcoming ? eventRelative(event.date, today) : age >= 0 ? `Age ${age}` : ''}</span>
      </div>
      <button type="button" className="timeline-remove" aria-label={`Remove ${event.title}`} disabled={removing} onClick={() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          onRemove(event)
          return
        }
        setRemoving(true)
        timer.current = setTimeout(() => onRemove(event), 340)
      }}><X size={14} strokeWidth={1.5} aria-hidden="true" /></button>
    </div></div>
  </li>
}

function AddEventForm({ today, onCancel, onDone }: {
  today: string; onCancel: () => void; onDone: (event: Omit<LifeEvent, 'id'>) => void
}) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today)
  const [kind, setKind] = useState<EventKind>('milestone')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  return <form className="timeline-form" noValidate onSubmit={(e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Add a title for the event.')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '1900-01-01' || date > '2100-12-31' || toKey(fromKey(date)) !== date) {
      setError('Pick a date between 1900 and 2100.')
      return
    }
    onDone({ title: title.trim(), date, kind, note: note.trim() || undefined })
  }}>
    <label>Title<input autoFocus className="timeline-input" maxLength={60} autoComplete="off" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
    <label>Date<input type="date" className="timeline-input" min="1900-01-01" max="2100-12-31" value={date} onChange={(e) => setDate(e.target.value)} /></label>
    <fieldset><legend>Kind</legend><div className="timeline-form-kinds">
      {KINDS.map((option) => <button key={option.value} type="button" className="timeline-chip" aria-pressed={kind === option.value} onClick={() => setKind(option.value)}>{option.label}</button>)}
    </div></fieldset>
    <label>Note (optional)<input className="timeline-input" maxLength={90} autoComplete="off" value={note} onChange={(e) => setNote(e.target.value)} /></label>
    <p className="timeline-error" role="alert">{error}</p>
    <div className="timeline-dialog-actions">
      <button type="button" className="timeline-button timeline-secondary" onClick={onCancel}>Cancel</button>
      <button type="submit" className="timeline-button">Add event</button>
    </div>
  </form>
}
