import { useMemo, useState } from 'react'
import { CornerDownRight, Pencil } from 'lucide-react'
import { Card, Empty, Field, PageHeader, RemoveButton, Stat, cx } from '../components/ui'
import { addDays, formatDate, relativeDay, shortDate } from '../lib/date'
import { MOODS, moodLabel } from '../lib/derive'
import { useToday } from '../lib/hooks'
import { actions, useStore } from '../lib/store'
import type { Reflection } from '../lib/types'

const PROMPTS = [
  { key: 'wentWell', label: 'What went well today?', placeholder: 'A small win, a good conversation, a moment of focus…' },
  { key: 'drained', label: 'What drained your energy?', placeholder: 'Notice it without judging it.' },
  { key: 'adjust', label: 'What will you adjust tomorrow?', placeholder: 'One small, specific change.' },
] as const

type PromptKey = (typeof PROMPTS)[number]['key']

const TAGS = ['Work', 'Health', 'Relationships', 'Learning', 'Rest', 'Creativity']

const dayLabel = (date: string) => formatDate(date, { weekday: 'long', month: 'short', day: 'numeric' })

export default function Reflections() {
  const today = useToday()
  const reflections = useStore((s) => s.reflections)
  const sorted = useMemo(() => [...reflections].sort((a, b) => b.date.localeCompare(a.date)), [reflections])
  const todayEntry = sorted.find((r) => r.date === today)
  const past = sorted.filter((r) => r.date !== today)
  const [editing, setEditing] = useState(!todayEntry)
  const [visible, setVisible] = useState(5)

  return (
    <>
      <PageHeader
        eyebrow="Reflect"
        title="Reflections"
        subtitle="Look back honestly, notice the patterns, and choose one thing to adjust."
      />

      <div className="grid items-start gap-4 sm:gap-6 xl:grid-cols-[minmax(0,728fr)_minmax(0,368fr)]">
        <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
          {editing || !todayEntry ? (
            <ReflectionForm
              today={today}
              initial={todayEntry}
              onSaved={() => setEditing(false)}
              onCancel={todayEntry ? () => setEditing(false) : undefined}
            />
          ) : (
            <Card
              title="Today’s reflection"
              aside={
                <button type="button" className="btn btn-ghost btn-sm -mr-2" onClick={() => setEditing(true)}>
                  <Pencil size={13} strokeWidth={1.75} />
                  Edit
                </button>
              }
            >
              <EntryMeta entry={todayEntry} />
              <EntryBody entry={todayEntry} />
            </Card>
          )}

          <Card title="Past entries" aside={<span className="text-caption tabular-nums text-muted">{past.length}</span>}>
            {past.length === 0 ? (
              <Empty>Your past reflections will appear here.</Empty>
            ) : (
              <ul className="flex flex-col">
                {past.slice(0, visible).map((r) => (
                  <li key={r.id} className="reveal border-t border-line py-5 first:border-t-0 first:pt-0 last:pb-0">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-label font-medium">{dayLabel(r.date)}</span>
                      <span className="flex-1" />
                      <RemoveButton label={`Delete reflection from ${dayLabel(r.date)}`} onClick={() => actions.removeReflection(r.id)} className="-my-1 -mr-1.5" />
                    </div>
                    <EntryMeta entry={r} />
                    <EntryBody entry={r} />
                  </li>
                ))}
              </ul>
            )}
            {past.length > visible && (
              <button type="button" className="btn btn-ghost mt-4 -ml-3.5" onClick={() => setVisible((v) => v + 5)}>
                Show {Math.min(5, past.length - visible)} more
              </button>
            )}
          </Card>
        </div>

        <div className="grid min-w-0 items-start gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-1">
          <PatternsCard reflections={sorted} today={today} />
          <AdjustmentsCard reflections={sorted} today={today} />
        </div>
      </div>
    </>
  )
}

function ReflectionForm({
  today,
  initial,
  onSaved,
  onCancel,
}: {
  today: string
  initial?: Reflection
  onSaved: () => void
  onCancel?: () => void
}) {
  const [mood, setMood] = useState(initial?.mood ?? 0)
  const [answers, setAnswers] = useState<Record<PromptKey, string>>({
    wentWell: initial?.wentWell ?? '',
    drained: initial?.drained ?? '',
    adjust: initial?.adjust ?? '',
  })
  const [tags, setTags] = useState<string[]>(initial?.tags ?? [])
  const canSave = mood > 0 || Object.values(answers).some((a) => a.trim())

  return (
    <section className="card" aria-labelledby="composer-title">
      <div className="card-header">
        <h2 id="composer-title" className="card-title">
          Tonight’s reflection
        </h2>
        <span className="text-caption text-muted">{dayLabel(today)}</span>
      </div>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSave) return
          actions.saveReflection({
            date: today,
            mood: mood || 3,
            wentWell: answers.wentWell.trim(),
            drained: answers.drained.trim(),
            adjust: answers.adjust.trim(),
            tags,
          })
          onSaved()
        }}
      >
        <Field label="How did today feel?" group>
          <div role="radiogroup" aria-label="Mood" className="grid grid-cols-5 gap-1.5">
            {MOODS.map((m) => (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={mood === m.value}
                className="mood-option"
                onClick={() => setMood(m.value)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </Field>
        {PROMPTS.map((p) => (
          <Field key={p.key} label={p.label}>
            <textarea
              className="input"
              rows={2}
              maxLength={500}
              placeholder={p.placeholder}
              value={answers[p.key]}
              onChange={(e) => setAnswers((a) => ({ ...a, [p.key]: e.target.value }))}
            />
          </Field>
        ))}
        <Field label="Themes" optional group>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((t) => {
              const on = tags.includes(t)
              return (
                <button
                  key={t}
                  type="button"
                  className="chip"
                  aria-pressed={on}
                  onClick={() => setTags((list) => (on ? list.filter((x) => x !== t) : [...list, t]))}
                >
                  {t}
                </button>
              )
            })}
          </div>
        </Field>
        <div className="flex items-center justify-end gap-2 pt-1">
          {onCancel && (
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={!canSave}>
            Save reflection
          </button>
        </div>
      </form>
    </section>
  )
}

function MoodBadge({ mood }: { mood: number }) {
  const color = mood >= 4 ? 'bg-green' : mood <= 2 ? 'bg-amber' : 'bg-secondary'
  return (
    <span className="inline-flex items-center gap-1.5 text-caption font-medium text-secondary">
      <span className={cx('size-1.5 rounded-full', color)} aria-hidden />
      {moodLabel(mood)}
    </span>
  )
}

function EntryMeta({ entry }: { entry: Reflection }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <MoodBadge mood={entry.mood} />
      {entry.tags.map((t) => (
        <span key={t} className="tag">
          {t}
        </span>
      ))}
    </div>
  )
}

function EntryBody({ entry }: { entry: Reflection }) {
  const filled = PROMPTS.filter((p) => entry[p.key])
  if (filled.length === 0) return null
  return (
    <dl className="flex flex-col gap-3">
      {filled.map((p) => (
        <div key={p.key}>
          <dt className="text-caption text-muted">{p.label}</dt>
          <dd className="mt-0.5 text-body text-secondary">{entry[p.key]}</dd>
        </div>
      ))}
    </dl>
  )
}

function PatternsCard({ reflections, today }: { reflections: Reflection[]; today: string }) {
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i - 13)), [today])
  const byDate = useMemo(() => new Map(reflections.map((r) => [r.date, r.mood])), [reflections])
  const recent = reflections.filter((r) => r.date >= days[0])
  const average = recent.length ? recent.reduce((sum, r) => sum + r.mood, 0) / recent.length : 0

  const themes = useMemo(
    () =>
      TAGS.map((tag) => {
        const entries = reflections.filter((r) => r.tags.includes(tag))
        const avg = entries.length ? entries.reduce((s, r) => s + r.mood, 0) / entries.length : 0
        return { tag, count: entries.length, avg }
      })
        .filter((t) => t.count > 0)
        .sort((a, b) => b.count - a.count),
    [reflections],
  )
  const ranked = themes.filter((t) => t.count >= 2).sort((a, b) => b.avg - a.avg)
  const best = ranked[0]
  const worst = ranked[ranked.length - 1]
  const maxCount = themes[0]?.count ?? 1

  return (
    <Card title="Patterns" aside={<span className="text-caption text-muted">Last 14 days</span>}>
      <Stat
        label="Average mood"
        value={recent.length ? average.toFixed(1) : '—'}
        caption={recent.length ? `${moodLabel(average)} · ${recent.length} entries` : 'No entries yet'}
      />
      <div className="mood-bars mt-5" role="img" aria-label="Mood for each of the last 14 days">
        {days.map((d) => {
          const mood = byDate.get(d)
          return (
            <span
              key={d}
              className="mood-bar"
              data-empty={!mood || undefined}
              data-today={(d === today && mood) || undefined}
              style={mood ? { height: `${(mood / 5) * 100}%` } : undefined}
              title={`${shortDate(d)} · ${mood ? moodLabel(mood) : 'No entry'}`}
            />
          )
        })}
      </div>
      <div className="mt-2 flex justify-between text-micro text-muted">
        <span>{shortDate(days[0])}</span>
        <span>Today</span>
      </div>

      {themes.length > 0 && (
        <>
          <div className="divider my-5" />
          <p className="mb-3 text-caption font-medium text-muted">Recurring themes</p>
          <ul className="flex flex-col gap-2.5">
            {themes.slice(0, 5).map((t) => (
              <li key={t.tag} className="flex items-center gap-3 text-label">
                <span className="w-24 shrink-0 truncate text-secondary">{t.tag}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-strong">
                  <span className="block h-full rounded-full bg-secondary" style={{ width: `${(t.count / maxCount) * 100}%` }} />
                </span>
                <span className="w-4 text-right tabular-nums text-muted">{t.count}</span>
              </li>
            ))}
          </ul>
          {best && worst && best !== worst && (
            <p className="mt-5 text-label text-muted">
              Days involving <span className="text-fg">{best.tag}</span> average {best.avg.toFixed(1)}. Days tagged{' '}
              <span className="text-fg">{worst.tag}</span> average {worst.avg.toFixed(1)}.
            </p>
          )}
        </>
      )}
    </Card>
  )
}

function AdjustmentsCard({ reflections, today }: { reflections: Reflection[]; today: string }) {
  const items = reflections.filter((r) => r.adjust).slice(0, 4)
  return (
    <Card title="Adjustments" aside={<span className="text-caption text-muted">What you chose to change</span>}>
      {items.length === 0 ? (
        <Empty>Answer “What will you adjust?” to collect small experiments here.</Empty>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {items.map((r) => (
            <li key={r.id} className="flex gap-2.5">
              <CornerDownRight size={14} strokeWidth={1.5} className="mt-[3px] shrink-0 text-faint" aria-hidden />
              <div className="min-w-0">
                <p className="text-label text-secondary">{r.adjust}</p>
                <p className="text-caption text-muted">{relativeDay(r.date, today)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
