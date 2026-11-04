import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Plus, X } from 'lucide-react'
import { Card, Dialog, Empty, Field, PageHeader, Progress, RemoveButton, Stat, cx, ic } from '../components/ui'
import { addDays, daysBetween, formatDate, fromKey, relativeDay } from '../lib/date'
import { dayStreak, formatHours, formatMinutes, minutesByDay, plural, sumMinutes } from '../lib/derive'
import { useToday } from '../lib/hooks'
import { clearParam, useLocation } from '../lib/router'
import { actions, useStore } from '../lib/store'

export default function Learning() {
  const today = useToday()
  const { param } = useLocation()
  const skills = useStore((s) => s.skills)
  const sessions = useStore((s) => s.sessions)
  const [logging, setLogging] = useState(false)

  useEffect(() => {
    if (param === 'new') setLogging(true)
    if (param) clearParam('learning')
  }, [param])

  const byDay = useMemo(() => minutesByDay(sessions), [sessions])
  const week = sumMinutes(byDay, addDays(today, -6), today)
  const lastWeek = sumMinutes(byDay, addDays(today, -13), addDays(today, -7))
  const streak = dayStreak(byDay, today)
  const monthSessions = sessions.filter((s) => s.date.startsWith(today.slice(0, 7))).length
  const yearMinutes = sumMinutes(byDay, addDays(today, -364), today)
  const delta = week - lastWeek

  const totals = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of sessions) map[s.skillId] = (map[s.skillId] ?? 0) + s.minutes
    return map
  }, [sessions])
  const recent = useMemo(
    () => [...sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7),
    [sessions],
  )
  const skillName = (id: string) => skills.find((k) => k.id === id)?.name ?? 'Removed skill'

  return (
    <>
      <PageHeader
        eyebrow="Act"
        title="Learning"
        subtitle="Track study time and skill development. Small sessions, repeated, compound."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setLogging(true)}>
            <Plus {...ic} />
            Log session
          </button>
        }
      />

      <section className="card mb-4 sm:mb-6" aria-label="Learning summary">
        <div className="grid grid-cols-3 gap-4 sm:gap-6">
          <Stat
            label="Last 7 days"
            value={formatHours(week)}
            caption={
              delta === 0
                ? 'Same as the week before'
                : `${delta > 0 ? '+' : '−'}${formatHours(Math.abs(delta))} vs. week before`
            }
          />
          <Stat label="Streak" value={streak} caption={streak === 1 ? 'day' : 'days in a row'} />
          <Stat label="This month" value={monthSessions} caption={monthSessions === 1 ? 'session' : 'sessions'} />
        </div>
      </section>

      <Card
        className="mb-4 sm:mb-6"
        title="Study activity"
        aside={<span className="text-caption text-muted">{formatHours(yearMinutes)} in the last year</span>}
      >
        <Heatmap byDay={byDay} today={today} />
      </Card>

      <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-2">
        <Card title="Skills" aside={<span className="text-caption text-muted">Hours toward target</span>}>
          {skills.length === 0 && <Empty>Add a skill you want to develop.</Empty>}
          <ul className="-mt-1 flex flex-col">
            {skills.map((k) => {
              const minutes = totals[k.id] ?? 0
              return (
                <li key={k.id} className="row flex-col items-stretch gap-2.5 py-3">
                  <span className="flex items-center justify-between gap-3">
                    <span className="truncate text-body font-medium">{k.name}</span>
                    <span className="flex items-center gap-1">
                      <span className="text-label tabular-nums text-tertiary">
                        {formatHours(minutes)} / {k.targetHours}h
                      </span>
                      <RemoveButton label={`Remove ${k.name}`} onClick={() => actions.removeSkill(k.id)} className="-my-1 -mr-1.5 size-6" />
                    </span>
                  </span>
                  <Progress value={minutes / 60 / k.targetHours} label={k.name} />
                </li>
              )
            })}
          </ul>
          <AddSkill />
        </Card>

        <Card title="Recent sessions" aside={<span className="text-caption text-muted">{plural(sessions.length, 'session')}</span>}>
          {recent.length === 0 ? (
            <Empty>No sessions yet. Log your first one.</Empty>
          ) : (
            <ul className="-mt-1 flex flex-col gap-0.5">
              {recent.map((s) => (
                <li key={s.id} className="row row-interactive py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body">{skillName(s.skillId)}</p>
                    <p className="truncate text-label text-muted">{s.note || 'Study session'}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-label tabular-nums">{formatMinutes(s.minutes)}</p>
                    <p className="text-caption text-muted">{relativeDay(s.date, today)}</p>
                  </div>
                  <RemoveButton label="Remove session" onClick={() => actions.removeSession(s.id)} className="-mr-1.5" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Dialog open={logging} onClose={() => setLogging(false)} title="Log a session" description="Even 20 focused minutes count.">
        <LogSessionForm today={today} onDone={() => setLogging(false)} />
      </Dialog>
    </>
  )
}

function level(minutes: number) {
  if (minutes <= 0) return 0
  if (minutes < 30) return 1
  if (minutes < 60) return 2
  if (minutes < 90) return 3
  return 4
}

function Heatmap({ byDay, today }: { byDay: Record<string, number>; today: string }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { days, columns, months } = useMemo(() => {
    const mondayOffset = (fromKey(today).getDay() + 6) % 7
    const start = addDays(today, -(52 * 7 + mondayOffset))
    const count = daysBetween(start, today) + 1
    const columns = Math.ceil(count / 7)
    const days = Array.from({ length: columns * 7 }, (_, i) => addDays(start, i))
    const months: Array<{ column: number; label: string }> = []
    for (let c = 0; c < columns; c++) {
      const first = days.slice(c * 7, c * 7 + 7).find((d) => d.endsWith('-01'))
      if (first && c < columns - 2) months.push({ column: c, label: formatDate(first, { month: 'short' }) })
    }
    return { days, columns, months }
  }, [today])

  // On narrow screens the heatmap scrolls; start at the most recent weeks.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [])

  return (
    <div ref={scrollRef} className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
      <div className="heatmap" style={{ '--cols': columns } as CSSProperties}>
        <div className="heat-months" aria-hidden>
          {months.map((m) => (
            <span key={m.column} style={{ gridColumn: `${m.column + 2} / span 4`, gridRow: 1 }}>
              {m.label}
            </span>
          ))}
        </div>
        <div className="heat-grid" role="img" aria-label="Study minutes per day over the last year">
          {['Mon', '', 'Wed', '', 'Fri', '', ''].map((label, i) => (
            <span key={`label-${i}`} className="heat-label">
              {label}
            </span>
          ))}
          {days.map((d) => {
            const minutes = byDay[d] ?? 0
            return (
              <span
                key={d}
                className={cx('heat', d > today && 'invisible')}
                data-l={level(minutes)}
                title={`${minutes ? formatMinutes(minutes) : 'No study'} · ${formatDate(d, { weekday: 'short', month: 'short', day: 'numeric' })}`}
              />
            )
          })}
        </div>
        <div className="mt-3 flex items-center justify-end gap-1 text-caption text-muted" aria-hidden>
          <span className="mr-1">Less</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className="heat w-2.5" data-l={l} />
          ))}
          <span className="ml-1">More</span>
        </div>
      </div>
    </div>
  )
}

function AddSkill() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [hours, setHours] = useState('50')
  const close = () => {
    setOpen(false)
    setName('')
    setHours('50')
  }
  const target = Math.round(Number(hours))

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost mt-2 -ml-3.5" onClick={() => setOpen(true)}>
        <Plus {...ic} />
        Add skill
      </button>
    )
  }
  return (
    <form
      className="row mt-2 bg-wash"
      onKeyDown={(e) => e.key === 'Escape' && close()}
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim() || target <= 0) return
        actions.addSkill(name.trim(), target)
        close()
      }}
    >
      <input
        autoFocus
        className="inline-input"
        placeholder="Skill, e.g. Piano"
        aria-label="Skill name"
        maxLength={40}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <label className="flex shrink-0 items-center gap-1 text-caption text-muted">
        <input
          type="number"
          min={1}
          className="w-12 bg-transparent text-right text-label text-fg tabular-nums outline-none"
          aria-label="Target hours"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
        />
        h goal
      </label>
      <button type="submit" className="btn btn-primary btn-sm" disabled={!name.trim() || target <= 0}>
        Add
      </button>
      <button type="button" className="icon-btn" aria-label="Cancel" onClick={close}>
        <X size={14} strokeWidth={1.5} />
      </button>
    </form>
  )
}

const DURATIONS = [25, 45, 60, 90]

function LogSessionForm({ today, onDone }: { today: string; onDone: () => void }) {
  const skills = useStore((s) => s.skills)
  const [skillId, setSkillId] = useState(skills[0]?.id ?? '')
  const [minutes, setMinutes] = useState(45)
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')

  if (skills.length === 0) {
    return <Empty>Add a skill first — then you can log time against it.</Empty>
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (!skillId || minutes <= 0) return
        actions.addSession({ skillId, minutes, date, note: note.trim() || undefined })
        onDone()
      }}
    >
      <Field label="Skill">
        <select className="input" value={skillId} onChange={(e) => setSkillId(e.target.value)}>
          {skills.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Duration" group>
        <div className="flex flex-wrap items-center gap-2">
          {DURATIONS.map((m) => (
            <button key={m} type="button" className="chip" aria-pressed={minutes === m} onClick={() => setMinutes(m)}>
              {formatMinutes(m)}
            </button>
          ))}
          <span className="ml-1 flex items-center gap-2">
            <input
              type="number"
              min={5}
              max={600}
              step={5}
              className="input h-8 w-20 px-2.5 text-label"
              aria-label="Minutes"
              value={minutes}
              onChange={(e) => setMinutes(Math.max(0, Math.round(Number(e.target.value))))}
            />
            <span className="text-label text-muted">min</span>
          </span>
        </div>
      </Field>
      <Field label="Date">
        <input type="date" className="input" max={today} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </Field>
      <Field label="Note" optional>
        <textarea
          className="input"
          rows={2}
          maxLength={140}
          placeholder="What did you work on?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      <button type="submit" className="btn btn-primary mt-1 w-full" disabled={!skillId || minutes <= 0}>
        Log session
      </button>
    </form>
  )
}
