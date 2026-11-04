import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Dialog, Field, PageHeader } from '../components/ui'
import { addDays, daysBetween, formatDate, fromKey, relativeDay } from '../lib/date'
import { dayStreak, formatHours, formatMinutes, minutesByDay, sumMinutes } from '../lib/derive'
import { useToday } from '../lib/hooks'
import { clearParam, useLocation } from '../lib/router'
import { actions, useStore } from '../lib/store'
import type { Skill } from '../lib/types'
import './learning.css'

const COLORS = ['#3d7be0', '#e0707a', '#a86bd6', '#d9a441', '#4c9a6a', '#4fb5c9']
const DURATIONS = [25, 45, 60, 90]

export default function Learning() {
  const today = useToday()
  const { param } = useLocation()
  const skills = useStore((s) => s.skills)
  const sessions = useStore((s) => s.sessions)
  const [logging, setLogging] = useState(false)
  const [addingSkill, setAddingSkill] = useState(false)
  const [selectedSkill, setSelectedSkill] = useState<string>()
  const openLog = (skillId?: string) => {
    setSelectedSkill(skillId)
    if (skills.length) setLogging(true)
    else setAddingSkill(true)
  }

  useEffect(() => {
    if (param === 'new') {
      if (skills.length) setLogging(true)
      else setAddingSkill(true)
    }
    if (param) clearParam('learning')
  }, [param, skills.length])

  const byDay = useMemo(() => minutesByDay(sessions), [sessions])
  const week = sumMinutes(byDay, addDays(today, -6), today)
  const lastWeek = sumMinutes(byDay, addDays(today, -13), addDays(today, -7))
  const streak = dayStreak(byDay, today)
  const studiedDays = Object.keys(byDay).filter((day) => byDay[day] > 0 && day <= today).sort()
  const monthDays = studiedDays.filter((day) => day.startsWith(today.slice(0, 7))).length
  let best = 0, run = 0
  studiedDays.forEach((day, index) => {
    run = index > 0 && daysBetween(studiedDays[index - 1], day) === 1 ? run + 1 : 1
    best = Math.max(best, run)
  })
  const yearMinutes = sumMinutes(byDay, addDays(today, -364), today)
  const delta = (week - lastWeek) / 60
  const totals = useMemo(() => {
    const map: Record<string, number> = {}
    for (const session of sessions) {
      if (session.date <= today) map[session.skillId] = (map[session.skillId] ?? 0) + session.minutes
    }
    return map
  }, [sessions, today])
  const recent = useMemo(() => [...sessions].filter((s) => s.date <= today).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8), [sessions, today])
  const color = (skillId: string) => {
    const index = skills.findIndex((skill) => skill.id === skillId)
    return index < 0 ? 'var(--learning-muted)' : COLORS[index % COLORS.length]
  }

  return <div className="learning-page">
    <PageHeader title="Learning" subtitle="Track study time and skill development. Small sessions, repeated, compound." actions={
      <button type="button" className="learning-button learning-primary" onClick={() => openLog()}>Log session</button>
    } />
    <section className="learning-stats" aria-label="Learning summary">
      <LearningStat label="Last 7 days" value={formatHours(week)} caption={`${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)}h vs. week before`} />
      <LearningStat label="Streak" value={String(streak)} caption={`days in a row, best ${best}`} />
      <LearningStat label="This month" value={String(monthDays)} caption="days studied" />
    </section>
    <section className="learning-panel learning-activity" aria-labelledby="learning-activity-title">
      <div className="learning-panel-heading"><h2 id="learning-activity-title">Study activity</h2><span>{formatHours(yearMinutes)} in the last year</span></div>
      <StudyActivity byDay={byDay} today={today} />
    </section>
    <div className="learning-columns">
      <section className="learning-panel" aria-labelledby="learning-skills-title">
        <div className="learning-panel-heading"><h2 id="learning-skills-title">Skills</h2><button type="button" className="learning-button learning-secondary learning-small" onClick={() => setAddingSkill(true)}>Add skill</button></div>
        <ul className="learning-list">
          {skills.map((skill) => {
            const minutes = totals[skill.id] ?? 0
            const pct = Math.min(100, minutes / 60 / skill.targetHours * 100)
            const left = Math.max(0, skill.targetHours * 60 - minutes)
            return <li key={skill.id} className="learning-skill">
              <div className="learning-skill-heading"><span className="learning-skill-name"><i className="learning-dot" style={{ background: color(skill.id) }} />{skill.name}</span><span className="learning-skill-hours">{formatHours(minutes)} of {skill.targetHours}h</span></div>
              <div className="learning-progress" role="progressbar" aria-label={`${skill.name} hours`} aria-valuemin={0} aria-valuemax={skill.targetHours} aria-valuenow={Math.min(minutes / 60, skill.targetHours)} aria-valuetext={`${formatHours(minutes)} of ${skill.targetHours}h`}><i style={{ width: `${pct}%` }} /></div>
              <div className="learning-skill-footer"><span>{left ? `${formatHours(left)} to go` : 'Target reached'}</span><div className="learning-row-actions"><button type="button" className="learning-remove" aria-label={`Remove ${skill.name}`} onClick={() => actions.removeSkill(skill.id)}>×</button><button type="button" className="learning-button learning-ghost learning-small" onClick={() => openLog(skill.id)}>Log time</button></div></div>
            </li>
          })}
        </ul>
        {!skills.length && <p className="learning-empty">No skills yet. Add one to start tracking hours.</p>}
      </section>
      <section className="learning-panel" aria-labelledby="learning-sessions-title">
        <div className="learning-panel-heading"><h2 id="learning-sessions-title">Recent sessions</h2><span><RollingNumber value={String(sessions.filter((session) => session.date <= today).length)} /> {sessions.filter((session) => session.date <= today).length === 1 ? 'session' : 'sessions'}</span></div>
        <ul className="learning-list">
          {recent.map((session) => <li key={session.id} className="learning-session">
            <div className="learning-session-content"><p className="learning-session-title" title={session.note || 'Study session'}>{session.note || 'Study session'}</p><p className="learning-session-skill"><i className="learning-dot" style={{ background: color(session.skillId) }} />{skills.find((skill) => skill.id === session.skillId)?.name ?? 'Removed skill'}</p></div>
            <div className="learning-session-time"><b>{formatMinutes(session.minutes)}</b><span>{relativeDay(session.date, today)}</span></div>
            <button type="button" className="learning-remove" aria-label={`Remove session: ${session.note || 'Study session'}`} onClick={() => actions.removeSession(session.id)}>×</button>
          </li>)}
        </ul>
        {!recent.length && <p className="learning-empty">No sessions yet. Log your first one.</p>}
      </section>
    </div>
    <Dialog open={logging} onClose={() => setLogging(false)} title="Log session" className="learning-dialog">
      <LogSessionForm today={today} skills={skills} initialSkillId={selectedSkill} onDone={() => setLogging(false)} />
    </Dialog>
    <Dialog open={addingSkill} onClose={() => setAddingSkill(false)} title="Add skill" className="learning-dialog">
      <AddSkillForm skills={skills} onDone={() => setAddingSkill(false)} />
    </Dialog>
  </div>
}

function LearningStat({ label, value, caption }: { label: string; value: string; caption: string }) {
  return <div className="learning-stat"><p>{label}</p><strong><RollingNumber value={value} /></strong><span title={caption}>{caption}</span></div>
}

function level(minutes: number) {
  return minutes <= 0 ? 0 : minutes < 30 ? 1 : minutes < 60 ? 2 : minutes < 90 ? 3 : 4
}

function RollingNumber({ value }: { value: string }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  return <span className="learning-roll" role="img" aria-label={value}>
    {Array.from(value, (char, index) => /\d/.test(char) ? <span key={index} className="learning-wheel" aria-hidden="true">
      <span className="learning-digits" style={{ transform: `translateY(calc(var(--learning-digit-height) * -${ready ? Number(char) : 0}))`, transitionDelay: `${index * 70}ms` }}>
        {Array.from('0123456789', (digit) => <b key={digit}>{digit}</b>)}
      </span>
    </span> : <span key={index} aria-hidden="true">{char}</span>)}
  </span>
}

function StudyActivity({ byDay, today }: { byDay: Record<string, number>; today: string }) {
  const heatRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(920)
  const [inspectedDay, setInspectedDay] = useState<string>()
  const yearStart = addDays(today, -364)
  useEffect(() => {
    const element = heatRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const start = addDays(yearStart, -((fromKey(yearStart).getDay() + 6) % 7))
  const totalWeeks = Math.ceil((daysBetween(start, today) + 1) / 7)
  const columns = Math.min(totalWeeks, Math.max(8, Math.floor((width - 28) / 13)))
  const visibleStart = addDays(start, (totalWeeks - columns) * 7)
  const days = Array.from({ length: daysBetween(visibleStart, today) + 1 }, (_, index) => addDays(visibleStart, index))
  const months = Array.from({ length: columns }, (_, index) => {
    const first = addDays(visibleStart, index * 7)
    return { first, show: fromKey(first).getDate() <= 7 }
  })
  if (!months.slice(0, 3).some((month) => month.show)) months[0].show = true
  const monday = addDays(today, -((fromKey(today).getDay() + 6) % 7))
  const weeks = Array.from({ length: 12 }, (_, index) => {
    const start = addDays(monday, (index - 11) * 7)
    return { start, minutes: sumMinutes(byDay, start, addDays(start, 6) > today ? today : addDays(start, 6)) }
  })
  const max = Math.max(60, ...weeks.map((week) => week.minutes))
  const average = weeks.reduce((sum, week) => sum + week.minutes, 0) / 12
  const activeDay = inspectedDay && inspectedDay >= visibleStart ? inspectedDay : today
  const describe = (date: string) => `${byDay[date] ? formatMinutes(byDay[date]) : 'No study'} on ${formatDate(date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}`
  return <>
    <div ref={heatRef} className="learning-heat" role="group" aria-label={`Study minutes per day, last ${columns} weeks. Use arrow keys to explore dates.`}>
      <div className="learning-heat-grid" style={{ '--learning-weeks': columns } as CSSProperties}>
        {months.map((month, index) => month.show && <span key={month.first} className={`learning-heat-month${index >= columns - 2 ? ' learning-heat-month-end' : ''}`} style={{ gridArea: `1 / ${index + 2}` }} aria-hidden="true">{formatDate(month.first, { month: 'short' })}</span>)}
        {['Mon', 'Wed', 'Fri'].map((label, index) => <span key={label} className="learning-weekday" style={{ gridArea: `${index * 2 + 2} / 1` }} aria-hidden="true">{label}</span>)}
        {days.map((date, index) => <button key={date} type="button" className="learning-heat-day" data-level={level(byDay[date] ?? 0)} data-today={date === today || undefined} data-selected={date === inspectedDay || undefined}
          style={{ gridArea: `${index % 7 + 2} / ${Math.floor(index / 7) + 2}` }} disabled={date < yearStart} tabIndex={date === activeDay ? 0 : -1} aria-label={describe(date)} title={describe(date)}
          onPointerEnter={() => setInspectedDay(date)} onFocus={() => setInspectedDay(date)} onClick={() => setInspectedDay(date)} onKeyDown={(event) => {
            const offsets: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 }
            const offset = offsets[event.key]
            if (offset === undefined) return
            event.preventDefault()
            const next = addDays(date, offset)
            if (next < yearStart || next < visibleStart || next > today) return
            heatRef.current?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`)?.focus()
          }} data-date={date} />)}
      </div>
    </div>
    <div className="learning-heat-hint">
      <p className="learning-activity-caption" aria-live="polite">{inspectedDay && inspectedDay >= visibleStart ? describe(inspectedDay) : 'Hover, tap or use arrow keys to see how long you studied.'}</p>
      <div className="learning-heat-legend" aria-hidden="true">Less{[0, 1, 2, 3, 4].map((value) => <i key={value} data-level={value} />)}More</div>
    </div>
    <div className="learning-panel-heading learning-week-heading"><h3>Hours per week</h3><span>Average {formatHours(average)} a week</span></div>
    <div className="learning-weeks" role="img" aria-label={`Study hours over the last 12 weeks: ${weeks.map((week) => `week of ${formatDate(week.start, { month: 'short', day: 'numeric' })}, ${formatHours(week.minutes)}`).join('; ')}. Current week is in progress.`}>
      {weeks.map((week) => <div key={week.start} className="learning-week" title={`Week of ${formatDate(week.start, { month: 'short', day: 'numeric' })}: ${formatHours(week.minutes)}`}><div className="learning-week-bar"><i style={{ height: `${week.minutes / max * 64}px` }} /></div><span>{Number((week.minutes / 60).toFixed(1))}</span></div>)}
    </div>
  </>
}

function AddSkillForm({ skills, onDone }: { skills: Skill[]; onDone: () => void }) {
  const [name, setName] = useState('')
  const [hours, setHours] = useState('50')
  const [error, setError] = useState('')
  return <form onSubmit={(event) => {
    event.preventDefault()
    const target = Number(hours)
    if (!name.trim()) { setError('Add a name for the skill.'); return }
    if (skills.some((skill) => skill.name.toLowerCase() === name.trim().toLowerCase())) { setError('You already track a skill with that name.'); return }
    if (!Number.isInteger(target) || target < 1 || target > 2000) { setError('Set a target between 1 and 2000 hours.'); return }
    actions.addSkill(name.trim(), target)
    onDone()
  }}>
    <div className="learning-form-two"><Field label="Skill name"><input autoFocus className="input" required maxLength={40} autoComplete="off" value={name} onChange={(event) => setName(event.target.value)} /></Field><Field label="Target hours"><input className="input" type="number" required min={1} max={2000} step={1} inputMode="numeric" value={hours} onChange={(event) => setHours(event.target.value)} /></Field></div>
    <p className="learning-error" role="alert">{error}</p>
    <div className="learning-dialog-actions"><button type="button" className="learning-button learning-secondary" onClick={onDone}>Cancel</button><button type="submit" className="learning-button learning-primary">Add skill</button></div>
  </form>
}

function LogSessionForm({ today, skills, initialSkillId, onDone }: { today: string; skills: Skill[]; initialSkillId?: string; onDone: () => void }) {
  const [skillId, setSkillId] = useState(initialSkillId ?? skills[0]?.id ?? '')
  const [minutes, setMinutes] = useState('30')
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  return <form onSubmit={(event) => {
    event.preventDefault()
    const duration = Number(minutes)
    if (!skills.some((skill) => skill.id === skillId)) { setError('Choose a skill to log time.'); return }
    if (!Number.isInteger(duration) || duration < 1 || duration > 600) { setError('Enter a duration between 1 and 600 minutes.'); return }
    if (!date || date > today || date < addDays(today, -364)) { setError('Pick a date from the past year up to today.'); return }
    actions.addSession({ skillId, minutes: duration, date, note: note.trim() || undefined })
    onDone()
  }}>
    <div className="learning-form-two"><Field label="Skill"><select className="input" required value={skillId} onChange={(event) => setSkillId(event.target.value)}>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></Field><Field label="Date"><input className="input" type="date" required min={addDays(today, -364)} max={today} value={date} onChange={(event) => setDate(event.target.value)} /></Field></div>
    <Field label="Minutes"><input autoFocus className="input" type="number" required min={1} max={600} step={1} inputMode="numeric" value={minutes} onChange={(event) => setMinutes(event.target.value)} /></Field>
    <div className="learning-chips" role="group" aria-label="Session duration in minutes">{DURATIONS.map((duration) => <button key={duration} type="button" aria-pressed={Number(minutes) === duration} onClick={() => setMinutes(String(duration))}>{duration}</button>)}</div>
    <Field label="What did you work on?" optional><input className="input" maxLength={90} autoComplete="off" value={note} onChange={(event) => setNote(event.target.value)} /></Field>
    <p className="learning-error" role="alert">{error}</p>
    <div className="learning-dialog-actions"><button type="button" className="learning-button learning-secondary" onClick={onDone}>Cancel</button><button type="submit" className="learning-button learning-primary">Log session</button></div>
  </form>
}
