import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Dialog, Field, PageHeader, Segmented } from '../components/ui'
import { addDays, daysBetween, shortDate } from '../lib/date'
import { goalPace, goalProgress, paceLabel, plural } from '../lib/derive'
import { useToday } from '../lib/hooks'
import { clearParam, useLocation } from '../lib/router'
import { actions, useStore } from '../lib/store'
import type { Goal, GoalStatus, Value } from '../lib/types'
import './goals.css'

const VALUE_COLORS: Record<string, string> = { Craft: '#3d7be0', Curiosity: '#a86bd6', Health: '#e0707a' }
const clamp = (value: number) => Math.max(0, Math.min(1, value))

function expectedProgress(goal: Goal, today: string) {
  if (goal.status === 'completed') return 1
  const duration = daysBetween(goal.start, goal.due)
  return duration > 0 ? clamp(daysBetween(goal.start, today) / duration) : 1
}

function GuidedValue({ name, detail = false }: { name?: string; detail?: boolean }) {
  if (!name) return <span>Goal</span>
  return <span className="goals-value"><i aria-hidden style={{ background: VALUE_COLORS[name] ?? 'var(--goals-muted)' }} />{detail ? `Guided by ${name}` : name}</span>
}

export default function Goals() {
  const today = useToday()
  const { param } = useLocation()
  const goals = useStore((s) => s.goals)
  const values = useStore((s) => s.values)
  const [tab, setTab] = useState<GoalStatus>('active')
  const [selectedId, setSelectedId] = useState<string>()
  const [creating, setCreating] = useState(false)

  // Keep dashboard links and the quick-add route connected to this page.
  useEffect(() => {
    if (!param) return
    if (param === 'new') setCreating(true)
    const goal = goals.find((g) => g.id === param)
    if (goal) { setSelectedId(goal.id); setTab(goal.status) }
    clearParam('goals')
  }, [param, goals])

  const active = useMemo(() => goals.filter((g) => g.status === 'active'), [goals])
  const list = useMemo(() => goals.filter((g) => g.status === tab).sort((a, b) =>
    tab === 'active' ? a.due.localeCompare(b.due) : (b.completedOn ?? '').localeCompare(a.completedOn ?? ''),
  ), [goals, tab])
  const selected = list.find((g) => g.id === selectedId) ?? list[0]
  const average = active.length ? Math.round(active.reduce((sum, goal) => sum + goalProgress(goal), 0) / active.length * 100) : 0
  const onTrack = active.filter((g) => goalPace(g, today) === 'on-track').length
  const next = active.filter((g) => g.due >= today).sort((a, b) => a.due.localeCompare(b.due))[0]

  return (
    <div className="goals-page">
      <PageHeader title="Goals" subtitle="Meaningful goals, grounded in your values and broken into small, doable steps." actions={
        <button type="button" className="goals-button goals-primary" onClick={() => setCreating(true)}>New goal</button>
      } />
      <section className="goals-overview" aria-label="Goals overview">
        <OverviewStat label="Overall progress" value={active.length ? `${average}%` : '—'} caption="Average across active goals" />
        <OverviewStat label="On track" value={active.length ? `${onTrack} of ${active.length}` : '—'} caption="Goals keeping an even pace" />
        <OverviewStat label="Next due in" value={next ? plural(daysBetween(today, next.due), 'day') : '—'} caption={next?.title ?? 'No upcoming due dates'} />
      </section>
      <div className="goals-layout">
        <section className="goals-slab goals-list" aria-labelledby="goals-list-title">
          <div className="goals-panel-heading">
            <h2 id="goals-list-title">Your goals</h2>
            <div className="goals-tabs" role="group" aria-label="Goal status" data-completed={tab === 'completed'}>
              <span className="goals-tab-tile" aria-hidden="true" />
              {(['active', 'completed'] as const).map((status) => (
                <button key={status} type="button" aria-pressed={tab === status} onClick={() => { setTab(status); setSelectedId(undefined) }}>
                  {status === 'active' ? 'Active' : 'Completed'}<span>{goals.filter((g) => g.status === status).length}</span>
                </button>
              ))}
            </div>
          </div>
          <ul>
            {list.length ? list.map((goal) => (
              <li key={goal.id}><GoalRow goal={goal} today={today} valueName={values.find((v) => v.id === goal.valueId)?.name} selected={goal.id === selected?.id} onSelect={() => setSelectedId(goal.id)} /></li>
            )) : <li className="goals-empty">{tab === 'active' ? 'No active goals. Add one to start tracking.' : 'Nothing completed yet. Finished goals show up here.'}</li>}
          </ul>
          {list.length > 0 && tab === 'active' && <p className="goals-legend"><i aria-hidden="true" />Tick marks an even pace today</p>}
        </section>
        {selected ? <GoalDetail key={selected.id} goal={selected} today={today} values={values} onReopen={() => {
          actions.reopenGoal(selected.id)
          setSelectedId(selected.id)
          setTab('active')
        }} /> : <section className="goals-slab goals-detail"><p className="goals-muted">Select a goal to see its milestones and pace.</p></section>}
      </div>
      <Dialog open={creating} onClose={() => setCreating(false)} title="New goal" className="goals-dialog">
        <NewGoalForm today={today} values={values} onCreated={(id) => { setTab('active'); setSelectedId(id); setCreating(false) }} />
      </Dialog>
    </div>
  )
}

function OverviewStat({ label, value, caption }: { label: string; value: string; caption: string }) {
  return <div className="goals-stat"><p>{label}</p><strong><RollingNumber value={value} /></strong><span title={caption}>{caption}</span></div>
}

function RollingNumber({ value }: { value: string }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  return <span className="goals-roll" role="img" aria-label={value}>
    {Array.from(value, (char, index) => /\d/.test(char) ? (
      <span className="goals-wheel" key={index} aria-hidden="true">
        <span className="goals-digits" style={{ transform: `translateY(calc(var(--goals-digit-height) * -${ready ? Number(char) : 0}))`, transitionDelay: `${index * 70}ms` }}>
          {Array.from('0123456789', (digit) => <b key={digit}>{digit}</b>)}
        </span>
      </span>
    ) : <span key={index} aria-hidden="true">{char}</span>)}
  </span>
}

function GoalRow({ goal, today, valueName, selected, onSelect }: { goal: Goal; today: string; valueName?: string; selected: boolean; onSelect: () => void }) {
  const pct = Math.round(goalProgress(goal) * 100)
  const pace = goalPace(goal, today)
  const left = daysBetween(today, goal.due)
  return (
    <button type="button" className="goals-row" aria-pressed={selected} aria-controls="goal-detail" onClick={onSelect}>
      <span className="goals-row-top">
        <span className="goals-row-text">
          <span className="goals-row-title" title={goal.title}>{goal.title}</span>
          <span className="goals-meta">
            <GuidedValue name={valueName} />
            {goal.status === 'completed' ? <span>Completed {goal.completedOn ? shortDate(goal.completedOn) : ''}</span> : <>
              <span>Due {shortDate(goal.due)}</span>
              <span>{left === 0 ? 'Due today' : left > 0 ? `${plural(left, 'day')} left` : `${plural(-left, 'day')} overdue`}</span>
              <PaceStatus goal={goal} today={today} />
            </>}
          </span>
        </span>
        <span className="goals-row-percent">{pct}%</span>
      </span>
      <PaceBar goal={goal} today={today} label={goal.title} risk={pace === 'behind' || pace === 'overdue'} />
    </button>
  )
}

function PaceStatus({ goal, today }: { goal: Goal; today: string }) {
  const pace = goalPace(goal, today)
  return <span className="goals-pace-status" data-risk={pace === 'behind' || pace === 'overdue' || undefined}>{paceLabel[pace]}</span>
}

function PaceBar({ goal, today, label, risk }: { goal: Goal; today: string; label: string; risk: boolean }) {
  const pct = Math.round(goalProgress(goal) * 100)
  const expected = expectedProgress(goal, today) * 100
  return (
    <span className="goals-pace-bar" data-risk={risk || undefined} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-valuetext={`${pct}% complete; even pace ${Math.round(expected)}%`}>
      <i style={{ width: `${pct}%` }} /><b style={{ left: `${expected}%` }} aria-hidden />
    </span>
  )
}

function GoalDetail({ goal, today, values, onReopen }: { goal: Goal; today: string; values: Value[]; onReopen: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const pct = Math.round(goalProgress(goal) * 100)
  const pace = goalPace(goal, today)
  const left = daysBetween(today, goal.due)
  const value = values.find((v) => v.id === goal.valueId)
  const doneCount = goal.milestones.filter((m) => m.done).length
  const completed = goal.status === 'completed'
  const atRisk = pace === 'behind' || pace === 'overdue'
  const gap = Math.round(pct - expectedProgress(goal, today) * 100)
  const caption = pct === 100 ? 'Target reached. Mark this goal complete when you’re ready.'
    : pace === 'overdue' ? `Past the due date with ${100 - pct}% left.`
    : gap <= -5 ? `${Math.abs(gap)} points behind an even pace to ${shortDate(goal.due)}.`
    : gap >= 5 ? `${gap} points ahead of an even pace to ${shortDate(goal.due)}.`
    : `Right on an even pace to ${shortDate(goal.due)}.`
  const remaining = goal.metric ? Math.max(0, goal.metric.target - goal.metric.current) : 0
  const countNote = remaining === 0 ? 'Target reached. Mark this goal complete when you’re ready.'
    : left <= 0 ? `${remaining} ${goal.metric?.unit} to go${left < 0 ? ' and the due date has passed' : ' today'}.`
    : `About ${(remaining / (left / 7)).toFixed(1)} ${goal.metric?.unit} a week to finish on time.`

  useEffect(() => {
    if (!confirmDelete) return
    const timer = window.setTimeout(() => setConfirmDelete(false), 3000)
    return () => window.clearTimeout(timer)
  }, [confirmDelete])

  return (
    <section id="goal-detail" className="goals-slab goals-detail" aria-labelledby="goal-detail-title">
      <p className="goals-meta"><GuidedValue name={value?.name} detail /></p>
      <h2 id="goal-detail-title">{goal.title}</h2>
      {goal.why && <p className="goals-why">{goal.why}</p>}
      <dl className="goals-facts">
        <div><dt>Due</dt><dd>{shortDate(goal.due)}</dd></div>
        <div><dt>{completed ? 'Status' : 'Time left'}</dt><dd>{completed ? 'Completed' : left < 0 ? `${plural(-left, 'day')} over` : plural(left, 'day')}</dd></div>
        <div><dt>Pace</dt><dd><PaceStatus goal={goal} today={today} /></dd></div>
      </dl>
      <div className="goals-progress-heading"><span>Progress</span><b>{pct}%</b></div>
      <PaceBar goal={goal} today={today} label={`${goal.title} progress`} risk={atRisk} />
      {!completed && <><PaceChart goal={goal} today={today} risk={atRisk} /><p className="goals-caption">{caption}</p></>}
      <hr />
      {goal.metric && <>
        <div className="goals-section-heading"><h3>Count</h3></div>
        <div className="goals-counter">
          <button type="button" className="goals-icon-button" aria-label={`Decrease ${goal.metric.unit}`} disabled={goal.metric.current <= 0 || completed} onClick={() => actions.setMetric(goal.id, goal.metric!.current - 1)}><Minus size={18} /></button>
          <p><b>{goal.metric.current}</b> of {goal.metric.target} {goal.metric.unit}</p>
          <button type="button" className="goals-icon-button" aria-label={`Increase ${goal.metric.unit}`} disabled={goal.metric.current >= goal.metric.target || completed} onClick={() => actions.setMetric(goal.id, goal.metric!.current + 1)}><Plus size={18} /></button>
        </div>
        {!completed && <p className="goals-caption">{countNote}</p>}
      </>}
      {(!goal.metric || goal.milestones.length > 0) && <>
        <div className="goals-section-heading"><h3>Milestones</h3><span>{doneCount} of {goal.milestones.length}</span></div>
        <ul className="goals-milestones">
          {goal.milestones.map((milestone) => (
            <li key={milestone.id}>
              <button id={`goal-step-${milestone.id}`} type="button" className="goals-check" role="checkbox" aria-checked={milestone.done} aria-label={milestone.title} onClick={() => actions.toggleMilestone(goal.id, milestone.id)}>
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 10.5l3 3 5-6" /></svg>
              </button>
              <label htmlFor={`goal-step-${milestone.id}`} className="goals-milestone-label">{milestone.title}</label>
              <button type="button" className="goals-remove-step" aria-label={`Remove ${milestone.title}`} onClick={() => actions.removeMilestone(goal.id, milestone.id)}>×</button>
            </li>
          ))}
          {!goal.milestones.length && <li className="goals-empty">No milestones yet. Add the first small step.</li>}
        </ul>
        {!completed && <AddMilestone goalId={goal.id} />}
      </>}
      <div className="goals-actions">
        <button type="button" className="goals-button goals-secondary" onClick={() => completed ? onReopen() : actions.completeGoal(goal.id)}>{completed ? 'Reopen goal' : 'Mark complete'}</button>
        {confirmDelete ? <span className="goals-delete-confirm">
          <button type="button" className="goals-button goals-ghost" onClick={() => setConfirmDelete(false)}>Keep</button>
          <button type="button" className="goals-button goals-secondary" onClick={() => actions.removeGoal(goal.id)}>Delete goal</button>
        </span> : <button type="button" className="goals-button goals-ghost" onClick={() => setConfirmDelete(true)}>Delete</button>}
      </div>
    </section>
  )
}

function AddMilestone({ goalId }: { goalId: string }) {
  const [title, setTitle] = useState('')
  return <form className="goals-add-milestone" onSubmit={(event) => {
    event.preventDefault()
    if (!title.trim()) return
    actions.addMilestone(goalId, title.trim())
    setTitle('')
  }}>
    <input aria-label="New milestone" placeholder="Add a milestone" maxLength={90} value={title} onChange={(event) => setTitle(event.target.value)} />
    <button type="submit" className="goals-button goals-secondary" disabled={!title.trim()}>Add</button>
  </form>
}

function PaceChart({ goal, today, risk }: { goal: Goal; today: string; risk: boolean }) {
  const actual = goalProgress(goal)
  const expected = expectedProgress(goal, today)
  const x = 10 + 320 * expected
  const y = 96 - 84 * actual
  return <div className="goals-chart" data-risk={risk || undefined}>
    <svg viewBox="0 0 340 116" role="img" aria-label={`${Math.round(actual * 100)}% progress compared with ${Math.round(expected * 100)}% for an even pace. Dashed line shows an even pace from start to due date; the dot shows your progress today.`}>
      <line className="goals-chart-axis" x1="10" y1="96" x2="330" y2="96" />
      <line className="goals-chart-plan" x1="10" y1="96" x2="330" y2="12" />
      <line className="goals-chart-actual" x1={x} y1="96" x2={x} y2={y} />
      <circle className="goals-chart-halo" cx={x} cy={y} r="9" />
      <circle className="goals-chart-dot" cx={x} cy={y} r="4.5" />
      <text x="10" y="112">{shortDate(goal.start)}</text>
      <text x="330" y="112" textAnchor="end">{shortDate(goal.due)}</text>
    </svg>
  </div>
}

export function NewGoalForm({
  today,
  values,
  onCreated,
  initialWhy = '',
}: {
  today: string
  values: Value[]
  onCreated: (id: string) => void
  initialWhy?: string
}) {
  const [title, setTitle] = useState('')
  const [why, setWhy] = useState(initialWhy)
  const [valueId, setValueId] = useState(values[0]?.id ?? '')
  const [due, setDue] = useState(addDays(today, 90))
  const [mode, setMode] = useState<'milestones' | 'number'>('milestones')
  const [milestones, setMilestones] = useState('')
  const [target, setTarget] = useState('12')
  const [unit, setUnit] = useState('')

  const targetNumber = Math.round(Number(target))
  const valid = title.trim() && due >= today && (mode === 'milestones' || targetNumber > 0)

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        const id = actions.addGoal({
          title: title.trim(),
          why: why.trim(),
          valueId: valueId || undefined,
          start: today,
          due,
          milestones:
            mode === 'milestones'
              ? milestones
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line, i) => ({ id: `${Date.now()}-${i}`, title: line, done: false }))
              : [],
          metric: mode === 'number' ? { current: 0, target: targetNumber, unit: unit.trim() || 'times' } : undefined,
        })
        onCreated(id)
      }}
    >
      <Field label="Goal">
        <input
          autoFocus
          className="input"
          maxLength={80}
          placeholder="Run a half marathon"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <Field label="Why it matters" optional>
        <textarea
          className="input"
          rows={2}
          maxLength={200}
          placeholder="What will reaching it mean to you?"
          value={why}
          onChange={(e) => setWhy(e.target.value)}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Guided by">
          <select className="input" value={valueId} onChange={(e) => setValueId(e.target.value)}>
            <option value="">No specific value</option>
            {values.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Due date">
          <input type="date" className="input" min={today} value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
      </div>
      <Field label="Track progress by" group>
        <div>
          <Segmented
            label="Track progress by"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'milestones', label: 'Milestones' },
              { value: 'number', label: 'A number' },
            ]}
          />
        </div>
        {mode === 'milestones' ? (
          <textarea
            className="input mt-1"
            rows={3}
            aria-label="Milestones, one per line"
            placeholder={'One milestone per line\nRun 5K without stopping\nRun 10K'}
            value={milestones}
            onChange={(e) => setMilestones(e.target.value)}
          />
        ) : (
          <div className="mt-1 grid grid-cols-[120px_minmax(0,1fr)] gap-3">
            <input
              type="number"
              min={1}
              className="input"
              aria-label="Target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <input
              className="input"
              aria-label="Unit"
              placeholder="books, sessions, km…"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>
        )}
      </Field>
      <button type="submit" className="btn btn-primary mt-1 w-full" disabled={!valid}>
        Create goal
      </button>
    </form>
  )
}
