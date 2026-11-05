import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDown, BookOpen, CalendarDays, CalendarRange, Compass, Flag, Image as ImageIcon, Pencil, Plus, Trophy, X } from 'lucide-react'
import { Autobiography } from '../components/Autobiography'
import { Dialog, PageHeader } from '../components/ui'
import { TimelineWheel } from '../components/TimelineWheel'
import { formatDate, fromKey, toKey } from '../lib/date'
import { useToday } from '../lib/hooks'
import { clearParam, useLocation } from '../lib/router'
import { actions, useStore } from '../lib/store'
import { eventAge, eventRelative, formatEventDate, groupEventMonths, splitTimelineEvents, summarizeEventYears, type EventView } from '../lib/timeline-events'
import type { EventKind, LifeEvent } from '../lib/types'
import './timeline.css'

const KINDS: Array<{ value: EventKind; label: string; plural: string }> = [
  { value: 'milestone', label: 'Milestone', plural: 'Milestones' },
  { value: 'memory', label: 'Memory', plural: 'Memories' },
  { value: 'achievement', label: 'Achievement', plural: 'Achievements' },
]
const kindLabel = (kind: EventKind) => KINDS.find((k) => k.value === kind)?.label ?? kind
const KIND_ICONS = { milestone: Flag, memory: ImageIcon, achievement: Trophy }
const TABS = [
  { value: 'events', label: 'Events', Icon: CalendarRange },
  { value: 'wheel', label: 'Explore', Icon: Compass },
  { value: 'autobiography', label: 'Autobiography', Icon: BookOpen },
] as const

export default function Timeline() {
  const today = useToday()
  const { param } = useLocation()
  const events = useStore((s) => s.events)
  const profile = useStore((s) => s.profile)
  const [tab, setTab] = useState<typeof TABS[number]['value']>('events')
  const [filter, setFilter] = useState<EventKind | 'all'>('all')
  const [view, setView] = useState<EventView>(() => events.some((event) => event.date >= today) || !events.length ? 'upcoming' : 'past')
  const [year, setYear] = useState('all')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<LifeEvent | null>(null)
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
  const periods = useMemo(() => splitTimelineEvents(events, today), [events, today])
  const matching = useMemo(() => periods[view].filter((event) => filter === 'all' || event.kind === filter), [periods, view, filter])
  const years = useMemo(() => summarizeEventYears(matching), [matching])
  // Removing the last event in a selected year returns to the available years.
  const selectedYear = years.some((item) => item.year === year) ? year : 'all'
  const visible = matching.filter((event) => selectedYear === 'all' || event.date.startsWith(`${selectedYear}-`))
  const months = groupEventMonths(visible)
  const hasFilters = filter !== 'all'
  const otherView = view === 'upcoming' ? 'past' : 'upcoming'

  function removeEvent(event: LifeEvent) {
    actions.removeEvent(event.id)
    setRemoved(event)
  }

  function showEvent(event: Omit<LifeEvent, 'id'>) {
    setFilter('all')
    setYear(event.date.slice(0, 4))
    setView(event.date >= today ? 'upcoming' : 'past')
    setTab('events')
  }

  function changeView(next: EventView) {
    setView(next)
    setYear('all')
  }

  function changeFilter(next: EventKind | 'all') {
    setFilter(next)
    setYear('all')
  }

  function clearFilters() {
    setFilter('all')
    setYear('all')
  }

  const renderEvents = (list: LifeEvent[]) => (
    <EventList events={list} today={today} birthDate={profile.birthDate} onRemove={removeEvent} onEdit={setEditing} />
  )

  return (
    <div className="timeline-page">
      <PageHeader
        eyebrow="Reflect"
        title="Timeline"
        subtitle="See what’s ahead. Revisit the moments that matter."
        actions={<button type="button" className="timeline-button" onClick={() => setAdding(true)}><Plus size={15} strokeWidth={1.5} aria-hidden="true" />Add event</button>}
      />

      <div className="timeline-bar">
        <div className="timeline-segment timeline-view-tabs" data-active={tab} role="tablist" aria-label="Timeline view"
          onKeyDown={(e) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
            e.preventDefault()
            const index = TABS.findIndex((option) => option.value === tab)
            const next = TABS[e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : (index + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length].value
            setTab(next)
            e.currentTarget.querySelector<HTMLButtonElement>(`#timeline-tab-${next}`)?.focus()
          }}>
          {TABS.map(({ value, label, Icon }) => (
            <button key={value} type="button" role="tab" id={`timeline-tab-${value}`} aria-selected={tab === value}
              aria-controls={`timeline-panel-${value}`} tabIndex={tab === value ? 0 : -1} onClick={() => setTab(value)}>
              <Icon size={16} strokeWidth={1.5} aria-hidden="true" />{label}
            </button>
          ))}
        </div>
        <span className="timeline-total">{events.length} {events.length === 1 ? 'life event' : 'life events'}</span>
      </div>

      <div role="tabpanel" id="timeline-panel-autobiography" aria-labelledby="timeline-tab-autobiography" hidden={tab !== 'autobiography'} tabIndex={0}>
        <Autobiography />
      </div>

      <div role="tabpanel" id="timeline-panel-events" aria-labelledby="timeline-tab-events" hidden={tab !== 'events'}>
        <div className="timeline-workspace">
          <div className="timeline-controls">
            <div className="timeline-period-switch" role="group" aria-label="Show events">
              {(['upcoming', 'past'] as const).map((option) => (
                <button key={option} type="button" aria-pressed={view === option} onClick={() => changeView(option)}>
                  {option === 'upcoming' ? 'Upcoming' : 'Past'}
                  <span className="timeline-filter-count">{periods[option].length}</span>
                </button>
              ))}
            </div>
            <TimelineFilters events={periods[view]} value={filter} onChange={changeFilter} />
          </div>

          <div className="timeline-workspace-body" data-empty={!years.length || undefined}>
            {!!years.length && <YearNavigation years={years} selected={selectedYear} onSelect={setYear} />}
            <section className="timeline-agenda" aria-labelledby="timeline-agenda-heading">
              <div className="timeline-agenda-heading">
                <div>
                  <h2 id="timeline-agenda-heading">{view === 'upcoming' ? 'Upcoming events' : 'Past events'}</h2>
                  <p><ArrowDown size={12} aria-hidden="true" />{selectedYear === 'all' ? 'All years' : selectedYear} · {view === 'upcoming' ? 'Nearest first' : 'Most recent first'}</p>
                </div>
                <span className="timeline-count" role="status" aria-live="polite" aria-atomic="true"><RollingCount value={visible.length} /> {visible.length === 1 ? 'event' : 'events'}</span>
              </div>

              {visible.length ? <div className="timeline-agenda-track" key={view}>
                <div className="timeline-present"><span>Today</span><time dateTime={today}>{formatDate(today, { month: 'short', day: 'numeric', year: 'numeric' })}</time></div>
                {months.map((group) => <section className="timeline-month" key={group.month} aria-labelledby={`timeline-month-${group.month}`}>
                  <h3 id={`timeline-month-${group.month}`} className="timeline-month-heading">{group.month.length === 4 ? `${group.month} · Approximate year` : formatDate(`${group.month}-01`, { month: 'long', year: 'numeric' })}</h3>
                  <EventList events={group.events} today={today} birthDate={profile.birthDate} onRemove={removeEvent} onEdit={setEditing} layout="agenda" nextEventId={periods.upcoming[0]?.id} />
                </section>)}
              </div> : <div className="timeline-empty-state">
                <CalendarDays size={24} strokeWidth={1.25} aria-hidden="true" />
                <h3>{!events.length ? 'Your timeline starts here' : hasFilters ? 'No matching events' : view === 'upcoming' ? 'Nothing coming up yet' : 'No past events yet'}</h3>
                <p>{!events.length ? 'Add a milestone, memory, or achievement to see it on your timeline.' : hasFilters ? 'Choose another event type to see more moments.' : view === 'upcoming' ? 'Add a future milestone to see what’s ahead.' : 'Save a moment you want to remember.'}</p>
                <div>
                  <button type="button" className="timeline-button timeline-secondary" onClick={hasFilters ? clearFilters : () => setAdding(true)}>{hasFilters ? 'Clear filters' : !events.length ? 'Add your first event' : 'Add event'}</button>
                  {!hasFilters && !!periods[otherView].length && <button type="button" className="timeline-text-button" onClick={() => changeView(otherView)}>View {otherView} events</button>}
                </div>
              </div>}
            </section>
          </div>
        </div>
      </div>

      <div role="tabpanel" id="timeline-panel-wheel" aria-labelledby="timeline-tab-wheel" hidden={tab !== 'wheel'}>
        <TimelineFilters events={events} value={filter} onChange={changeFilter} />
        {tab === 'wheel' && <TimelineWheel profile={profile} today={today} events={filtered} renderEvents={renderEvents} />}
      </div>

      {removed && createPortal(<div className="timeline-page timeline-notification-layer"><div className="timeline-toast" role="status" aria-live="polite">
        <span>Removed “{removed.title}”</span>
        <button type="button" className="timeline-button timeline-secondary timeline-small" onClick={() => {
          const { id: _id, ...event } = removed
          actions.addEvent(event)
          showEvent(event)
          setRemoved(null)
        }}>Undo</button>
      </div></div>, document.body)}

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add event" className="timeline-dialog">
        <EventForm today={today} onCancel={() => setAdding(false)} onDone={(event) => {
          actions.addEvent(event)
          showEvent(event)
          setAdding(false)
        }} />
      </Dialog>
      <Dialog open={editing !== null} onClose={() => setEditing(null)} title="Edit event" className="timeline-dialog">
        {editing && <EventForm key={editing.id} today={today} initial={editing} onCancel={() => setEditing(null)} onDone={(event) => {
          actions.updateEvent(editing.id, event)
          showEvent(event)
          setEditing(null)
        }} />}
      </Dialog>
    </div>
  )
}

function TimelineFilters({ events, value, onChange }: {
  events: LifeEvent[]; value: EventKind | 'all'; onChange: (value: EventKind | 'all') => void
}) {
  return <div className="timeline-filters" role="group" aria-label="Filter events by type">
    <button type="button" className="timeline-chip" aria-pressed={value === 'all'} onClick={() => onChange('all')}>
      All types <span className="timeline-filter-count">{events.length}</span>
    </button>
    {KINDS.map((kind) => <button key={kind.value} type="button" className="timeline-chip" aria-pressed={value === kind.value} onClick={() => onChange(kind.value)}>
      <i className="timeline-dot" data-kind={kind.value} aria-hidden="true" />
      {kind.plural} <span className="timeline-filter-count">{events.filter((event) => event.kind === kind.value).length}</span>
    </button>)}
  </div>
}

function YearNavigation({ years, selected, onSelect }: {
  years: ReturnType<typeof summarizeEventYears>; selected: string; onSelect: (year: string) => void
}) {
  const max = Math.max(...years.map((item) => item.count), 1)
  return <nav className="timeline-years" aria-labelledby="timeline-years-heading">
    <h2 id="timeline-years-heading">Browse by year<span>Events</span></h2>
    <div className="timeline-year-options">
      <button type="button" className="timeline-year timeline-year-all" aria-pressed={selected === 'all'} onClick={() => onSelect('all')}>
        <span className="timeline-year-label"><b>All years</b><span>{years.reduce((count, item) => count + item.count, 0)}</span></span>
      </button>
      {years.map((item) => <button key={item.year} type="button" className="timeline-year" aria-pressed={selected === item.year}
        aria-label={`${item.year}, ${item.count} ${item.count === 1 ? 'event' : 'events'}`} onClick={() => onSelect(item.year)}>
        <span className="timeline-year-label"><b>{item.year}</b><span>{item.count}</span></span>
        <span className="timeline-year-track" aria-hidden="true">
          {KINDS.map((kind) => <span key={kind.value} data-kind={kind.value} style={{ width: `${item.kinds[kind.value] / max * 100}%` }} />)}
        </span>
      </button>)}
    </div>
  </nav>
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

function EventList({ events, today, birthDate, onRemove, onEdit, layout = 'compact', nextEventId }: {
  events: LifeEvent[]; today: string; birthDate: string; onRemove: (event: LifeEvent) => void; onEdit: (event: LifeEvent) => void
  layout?: 'compact' | 'agenda'; nextEventId?: string
}) {
  return <ol className="timeline-list" data-layout={layout}>
    {events.map((event) => <EventRow key={event.id} event={event} today={today} birthDate={birthDate} onRemove={onRemove} onEdit={onEdit} agenda={layout === 'agenda'} next={event.id === nextEventId} />)}
  </ol>
}

function EventRow({ event, today, birthDate, onRemove, onEdit, agenda, next }: {
  event: LifeEvent; today: string; birthDate: string; onRemove: (event: LifeEvent) => void; onEdit: (event: LifeEvent) => void
  agenda: boolean; next: boolean
}) {
  const upcoming = event.date >= today
  const age = eventAge(event.date, birthDate)
  const approximate = !!event.datePrecision
  const dateLabel = formatEventDate(event)
  const dateTime = event.date.slice(0, event.datePrecision === 'year' ? 4 : event.datePrecision === 'month' ? 7 : 10)
  const KindIcon = KIND_ICONS[event.kind]
  return <li className="timeline-item" data-next={next || undefined}>
    <div><div className="timeline-row">
      {agenda && <>
        <time className="timeline-date-stamp" dateTime={dateTime} aria-label={dateLabel}>
          <span>{approximate ? event.datePrecision === 'year' ? event.date.slice(0, 4) : formatDate(event.date, { month: 'short' }) : formatDate(event.date, { weekday: 'short' })}</span><b>{approximate ? '≈' : Number(event.date.slice(8))}</b>
        </time>
        <span className="timeline-event-pin" data-kind={event.kind} aria-hidden="true"><KindIcon size={13} strokeWidth={1.5} /></span>
      </>}
      <div className="timeline-event-copy">
        {agenda && <p className="timeline-event-label"><span>{kindLabel(event.kind)}</span>{approximate ? <span>{dateLabel}</span> : age >= 0 && <span>Age {age}</span>}{next && <span className="timeline-next">Next up</span>}</p>}
        <p className="timeline-event-title" title={event.title}>{event.title}</p>
        {agenda ? event.note && <p className="timeline-event-note">{event.note}</p> : <p className="timeline-event-meta">
          <span className="timeline-kind"><i className="timeline-dot" data-kind={event.kind} data-upcoming={upcoming || undefined} aria-hidden="true" />{kindLabel(event.kind)}</span>
          {event.note && <span className="timeline-note" title={event.note}>{event.note}</span>}
        </p>}
      </div>
      {agenda ? <span className="timeline-event-relative" data-today={!approximate && event.date === today || undefined}>{approximate ? '' : eventRelative(event.date, today)}</span> : <div className="timeline-event-date">
        <time dateTime={dateTime}>{dateLabel}</time>
        {!approximate && <span>{upcoming ? eventRelative(event.date, today) : age >= 0 ? `Age ${age}` : ''}</span>}
      </div>}
      <div className="timeline-event-actions">
        <button type="button" className="timeline-edit" aria-label={`Edit ${event.title}`} title="Edit event" onClick={() => onEdit(event)}><Pencil size={14} strokeWidth={1.5} aria-hidden="true" /></button>
        <button type="button" className="timeline-remove" aria-label={`Remove ${event.title}`} title="Remove event" onClick={() => onRemove(event)}><X size={14} strokeWidth={1.5} aria-hidden="true" /></button>
      </div>
    </div></div>
  </li>
}

function EventForm({ today, initial, onCancel, onDone }: {
  today: string; initial?: LifeEvent; onCancel: () => void; onDone: (event: Omit<LifeEvent, 'id'>) => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [date, setDate] = useState(initial?.date ?? today)
  const [precision, setPrecision] = useState<'exact' | 'year' | 'month'>(initial?.datePrecision ?? 'exact')
  const [kind, setKind] = useState<EventKind>(initial?.kind ?? 'milestone')
  const [note, setNote] = useState(initial?.note ?? '')
  const [error, setError] = useState('')
  return <form className="timeline-form" noValidate onSubmit={(e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Add a title for the event.')
      return
    }
    const eventDate = precision === 'year' ? `${date.slice(0, 4)}-01-01` : precision === 'month' ? `${date.slice(0, 7)}-01` : date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || eventDate < '1900-01-01' || eventDate > '2100-12-31' || toKey(fromKey(eventDate)) !== eventDate) {
      setError('Pick a date between 1900 and 2100.')
      return
    }
    onDone({ title: title.trim(), date: eventDate, datePrecision: precision === 'exact' ? undefined : precision, kind, note: note.trim() || undefined })
  }}>
    <label>Title<input autoFocus className="timeline-input" autoComplete="off" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
    <label>Date accuracy<select className="timeline-input" value={precision} onChange={(e) => setPrecision(e.target.value as typeof precision)}>
      <option value="exact">Exact date</option><option value="month">Approximate month</option><option value="year">Approximate year</option>
    </select></label>
    <label>{precision === 'year' ? 'Year' : precision === 'month' ? 'Month' : 'Date'}
      {precision === 'year' ? <input type="number" className="timeline-input" min="1900" max="2100" step="1" value={date.slice(0, 4)} onChange={(e) => setDate(`${e.target.value}-01-01`)} />
        : precision === 'month' ? <input type="month" className="timeline-input" min="1900-01" max="2100-12" value={date.slice(0, 7)} onChange={(e) => setDate(`${e.target.value}-01`)} />
        : <input type="date" className="timeline-input" min="1900-01-01" max="2100-12-31" value={date} onChange={(e) => setDate(e.target.value)} />}
    </label>
    <fieldset><legend>Kind</legend><div className="timeline-form-kinds">
      {KINDS.map((option) => <button key={option.value} type="button" className="timeline-chip" aria-pressed={kind === option.value} onClick={() => setKind(option.value)}>{option.label}</button>)}
    </div></fieldset>
    <label>Note (optional)<textarea className="timeline-input timeline-note-input" rows={4} value={note} onChange={(e) => setNote(e.target.value)} /></label>
    <p className="timeline-error" role="alert">{error}</p>
    <div className="timeline-dialog-actions">
      <button type="button" className="timeline-button timeline-secondary" onClick={onCancel}>Cancel</button>
      <button type="submit" className="timeline-button">{initial ? 'Save changes' : 'Add event'}</button>
    </div>
  </form>
}
