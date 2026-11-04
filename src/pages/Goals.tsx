import { useEffect, useMemo, useState } from 'react'
import { Check as CheckIcon, Minus, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Card, Check, Dialog, Empty, Field, InlineAdd, PageHeader, Progress, RemoveButton, Segmented, cx, ic } from '../components/ui'
import { addDays, daysBetween, shortDate } from '../lib/date'
import { goalPace, goalProgress, paceLabel, plural } from '../lib/derive'
import { useToday } from '../lib/hooks'
import { clearParam, useLocation } from '../lib/router'
import { actions, useStore } from '../lib/store'
import type { Goal, GoalStatus, Value } from '../lib/types'

export default function Goals() {
  const today = useToday()
  const { param } = useLocation()
  const goals = useStore((s) => s.goals)
  const values = useStore((s) => s.values)
  const [tab, setTab] = useState<GoalStatus>('active')
  const [selectedId, setSelectedId] = useState<string>()
  const [creating, setCreating] = useState(false)

  // Deep links: #goals/new opens the composer, #goals/<id> selects a goal.
  useEffect(() => {
    if (!param) return
    if (param === 'new') setCreating(true)
    const goal = goals.find((g) => g.id === param)
    if (goal) {
      setSelectedId(goal.id)
      setTab(goal.status)
    }
    clearParam('goals')
  }, [param, goals])

  const list = useMemo(
    () =>
      goals
        .filter((g) => g.status === tab)
        .sort((a, b) =>
          tab === 'active' ? a.due.localeCompare(b.due) : (b.completedOn ?? '').localeCompare(a.completedOn ?? ''),
        ),
    [goals, tab],
  )
  const selected = list.find((g) => g.id === selectedId) ?? list[0]
  const valueName = (id?: string) => values.find((v) => v.id === id)?.name

  return (
    <>
      <PageHeader
        eyebrow="Plan"
        title="Goals"
        subtitle="Meaningful goals, grounded in your values and broken into small, doable steps."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <Plus {...ic} />
            New goal
          </button>
        }
      />

      <div className="mb-4">
        <Segmented
          label="Goal status"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'active', label: 'Active', count: goals.filter((g) => g.status === 'active').length },
            { value: 'completed', label: 'Completed', count: goals.filter((g) => g.status === 'completed').length },
          ]}
        />
      </div>

      {list.length === 0 ? (
        <Card>
          <Empty>
            {tab === 'active'
              ? 'No active goals. Start with one that reflects a value you care about.'
              : 'Completed goals will collect here.'}
          </Empty>
        </Card>
      ) : (
        <div className="grid items-start gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
          <section className="card p-2 sm:p-2" aria-label={tab === 'active' ? 'Active goals' : 'Completed goals'}>
            <ul className="flex flex-col gap-0.5">
              {list.map((g) => (
                <li key={g.id}>
                  <GoalRow
                    goal={g}
                    today={today}
                    valueName={valueName(g.valueId)}
                    selected={g.id === selected?.id}
                    onSelect={() => setSelectedId(g.id)}
                  />
                </li>
              ))}
            </ul>
          </section>
          {selected && <GoalDetail key={selected.id} goal={selected} today={today} values={values} />}
        </div>
      )}

      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title="New goal"
        description="Start with why it matters — that’s what keeps you going."
      >
        <NewGoalForm
          today={today}
          values={values}
          onCreated={(id) => {
            setTab('active')
            setSelectedId(id)
            setCreating(false)
          }}
        />
      </Dialog>
    </>
  )
}

function GoalRow({
  goal,
  today,
  valueName,
  selected,
  onSelect,
}: {
  goal: Goal
  today: string
  valueName?: string
  selected: boolean
  onSelect: () => void
}) {
  const pct = Math.round(goalProgress(goal) * 100)
  const pace = goalPace(goal, today)
  const left = daysBetween(today, goal.due)
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      data-selected={selected}
      className="row row-interactive mx-0 w-full flex-col items-stretch gap-3 rounded-[20px] px-4 py-4 text-left"
    >
      <span className="flex items-start justify-between gap-4">
        <span className="min-w-0">
          <span className="block truncate text-body font-medium">{goal.title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-caption text-tertiary">
            {valueName && (
              <>
                <span>{valueName}</span>
                <span className="text-faint">·</span>
              </>
            )}
            {goal.status === 'completed' ? (
              <span>Completed {goal.completedOn ? shortDate(goal.completedOn) : ''}</span>
            ) : (
              <span>
                Due {shortDate(goal.due)} · {left >= 0 ? `${plural(left, 'day')} left` : 'Overdue'}
              </span>
            )}
            {pace === 'behind' && <span className="text-amber">· Behind pace</span>}
          </span>
        </span>
        <span className="shrink-0 text-label tabular-nums text-tertiary">{pct}%</span>
      </span>
      <Progress
        value={pct / 100}
        label={goal.title}
        tone={goal.status === 'completed' ? 'green' : pace === 'behind' || pace === 'overdue' ? 'amber' : 'cyan'}
      />
    </button>
  )
}

function GoalDetail({ goal, today, values }: { goal: Goal; today: string; values: Value[] }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const pct = Math.round(goalProgress(goal) * 100)
  const pace = goalPace(goal, today)
  const left = daysBetween(today, goal.due)
  const value = values.find((v) => v.id === goal.valueId)
  const doneCount = goal.milestones.filter((m) => m.done).length
  const atRisk = pace === 'behind' || pace === 'overdue'

  return (
    <section className="card xl:sticky xl:top-6" aria-label={`${goal.title} details`}>
      <p className="text-caption font-medium text-muted">{value ? `Guided by ${value.name}` : 'Goal'}</p>
      <h2 className="mt-1 text-heading font-medium">{goal.title}</h2>
      {goal.why && <p className="mt-2 text-body text-secondary">{goal.why}</p>}

      <dl className="mt-5 grid grid-cols-3 divide-x divide-line rounded-row border border-line">
        <div className="px-3 py-2.5">
          <dt className="text-caption text-muted">Due</dt>
          <dd className="mt-0.5 text-label font-medium">{shortDate(goal.due)}</dd>
        </div>
        <div className="px-3 py-2.5">
          <dt className="text-caption text-muted">{goal.status === 'completed' ? 'Finished' : 'Time left'}</dt>
          <dd className="mt-0.5 text-label font-medium tabular-nums">
            {goal.status === 'completed'
              ? goal.completedOn
                ? shortDate(goal.completedOn)
                : '—'
              : left >= 0
                ? plural(left, 'day')
                : `${plural(-left, 'day')} late`}
          </dd>
        </div>
        <div className="px-3 py-2.5">
          <dt className="text-caption text-muted">Pace</dt>
          <dd className={cx('mt-0.5 text-label font-medium', atRisk && 'text-amber')}>{paceLabel[pace]}</dd>
        </div>
      </dl>

      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-label text-muted">Progress</span>
          <span className="text-label font-medium tabular-nums">{pct}%</span>
        </div>
        <Progress
          value={pct / 100}
          label={`${goal.title} progress`}
          tone={goal.status === 'completed' ? 'green' : atRisk ? 'amber' : 'cyan'}
        />
        {goal.metric && (
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-label tabular-nums text-secondary">
              {goal.metric.current} of {goal.metric.target} {goal.metric.unit}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                className="icon-btn bg-wash"
                aria-label={`Decrease ${goal.metric.unit}`}
                disabled={goal.metric.current <= 0 || goal.status === 'completed'}
                onClick={() => actions.setMetric(goal.id, goal.metric!.current - 1)}
              >
                <Minus size={14} strokeWidth={1.75} />
              </button>
              <button
                type="button"
                className="icon-btn bg-wash"
                aria-label={`Increase ${goal.metric.unit}`}
                disabled={goal.metric.current >= goal.metric.target || goal.status === 'completed'}
                onClick={() => actions.setMetric(goal.id, goal.metric!.current + 1)}
              >
                <Plus size={14} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="divider my-5" />

      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-label font-medium">Milestones</h3>
        {goal.milestones.length > 0 && (
          <span className="text-caption tabular-nums text-muted">
            {doneCount} of {goal.milestones.length}
          </span>
        )}
      </div>
      {goal.milestones.length === 0 && !goal.metric && (
        <p className="text-label text-muted">Break this goal into a few concrete steps.</p>
      )}
      <ul className="flex flex-col gap-0.5">
        {goal.milestones.map((m) => (
          <li key={m.id} className="row row-interactive min-h-9 py-1.5">
            <Check small checked={m.done} label={m.title} onChange={() => actions.toggleMilestone(goal.id, m.id)} />
            <span className={cx('min-w-0 flex-1 text-label', m.done ? 'text-muted line-through decoration-faint' : 'text-secondary')}>
              {m.title}
            </span>
            <RemoveButton label={`Remove ${m.title}`} onClick={() => actions.removeMilestone(goal.id, m.id)} className="-my-1 -mr-1.5" />
          </li>
        ))}
      </ul>
      {goal.status === 'active' && (
        <InlineAdd buttonLabel="Add milestone" placeholder="Next concrete step" onSubmit={(t) => actions.addMilestone(goal.id, t)} />
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        {goal.status === 'active' ? (
          <button type="button" className="btn btn-subtle" onClick={() => actions.completeGoal(goal.id)}>
            <CheckIcon {...ic} />
            Mark complete
          </button>
        ) : (
          <button type="button" className="btn btn-subtle" onClick={() => actions.reopenGoal(goal.id)}>
            <RotateCcw {...ic} />
            Reopen goal
          </button>
        )}
        {confirmDelete ? (
          <span className="flex items-center gap-1">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>
              Keep
            </button>
            <button type="button" className="btn btn-subtle btn-sm text-amber" onClick={() => actions.removeGoal(goal.id)}>
              Delete goal
            </button>
          </span>
        ) : (
          <button type="button" className="icon-btn" aria-label="Delete goal" onClick={() => setConfirmDelete(true)}>
            <Trash2 {...ic} />
          </button>
        )}
      </div>
    </section>
  )
}

function NewGoalForm({
  today,
  values,
  onCreated,
}: {
  today: string
  values: Value[]
  onCreated: (id: string) => void
}) {
  const [title, setTitle] = useState('')
  const [why, setWhy] = useState('')
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
