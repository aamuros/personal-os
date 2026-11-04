import { useMemo, useState } from 'react'
import { ArrowRight, Check as CheckIcon, ChevronRight, Flame, Plus, X } from 'lucide-react'
import { Card, Check, Empty, InlineAdd, PageHeader, Progress, RemoveButton, StatusDot, cx, ic } from '../components/ui'
import { addDays, daysBetween, formatDate, formatTime, longDate, monthYear, relativeDay, shortDate, untilPhrase } from '../lib/date'
import { habitStreak, goalPace, goalProgress, lifeStats, plural } from '../lib/derive'
import { EXERCISE_BY_ID } from '../lib/exercises'
import { useToday } from '../lib/hooks'
import { actions, useStore } from '../lib/store'
import type { Goal, Priority } from '../lib/types'

function greeting() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const byTime = (a: Priority, b: Priority) => (a.time || '99:99').localeCompare(b.time || '99:99')

export default function Dashboard() {
  const today = useToday()
  const name = useStore((s) => s.profile.name)
  const priorities = useStore((s) => s.priorities)
  const habits = useStore((s) => s.habits)

  const todays = useMemo(() => priorities.filter((p) => p.date === today).sort(byTime), [priorities, today])
  const prioritiesLeft = todays.filter((p) => !p.done).length
  const habitsLeft = habits.filter((h) => !h.log[today]).length

  const remaining = [
    prioritiesLeft > 0 && plural(prioritiesLeft, 'priority', 'priorities'),
    habitsLeft > 0 && plural(habitsLeft, 'habit'),
  ].filter(Boolean)
  const subtitle =
    remaining.length > 0
      ? `${remaining.join(' and ')} left today.`
      : 'Everything for today is done. A good moment to reflect.'

  return (
    <>
      <PageHeader eyebrow={longDate(today)} title={`${greeting()}, ${name.split(' ')[0]}`} subtitle={subtitle} />

      <div className="grid items-start gap-4 sm:gap-6 xl:grid-cols-[minmax(0,728fr)_minmax(0,368fr)]">
        <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
          <PrioritiesCard items={todays} today={today} />
          <HabitsCard today={today} />
        </div>
        <div className="grid min-w-0 items-start gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-1">
          <GoalsCard today={today} />
          <LoopCard today={today} />
          <LifeCard today={today} />
        </div>
      </div>
    </>
  )
}

function PrioritiesCard({ items, today }: { items: Priority[]; today: string }) {
  const done = items.filter((p) => p.done).length
  return (
    <Card
      title="Today’s priorities"
      aside={
        items.length > 0 && (
          <span className="text-caption tabular-nums text-muted">
            {done} of {items.length} done
          </span>
        )
      }
    >
      {items.length > 0 ? (
        <ul className="flex flex-col gap-0.5">
          {items.map((p) => (
            <li key={p.id} className="row row-interactive">
              <Check checked={p.done} onChange={() => actions.togglePriority(p.id)} label={p.title} />
              <span
                className={cx(
                  'min-w-0 flex-1 truncate text-body transition-colors duration-150',
                  p.done && 'text-muted line-through decoration-faint',
                )}
              >
                {p.title}
              </span>
              {p.time && (
                <time className={cx('text-caption tabular-nums', p.done ? 'text-faint' : 'text-tertiary')}>
                  {formatTime(p.time)}
                </time>
              )}
              <RemoveButton label={`Remove ${p.title}`} onClick={() => actions.removePriority(p.id)} className="-my-1 -mr-1.5" />
            </li>
          ))}
        </ul>
      ) : (
        <Empty>Nothing planned yet. What would make today feel well spent?</Empty>
      )}
      <AddPriority today={today} />
    </Card>
  )
}

function AddPriority({ today }: { today: string }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')
  const close = () => {
    setOpen(false)
    setTitle('')
    setTime('')
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost mt-2 -ml-3.5" onClick={() => setOpen(true)}>
        <Plus {...ic} />
        Add priority
      </button>
    )
  }

  return (
    <form
      className="row mt-2 bg-wash"
      onKeyDown={(e) => e.key === 'Escape' && close()}
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim()) return
        actions.addPriority(title.trim(), time || undefined, today)
        setTitle('')
        setTime('')
      }}
    >
      <span className="check border-dashed" aria-hidden />
      <input
        autoFocus
        className="inline-input"
        placeholder="What would you like to do?"
        value={title}
        maxLength={120}
        aria-label="Priority"
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        type="time"
        className="time-input hidden sm:block"
        value={time}
        aria-label="Time (optional)"
        onChange={(e) => setTime(e.target.value)}
      />
      <button type="submit" className="btn btn-primary btn-sm" disabled={!title.trim()}>
        Add
      </button>
      <button type="button" className="icon-btn" aria-label="Cancel" onClick={close}>
        <X size={14} strokeWidth={1.5} />
      </button>
    </form>
  )
}

function HabitsCard({ today }: { today: string }) {
  const habits = useStore((s) => s.habits)
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)), [today])
  const doneToday = habits.filter((h) => h.log[today]).length

  return (
    <Card
      title="Habits"
      aside={
        habits.length > 0 && (
          <span className="text-caption tabular-nums text-muted">
            {doneToday} of {habits.length} today
          </span>
        )
      }
    >
      {habits.length > 0 && (
        <div className="mb-1 flex justify-end" aria-hidden>
          <div className="habit-grid">
            {days.map((d) => (
              <span key={d} className={cx('text-center text-micro font-medium', d === today ? 'text-fg' : 'text-muted')}>
                {formatDate(d, { weekday: 'narrow' })}
              </span>
            ))}
          </div>
        </div>
      )}
      <ul className="flex flex-col">
        {habits.map((h) => {
          const streak = habitStreak(h, today)
          return (
            <li key={h.id} className="row min-h-[54px] gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="truncate text-label font-medium">{h.name}</p>
                  <RemoveButton label={`Remove habit ${h.name}`} onClick={() => actions.removeHabit(h.id)} className="-my-1 size-6" />
                </div>
                <p className="flex items-center gap-1 text-caption text-muted">
                  <Flame size={12} strokeWidth={1.75} aria-hidden />
                  {streak > 0 ? `${streak} day streak` : 'Start a streak today'}
                </p>
              </div>
              <div className="habit-grid">
                {days.map((d) => {
                  const on = !!h.log[d]
                  return (
                    <button
                      key={d}
                      type="button"
                      className="habit-cell"
                      aria-pressed={on}
                      data-today={d === today || undefined}
                      aria-label={`${h.name}, ${formatDate(d, { weekday: 'long' })}`}
                      onClick={() => actions.toggleHabit(h.id, d)}
                    >
                      {on && <CheckIcon size={13} strokeWidth={2.75} />}
                    </button>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ul>
      {habits.length === 0 && <Empty>No habits yet. Start with something small enough to do on a bad day.</Empty>}
      <InlineAdd buttonLabel="Add habit" placeholder="A small action you want to repeat" onSubmit={actions.addHabit} />
    </Card>
  )
}

function GoalsCard({ today }: { today: string }) {
  const goals = useStore((s) => s.goals)
  const active = useMemo(
    () =>
      goals
        .filter((g) => g.status === 'active')
        .sort((a, b) => a.due.localeCompare(b.due))
        .slice(0, 3),
    [goals],
  )

  return (
    <Card
      title="Goals"
      aside={
        <a href="#goals" className="card-link">
          View all
          <ArrowRight size={12} strokeWidth={1.75} />
        </a>
      }
    >
      {active.length === 0 ? (
        <Empty>
          No active goals.{' '}
          <a href="#goals/new" className="text-fg underline decoration-faint underline-offset-4">
            Set one
          </a>
        </Empty>
      ) : (
        <ul className="-mt-1 flex flex-col">
          {active.map((g) => (
            <li key={g.id}>
              <GoalSummary goal={g} today={today} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function GoalSummary({ goal, today }: { goal: Goal; today: string }) {
  const pct = Math.round(goalProgress(goal) * 100)
  const pace = goalPace(goal, today)
  const left = daysBetween(today, goal.due)
  const atRisk = pace === 'behind' || pace === 'overdue'
  return (
    <a href={`#goals/${goal.id}`} className="row row-interactive flex-col items-stretch gap-2.5 py-3">
      <span className="flex items-center justify-between gap-3 text-body font-medium">
        <span className="truncate">{goal.title}</span>
        <span className="text-label tabular-nums text-tertiary">{pct}%</span>
      </span>
      <Progress value={pct / 100} tone={atRisk ? 'amber' : 'cyan'} label={goal.title} />
      <span className="text-caption text-tertiary">
        Due {shortDate(goal.due)} · {left >= 0 ? `${plural(left, 'day')} left` : `${plural(-left, 'day')} overdue`}
        {pace === 'behind' && <span className="text-amber"> · Behind pace</span>}
      </span>
    </a>
  )
}

/** The Understand → Plan → Act → Reflect → Adapt loop, as a quiet weekly check. */
function LoopCard({ today }: { today: string }) {
  const profile = useStore((s) => s.profile)
  const priorities = useStore((s) => s.priorities)
  const habits = useStore((s) => s.habits)
  const reflections = useStore((s) => s.reflections)
  const practices = useStore((s) => s.practices)

  const weekStart = addDays(today, -6)
  const thisWeek = (d?: string) => !!d && d >= weekStart && d <= today
  const planned = priorities.filter((p) => p.date === today)
  const actedOn = planned.filter((p) => p.done).length + habits.filter((h) => h.log[today]).length
  const reflected = reflections.some((r) => r.date === today)
  const practice = practices
    .filter((p) => thisWeek(p.date))
    .sort((a, b) => b.date.localeCompare(a.date))[0]

  const steps = [
    {
      stage: 'Understand',
      href: '#foundations',
      done: thisWeek(profile.reviewedOn),
      note:
        thisWeek(profile.reviewedOn) && profile.reviewedOn
          ? `Foundations reviewed · ${relativeDay(profile.reviewedOn, today)}`
          : 'Revisit your values and priorities',
    },
    {
      stage: 'Plan',
      href: '#goals',
      done: planned.length > 0,
      note: planned.length > 0 ? `${plural(planned.length, 'priority', 'priorities')} set for today` : 'Choose today’s priorities',
    },
    {
      stage: 'Act',
      href: '#learning',
      done: actedOn > 0,
      note: actedOn > 0 ? `${plural(actedOn, 'action')} completed today` : 'Complete a habit or priority',
    },
    {
      stage: 'Reflect',
      href: '#reflections',
      done: reflected,
      note: reflected ? 'Reflection written today' : 'Write tonight’s reflection',
    },
    {
      stage: 'Adapt',
      href: '#toolkit',
      done: !!practice,
      note: practice
        ? `${EXERCISE_BY_ID[practice.exerciseId]?.title ?? 'Exercise'} · ${relativeDay(practice.date, today)}`
        : 'Try a toolkit exercise',
    },
  ]
  const doneCount = steps.filter((s) => s.done).length

  return (
    <Card title="Your loop" aside={<span className="text-caption tabular-nums text-muted">{doneCount} of 5</span>}>
      <ol className="-mt-1 flex flex-col">
        {steps.map((step) => (
          <li key={step.stage}>
            <a href={step.href} className="group row row-interactive py-2">
              <StatusDot done={step.done} />
              <span className="min-w-0 flex-1">
                <span className={cx('block text-label font-medium', step.done ? 'text-fg' : 'text-secondary')}>
                  {step.stage}
                </span>
                <span className="block truncate text-caption text-muted">{step.note}</span>
              </span>
              <ChevronRight
                size={14}
                strokeWidth={1.75}
                className="shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
            </a>
          </li>
        ))}
      </ol>
    </Card>
  )
}

function LifeCard({ today }: { today: string }) {
  const profile = useStore((s) => s.profile)
  const events = useStore((s) => s.events)
  const stats = lifeStats(profile, today)
  const next = useMemo(
    () => events.filter((e) => e.date > today).sort((a, b) => a.date.localeCompare(b.date))[0],
    [events, today],
  )

  return (
    <Card
      title="Life"
      aside={
        <a href="#life-calendar" className="card-link">
          Calendar
          <ArrowRight size={12} strokeWidth={1.75} />
        </a>
      }
    >
      <a href="#life-calendar" className="group flex flex-col gap-2.5">
        <span className="flex items-center justify-between gap-2 text-body font-medium">
          <span className="transition-colors group-hover:text-cyan">Week {stats.weekNumber.toLocaleString()}</span>
          <span className="text-label tabular-nums text-tertiary">{Math.round(stats.pct * 100)}% lived</span>
        </span>
        <Progress value={stats.pct} label="Life lived" />
        <span className="text-caption text-tertiary">{stats.weeksLeft.toLocaleString()} weeks left</span>
      </a>
      <div className="divider my-4" />
      <p className="text-caption text-muted">Next milestone</p>
      {next ? (
        <div className="mt-2 flex items-center gap-2.5 text-label">
          <span className="size-2 shrink-0 rounded-full bg-amber" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-secondary">
            {next.title} · {monthYear(next.date)}
          </span>
          <span className="shrink-0 text-caption text-muted">{untilPhrase(next.date, today)}</span>
        </div>
      ) : (
        <p className="mt-2 text-label text-secondary">
          Nothing planned —{' '}
          <a href="#timeline/new" className="underline decoration-faint underline-offset-4 hover:text-fg">
            add one
          </a>
        </p>
      )}
    </Card>
  )
}
