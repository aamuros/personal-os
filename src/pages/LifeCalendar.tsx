import { memo, useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Card, Empty, Field, PageHeader, Progress, Segmented, Stat } from '../components/ui'
import { addDays, daysBetween, monthYear, shortDate, untilPhrase } from '../lib/date'
import { lifeStats, plural } from '../lib/derive'
import { useToday } from '../lib/hooks'
import { actions, useStore } from '../lib/store'
import type { LifeEvent } from '../lib/types'

const LIFESPANS = ['70', '80', '90', '100'] as const

export default function LifeCalendar() {
  const today = useToday()
  const profile = useStore((s) => s.profile)
  const events = useStore((s) => s.events)
  const stats = lifeStats(profile, today)
  const [hovered, setHovered] = useState<number | null>(null)

  const eventsByWeek = useMemo(() => {
    const map = new Map<number, LifeEvent[]>()
    for (const e of events) {
      const week = Math.floor(daysBetween(profile.birthDate, e.date) / 7)
      if (week < 0 || week >= stats.totalWeeks) continue
      map.set(week, [...(map.get(week) ?? []), e])
    }
    return map
  }, [events, profile.birthDate, stats.totalWeeks])
  const marked = useMemo(() => new Set(eventsByWeek.keys()), [eventsByWeek])

  const upcoming = useMemo(
    () =>
      events
        .filter((e) => e.date > today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 4),
    [events, today],
  )

  const describe = (week: number) => {
    const start = addDays(profile.birthDate, week * 7)
    const parts = [`Age ${Math.floor(week / 52)}, week ${(week % 52) + 1}`, monthYear(start)]
    if (week === stats.current) parts.push('This week')
    const titles = eventsByWeek.get(week)?.map((e) => e.title)
    if (titles) parts.push(titles.join(', '))
    return parts.join(' · ')
  }

  return (
    <>
      <PageHeader
        eyebrow="Understand"
        title="Life calendar"
        subtitle="Your life in weeks. Each square is one week — a quiet reminder to spend the rest of them on what matters."
      />

      <section className="card mb-4 sm:mb-6" aria-label="Life summary">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label="Age" value={stats.age} caption={`and ${plural(stats.weeksSinceBirthday, 'week')}`} />
          <Stat label="Weeks lived" value={stats.weekNumber.toLocaleString()} caption="including this one" />
          <Stat
            label="Weeks left"
            value={stats.weeksLeft.toLocaleString()}
            caption={`of ${stats.totalWeeks.toLocaleString()}`}
          />
          <Stat label="Lived" value={`${Math.round(stats.pct * 100)}%`} caption={`of ${profile.lifeExpectancy} years`} />
        </div>
        <Progress className="mt-6" value={stats.pct} label="Life lived" />
      </section>

      <div className="grid items-start gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card" aria-labelledby="weeks-title">
          <div className="card-header">
            <h2 id="weeks-title" className="card-title">
              {profile.lifeExpectancy} years in weeks
            </h2>
          </div>
          <p className="-mt-2 mb-4 h-4 truncate text-caption text-muted" aria-live="polite">
            {hovered == null ? 'Hover a week to see when it was.' : describe(hovered)}
          </p>
          <div className="life-wrap">
            <LifeGrid years={profile.lifeExpectancy} current={stats.current} marked={marked} onHover={setHovered} />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-caption text-muted">
            <Legend color="var(--cell-lived)" label="Lived" />
            <Legend color="var(--cyan)" label="This week" />
            <Legend color="var(--amber)" label="Life event" />
            <Legend color="var(--cell-remaining)" label="Ahead" />
          </div>
        </section>

        <div className="grid min-w-0 items-start gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-1">
          <Card
            title="Upcoming milestones"
            aside={
              <a href="#timeline" className="card-link">
                Timeline
                <ArrowRight size={12} strokeWidth={1.75} />
              </a>
            }
          >
            {upcoming.length === 0 ? (
              <Empty>
                Nothing planned yet.{' '}
                <a href="#timeline/new" className="text-fg underline decoration-faint underline-offset-4">
                  Add a milestone
                </a>
              </Empty>
            ) : (
              <ul className="-mt-1 flex flex-col">
                {upcoming.map((e) => (
                  <li key={e.id} className="row gap-3 py-2.5">
                    <span className="size-2 shrink-0 rounded-full bg-amber" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body">{e.title}</span>
                      <span className="block text-caption text-muted">
                        {shortDate(e.date)} · {untilPhrase(e.date, today)}
                      </span>
                    </span>
                    <span className="shrink-0 text-caption tabular-nums text-tertiary">
                      Week {(Math.floor(daysBetween(profile.birthDate, e.date) / 7) + 1).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Your calendar">
            <div className="flex flex-col gap-5">
              <Field label="Birth date">
                <input
                  type="date"
                  className="input"
                  max={today}
                  value={profile.birthDate}
                  onChange={(e) => e.target.value && actions.updateProfile({ birthDate: e.target.value })}
                />
              </Field>
              <Field label="Years to show" group>
                <div>
                  <Segmented
                    label="Years to show"
                    value={String(profile.lifeExpectancy) as (typeof LIFESPANS)[number]}
                    onChange={(v) => actions.updateProfile({ lifeExpectancy: Number(v) })}
                    options={LIFESPANS.map((v) => ({ value: v, label: v }))}
                  />
                </div>
              </Field>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="swatch" style={{ background: color }} aria-hidden />
      {label}
    </span>
  )
}

/** Thousands of cells — memoized so hovering only re-renders the readout above it. */
const LifeGrid = memo(function LifeGrid({
  years,
  current,
  marked,
  onHover,
}: {
  years: number
  current: number
  marked: Set<number>
  onHover: (week: number | null) => void
}) {
  const total = years * 52
  const cells = []
  for (let year = 0; year < years; year++) {
    cells.push(
      <span key={`age-${year}`} className="life-age" aria-hidden>
        {year % 10 === 0 ? year : ''}
      </span>,
    )
    for (let week = 0; week < 52; week++) {
      const i = year * 52 + week
      cells.push(
        <span
          key={i}
          data-i={i}
          className="life-cell"
          data-s={i < current ? 'l' : i === current ? 'c' : undefined}
          data-m={marked.has(i) || undefined}
        />,
      )
    }
  }
  return (
    <div
      className="life-grid"
      role="img"
      aria-label={`${(current + 1).toLocaleString()} of ${total.toLocaleString()} weeks lived`}
      onMouseOver={(e) => {
        const week = (e.target as HTMLElement).dataset.i
        if (week) onHover(Number(week))
      }}
      onMouseLeave={() => onHover(null)}
    >
      {cells}
    </div>
  )
})
