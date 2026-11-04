import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { PageHeader } from '../components/ui'
import { addDays, daysBetween, formatDate, shortDate, untilPhrase } from '../lib/date'
import { lifeStats, plural } from '../lib/derive'
import { useToday } from '../lib/hooks'
import { actions, useStore } from '../lib/store'
import type { LifeEvent } from '../lib/types'
import './life-calendar.css'

const LIFESPANS = [70, 80, 90, 100]
const HINT = 'Hover a week to see when it was, or click one to mark a life event.'
type Selection = { week: number; left: number; top: number; above: boolean }

export default function LifeCalendar() {
  const today = useToday()
  const profile = useStore((s) => s.profile)
  const events = useStore((s) => s.events)
  const stats = lifeStats(profile, today)
  const [hovered, setHovered] = useState<number | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const eventsByWeek = useMemo(() => {
    const map = new Map<number, LifeEvent[]>()
    for (const event of events) {
      const week = Math.floor(daysBetween(profile.birthDate, event.date) / 7)
      if (week < 0 || week >= stats.totalWeeks) continue
      map.set(week, [...(map.get(week) ?? []), event])
    }
    return map
  }, [events, profile.birthDate, stats.totalWeeks])
  const marked = useMemo(() => new Set(eventsByWeek.keys()), [eventsByWeek])
  const upcoming = useMemo(
    () => events.filter((e) => e.date > today).sort((a, b) => a.date.localeCompare(b.date)),
    [events, today],
  )

  const openWeek = useCallback((week: number) => {
    const cell = gridRef.current?.querySelector<HTMLElement>(`[data-i="${week}"]`)
    if (!cell || !sectionRef.current) return
    const rect = cell.getBoundingClientRect()
    const section = sectionRef.current.getBoundingClientRect()
    const width = Math.min(264, section.width - 24)
    const above = rect.top - section.top > section.height * 0.6
    setSelection({
      week,
      left: Math.max(12, Math.min(section.width - width - 12, rect.left - section.left + rect.width / 2 - width / 2)),
      top: (above ? rect.top : rect.bottom) - section.top + (above ? -10 : 10),
      above,
    })
  }, [])

  const closeWeek = useCallback(() => {
    setSelection(null)
    gridRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    if (!selection) return
    const dismiss = (event: PointerEvent) => {
      const target = event.target as HTMLElement
      if (!popoverRef.current?.contains(target) && !target.closest('[data-i]')) setSelection(null)
    }
    const resize = () => setSelection(null)
    document.addEventListener('pointerdown', dismiss)
    window.addEventListener('resize', resize)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('resize', resize)
    }
  }, [selection])

  const weekRange = (week: number) => {
    const start = addDays(profile.birthDate, week * 7)
    return `${shortDate(start)} – ${formatDate(addDays(start, 6), { month: 'short', day: 'numeric', year: 'numeric' })} (age ${Math.floor(week / 52)})`
  }
  const readWeek = hovered ?? selection?.week
  const caption = readWeek == null ? HINT : [
    `Week ${(readWeek + 1).toLocaleString()}, ${weekRange(readWeek)}`,
    readWeek === stats.current ? 'this week' : '',
    eventsByWeek.get(readWeek)?.map((e) => e.title).join(', '),
  ].filter(Boolean).join(' — ')

  return (
    <div className="life-calendar">
      <PageHeader title="Life calendar" subtitle="Your life in weeks. Each square is one week — a quiet reminder to spend the rest of them on what matters." />
      <section className="calendar-slab" aria-label="Life summary">
        <div className="calendar-stats">
          <CalendarStat label="Age" value={String(stats.age)} caption={`and ${plural(stats.weeksSinceBirthday, 'week')}`} />
          <CalendarStat label="Weeks lived" value={stats.weekNumber.toLocaleString()} caption="including this one" />
          <CalendarStat label="Weeks left" value={stats.weeksLeft.toLocaleString()} caption={`of ${stats.totalWeeks.toLocaleString()}`} />
          <CalendarStat label="Lived" value={`${Math.round(stats.pct * 100)}%`} caption={`of ${profile.lifeExpectancy} years`} />
        </div>
        <div className="calendar-progress" role="progressbar" aria-label="Life lived" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(stats.pct * 100)}>
          <span style={{ clipPath: `inset(0 ${(1 - stats.pct) * 100}% 0 0)` }} />
        </div>
      </section>
      <div className="calendar-columns">
        <section className="calendar-slab calendar-weeks" ref={sectionRef} aria-labelledby="weeks-title">
          <div className="calendar-card-heading"><h2 id="weeks-title">Your weeks</h2></div>
          <p id="week-readout" className="calendar-caption" aria-live="polite">{caption}</p>
          <LifeGrid
            key={`${profile.birthDate}-${profile.lifeExpectancy}`}
            gridRef={gridRef}
            years={profile.lifeExpectancy}
            current={stats.current}
            marked={marked}
            selected={selection?.week ?? null}
            onHover={setHovered}
            onSelect={openWeek}
          />
          {selection && (
            <div
              ref={popoverRef}
              className="calendar-popover"
              role="dialog"
              aria-labelledby="week-popover-title"
              style={{ left: selection.left, top: selection.top, translate: selection.above ? '0 -100%' : undefined }}
              onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); closeWeek() } }}
              onBlur={(e) => { if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) setSelection(null) }}
            >
              <div className="calendar-popover-heading">
                <h3 id="week-popover-title">Week {(selection.week + 1).toLocaleString()}</h3>
                <button type="button" className="calendar-icon-button" aria-label="Close week details" onClick={closeWeek}><X size={16} /></button>
              </div>
              <p className="calendar-detail">{weekRange(selection.week)}</p>
              <p className="calendar-detail">{selection.week < stats.current ? 'Lived' : selection.week === stats.current ? 'This week' : `Ahead, ${untilPhrase(addDays(profile.birthDate, selection.week * 7), today)}`}</p>
              <WeekEvents key={selection.week} events={eventsByWeek.get(selection.week) ?? []} date={addDays(profile.birthDate, selection.week * 7)} today={today} />
            </div>
          )}
          <div className="calendar-legend">
            <Legend color="var(--cell-lived)" label="Lived" />
            <Legend color="var(--calendar-signal)" label="This week" />
            <Legend color="var(--amber)" label="Life event" />
            <Legend color="var(--cell-remaining)" label="Ahead" />
          </div>
        </section>
        <div className="calendar-side">
          <section className="calendar-slab" aria-labelledby="milestones-title">
            <div className="calendar-card-heading">
              <h2 id="milestones-title">Upcoming milestones</h2>
              <a className="calendar-timeline-link" href="#timeline" aria-label="View timeline"><ArrowRight size={14} /></a>
            </div>
            {upcoming.length === 0 ? <p className="calendar-empty">No upcoming milestones. <a href="#timeline/new">Add one</a></p> : (
              <ul className="calendar-milestones">
                {upcoming.map((event) => (
                  <li key={event.id}>
                    <span className="calendar-event-dot" aria-hidden />
                    <span className="calendar-milestone-text">
                      <span>{event.title}</span>
                      <small>{shortDate(event.date)}, {untilPhrase(event.date, today)}</small>
                    </span>
                    <span className="calendar-milestone-week">Week {(Math.floor(daysBetween(profile.birthDate, event.date) / 7) + 1).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="calendar-slab" aria-labelledby="calendar-settings-title">
            <div className="calendar-card-heading"><h2 id="calendar-settings-title">Your calendar</h2></div>
            <label className="calendar-field">
              <span>Birth date</span>
              <input
                type="date"
                className="calendar-input"
                max={today}
                value={profile.birthDate}
                onChange={(e) => {
                  if (!e.target.value || !e.target.validity.valid || e.target.value > today) return
                  setSelection(null)
                  setHovered(null)
                  actions.updateProfile({ birthDate: e.target.value })
                }}
              />
            </label>
            <div className="calendar-field">
              <span id="calendar-years-label">Years to show</span>
              <div>
                <div className="calendar-segmented" role="radiogroup" aria-labelledby="calendar-years-label">
                  <span className="calendar-segment-tile" aria-hidden style={{ transform: `translateX(calc(${LIFESPANS.indexOf(profile.lifeExpectancy) * 100}% + ${LIFESPANS.indexOf(profile.lifeExpectancy) * 2}px))` }} />
                  {LIFESPANS.map((years, index) => (
                    <button
                      key={years}
                      type="button"
                      role="radio"
                      aria-checked={years === profile.lifeExpectancy}
                      tabIndex={years === profile.lifeExpectancy ? 0 : -1}
                      onClick={() => { setSelection(null); setHovered(null); actions.updateProfile({ lifeExpectancy: years }) }}
                      onKeyDown={(e) => {
                        const delta = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key]
                        if (!delta && e.key !== 'Home' && e.key !== 'End') return
                        e.preventDefault()
                        const next = e.key === 'Home' ? 0 : e.key === 'End' ? LIFESPANS.length - 1 : Math.max(0, Math.min(LIFESPANS.length - 1, index + (delta ?? 0)))
                        const button = e.currentTarget.parentElement?.querySelectorAll('button')[next]
                        button?.click()
                        button?.focus()
                      }}
                    >{years}</button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function CalendarStat({ label, value, caption }: { label: string; value: string; caption: string }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => setReady(true)) })
    return () => cancelAnimationFrame(frame)
  }, [])
  return (
    <div>
      <div className="calendar-stat-label">{label}</div>
      <div className="calendar-number" aria-label={value}>
        {Array.from(value, (character, i) => /\d/.test(character) ? (
          <span className="calendar-digit" key={`${value.length}-${i}`} aria-hidden>
            <span className="calendar-digit-strip" style={{ transform: `translateY(-${ready ? Number(character) * 1.15 : 0}em)`, transitionDelay: `${i * 70}ms` }}>
              {Array.from('0123456789', (digit) => <span key={digit}>{digit}</span>)}
            </span>
          </span>
        ) : <span key={`${value.length}-${i}`} aria-hidden>{character}</span>)}
      </div>
      <div className="calendar-stat-caption">{caption}</div>
    </div>
  )
}

function WeekEvents({ events, date, today }: { events: LifeEvent[]; date: string; today: string }) {
  const [title, setTitle] = useState('')
  return events.length ? (
    <ul className="calendar-week-events">
      {events.map((event, index) => (
        <li key={event.id}>
          <span className="calendar-event-dot" aria-hidden />
          <span className="calendar-week-event-title">{event.title}</span>
          <button autoFocus={index === 0} type="button" className="calendar-button calendar-button-ghost" aria-label={`Remove ${event.title}`} onClick={() => actions.removeEvent(event.id)}>Remove</button>
        </li>
      ))}
    </ul>
  ) : (
    <form className="calendar-event-form" onSubmit={(e) => {
      e.preventDefault()
      actions.addEvent({ title: title.trim() || 'Life event', date, kind: date > today ? 'milestone' : 'memory' })
      setTitle('')
    }}>
      <input autoFocus className="calendar-input" maxLength={40} placeholder="Life event" aria-label="Life event title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <button type="submit" className="calendar-button">Add</button>
    </form>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span><i style={{ background: color }} aria-hidden />{label}</span>
}

/** Keep the thousands of cells stable while the hover caption updates. */
const LifeGrid = memo(function LifeGrid({ gridRef, years, current, marked, selected, onHover, onSelect }: {
  gridRef: RefObject<HTMLDivElement | null>
  years: number
  current: number
  marked: Set<number>
  selected: number | null
  onHover: (week: number | null) => void
  onSelect: (week: number) => void
}) {
  const [cursor, setCursor] = useState(current)
  const total = years * 52
  return (
    <div
      ref={gridRef}
      className="calendar-grid"
      role="grid"
      tabIndex={0}
      aria-label={`${(current + 1).toLocaleString()} of ${total.toLocaleString()} weeks lived`}
      aria-describedby="week-readout"
      aria-rowcount={years}
      aria-colcount={52}
      aria-activedescendant={`calendar-week-${cursor}`}
      onPointerOver={(e) => {
        const week = (e.target as HTMLElement).dataset.i
        if (week != null) onHover(Number(week))
      }}
      onPointerLeave={() => onHover(null)}
      onClick={(e) => {
        const week = (e.target as HTMLElement).dataset.i
        if (week != null) { setCursor(Number(week)); onSelect(Number(week)) }
      }}
      onKeyDown={(e) => {
        const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -52, ArrowDown: 52 }[e.key]
        if (delta || e.key === 'Home' || e.key === 'End') {
          e.preventDefault()
          const next = e.key === 'Home' ? 0 : e.key === 'End' ? total - 1 : Math.max(0, Math.min(total - 1, cursor + (delta ?? 0)))
          setCursor(next)
          onHover(next)
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(cursor)
        } else if (e.key === 'Escape') onHover(null)
      }}
    >
      {Array.from({ length: years }, (_, year) => (
        <div className="calendar-grid-row" role="row" key={year}>
          <span className="calendar-age" aria-hidden>{year % 10 === 0 ? year : ''}</span>
          {Array.from({ length: 52 }, (_, week) => {
            const index = year * 52 + week
            return (
              <span
                key={week}
                id={`calendar-week-${index}`}
                role="gridcell"
                aria-label={`Age ${year}, week ${week + 1}${index === current ? ', this week' : ''}${marked.has(index) ? ', life event' : ''}`}
                aria-selected={index === selected}
                data-i={index}
                className="calendar-cell"
                data-s={index < current ? 'l' : index === current ? 'c' : undefined}
                data-m={marked.has(index) || undefined}
                data-active={index === cursor || undefined}
                style={{ '--calendar-delay': `${Math.min(year * 12 + week * 3, 560)}ms` } as CSSProperties}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
})
