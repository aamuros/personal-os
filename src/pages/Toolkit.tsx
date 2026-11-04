import { useEffect, useId, useMemo, useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { Card, Dialog, Empty, PageHeader, RemoveButton, cx, ic } from '../components/ui'
import { relativeDay } from '../lib/date'
import { EXERCISES, EXERCISE_BY_ID, type Exercise, type ExerciseStep } from '../lib/exercises'
import { useToday } from '../lib/hooks'
import { clearParam, useLocation } from '../lib/router'
import { actions, useStore } from '../lib/store'

export default function Toolkit() {
  const today = useToday()
  const { param } = useLocation()
  const practices = useStore((s) => s.practices)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (param && EXERCISE_BY_ID[param]) setActiveId(param)
    if (param) clearParam('toolkit')
  }, [param])

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of practices) map[p.exerciseId] = (map[p.exerciseId] ?? 0) + 1
    return map
  }, [practices])
  const sorted = useMemo(() => [...practices].sort((a, b) => b.date.localeCompare(a.date)), [practices])
  const active = activeId ? EXERCISE_BY_ID[activeId] : undefined

  return (
    <>
      <PageHeader
        title="Psychological toolkit"
        subtitle="Short, guided exercises inspired by The 12 Levers. Pick one when you feel stuck, scattered, or ready to change something."
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {EXERCISES.map((ex) => {
          const Icon = ex.icon
          return (
            <button key={ex.id} type="button" className="tool-card group" onClick={() => setActiveId(ex.id)}>
              <span className="tool-icon">
                <Icon {...ic} />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-title font-medium">{ex.title}</span>
                <span className="text-label text-muted">{ex.tagline}</span>
              </span>
              <span className="mt-auto flex w-full items-center justify-between gap-3 text-caption text-tertiary">
                <span>
                  {ex.steps.length} steps · {ex.minutes} min
                  {counts[ex.id] ? ` · Practiced ${counts[ex.id]}×` : ''}
                </span>
                <ArrowRight
                  size={14}
                  strokeWidth={1.75}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </button>
          )
        })}
      </div>

      <Card title="Recent practice" aside={<span className="text-caption tabular-nums text-muted">{practices.length}</span>}>
        {sorted.length === 0 ? (
          <Empty>Finished exercises are saved here so you can revisit what you learned.</Empty>
        ) : (
          <ul className="-mt-1 flex flex-col gap-0.5">
            {sorted.map((p) => {
              const ex = EXERCISE_BY_ID[p.exerciseId]
              if (!ex) return null
              const Icon = ex.icon
              const open = expanded === p.id
              return (
                <li key={p.id} className="row row-interactive items-start py-3">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    aria-expanded={open}
                    onClick={() => setExpanded(open ? null : p.id)}
                  >
                    <span className="tool-icon size-8">
                      <Icon size={14} strokeWidth={1.5} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="text-body font-medium">{ex.title}</span>
                        <span className="shrink-0 text-caption text-muted">{relativeDay(p.date, today)}</span>
                      </span>
                      <span className={cx('mt-0.5 block text-label text-muted', !open && 'line-clamp-2')}>
                        {ex.summarize(p.answers)}
                      </span>
                      {open && (
                        <dl className="mt-4 flex flex-col gap-3">
                          {ex.steps.map((s, i) => (
                            <div key={s.prompt}>
                              <dt className="text-caption text-faint">{s.prompt}</dt>
                              <dd className="mt-0.5 text-label text-secondary">{p.answers[i]}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </span>
                  </button>
                  <RemoveButton label={`Delete ${ex.title} practice`} onClick={() => actions.removePractice(p.id)} className="-my-1 -mr-1.5" />
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Dialog
        open={!!active}
        onClose={() => setActiveId(null)}
        ariaLabel={active?.title ?? 'Exercise'}
        style={{ width: 'min(560px, calc(100% - 32px))' }}
      >
        {active && <ExerciseFlow exercise={active} today={today} onClose={() => setActiveId(null)} />}
      </Dialog>
    </>
  )
}

function ExerciseFlow({ exercise, today, onClose }: { exercise: Exercise; today: string; onClose: () => void }) {
  const values = useStore((s) => s.values)
  const goals = useStore((s) => s.goals)
  const activeGoals = useMemo(() => goals.filter((g) => g.status === 'active'), [goals])
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<string[]>(() =>
    exercise.steps.map((s) =>
      s.kind === 'value' ? (values[0]?.name ?? '') : s.kind === 'goal' ? (activeGoals[0]?.title ?? '') : '',
    ),
  )

  const total = exercise.steps.length
  const reviewing = step === total
  const current = exercise.steps[step] as ExerciseStep | undefined
  const canContinue = (answers[step] ?? '').trim().length > 0
  const Icon = exercise.icon

  const setAnswer = (value: string) => setAnswers((list) => list.map((a, i) => (i === step ? value : a)))
  const next = () => canContinue && setStep((s) => s + 1)

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="tool-icon">
            <Icon {...ic} />
          </span>
          <div>
            <h2 className="text-title font-medium">{exercise.title}</h2>
            <p className="text-caption text-muted">{reviewing ? 'Review and save' : `Step ${step + 1} of ${total}`}</p>
          </div>
        </div>
        <button type="button" className="icon-btn -mt-0.5 -mr-1.5" aria-label="Close exercise" onClick={onClose}>
          <X {...ic} />
        </button>
      </div>

      <div className="mb-7 flex gap-1.5" aria-hidden>
        {exercise.steps.map((_, i) => (
          <span
            key={i}
            className={cx(
              'h-1 flex-1 rounded-full transition-colors duration-200',
              i < step || reviewing ? 'bg-cyan' : i === step ? 'bg-secondary' : 'bg-strong',
            )}
          />
        ))}
      </div>

      {reviewing || !current ? (
        <div className="page-enter flex flex-col gap-5">
          <div className="rounded-row bg-wash p-4">
            <p className="text-caption font-medium text-muted">Your takeaway</p>
            <p className="mt-1 text-body">{exercise.summarize(answers.map((a) => a.trim()))}</p>
          </div>
          <dl className="flex flex-col gap-3">
            {exercise.steps.map((s, i) => (
              <div key={s.prompt}>
                <dt className="text-caption text-muted">{s.prompt}</dt>
                <dd className="mt-0.5 text-label text-secondary">{answers[i]}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <StepInput
          key={step}
          step={current}
          value={answers[step] ?? ''}
          onChange={setAnswer}
          onSubmit={next}
          options={
            current.kind === 'value'
              ? values.map((v) => v.name)
              : current.kind === 'goal'
                ? activeGoals.map((g) => g.title)
                : undefined
          }
        />
      )}

      <div className="mt-8 flex items-center justify-between gap-2">
        <button
          type="button"
          className="btn btn-ghost -ml-3.5"
          onClick={() => (step === 0 ? onClose() : setStep((s) => s - 1))}
        >
          {step === 0 ? 'Cancel' : 'Back'}
        </button>
        {reviewing ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              actions.addPractice(exercise.id, today, answers.map((a) => a.trim()))
              onClose()
            }}
          >
            Save practice
          </button>
        ) : (
          <button type="button" className="btn btn-primary" disabled={!canContinue} onClick={next}>
            {step === total - 1 ? 'Review' : 'Continue'}
          </button>
        )}
      </div>
    </div>
  )
}

function StepInput({
  step,
  value,
  onChange,
  onSubmit,
  options,
}: {
  step: ExerciseStep
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  options?: string[]
}) {
  const id = useId()
  const useChoices = (step.kind === 'value' || step.kind === 'goal') && options && options.length > 0

  let control
  if (step.kind === 'scale') {
    control = (
      <div>
        <div role="radiogroup" aria-labelledby={id} className="grid grid-cols-5 gap-1.5">
          {['1', '2', '3', '4', '5'].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              className="mood-option tabular-nums"
              onClick={() => onChange(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-caption text-muted">
          <span>Not at all</span>
          <span>Fully</span>
        </div>
      </div>
    )
  } else if (useChoices) {
    control = (
      <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={value === o} className="chip h-8 px-3.5 text-label" onClick={() => onChange(o)}>
            {o}
          </button>
        ))}
      </div>
    )
  } else if (step.kind === 'long') {
    control = (
      <>
        <textarea
          id={`${id}-input`}
          autoFocus
          className="input"
          rows={4}
          maxLength={600}
          placeholder={step.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              onSubmit()
            }
          }}
        />
        <p className="mt-2 text-caption text-faint">Press ⌘ Enter to continue</p>
      </>
    )
  } else {
    control = (
      <input
        id={`${id}-input`}
        autoFocus
        className="input"
        maxLength={200}
        placeholder={step.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onSubmit()
          }
        }}
      />
    )
  }

  return (
    <div className="page-enter flex flex-col gap-2">
      {step.kind === 'scale' || useChoices ? (
        <p id={id} className="text-heading font-medium">
          {step.prompt}
        </p>
      ) : (
        <label id={id} htmlFor={`${id}-input`} className="text-heading font-medium">
          {step.prompt}
        </label>
      )}
      {step.helper && <p className="text-label text-muted">{step.helper}</p>}
      <div className="mt-3">{control}</div>
    </div>
  )
}
