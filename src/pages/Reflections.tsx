import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { PageHeader } from '../components/ui'
import { addDays, daysBetween, formatDate, shortDate } from '../lib/date'
import { MOODS, moodLabel } from '../lib/derive'
import { useToday } from '../lib/hooks'
import { actions, useStore } from '../lib/store'
import type { Reflection } from '../lib/types'
import './reflections.css'

const PROMPTS = [
  { key: 'wentWell', label: 'What went well?', placeholder: 'A small win, a good conversation, a moment of focus…' },
  { key: 'drained', label: 'What drained your energy?', placeholder: 'Notice it without judging it.' },
  { key: 'adjust', label: 'What will you adjust tomorrow?', placeholder: 'One small, specific change.' },
] as const
const TAGS = ['Work', 'Health', 'Relationships', 'Learning', 'Rest', 'Creativity']
type PromptKey = (typeof PROMPTS)[number]['key']
const dayLabel = (date: string) => formatDate(date, { weekday: 'long', month: 'short', day: 'numeric' })
const moodColor = (mood: number) => mood <= 2 ? 'var(--reflection-amber)' : mood === 3 ? 'var(--reflection-mid)' : 'var(--reflection-lived)'

export default function Reflections() {
  const today = useToday()
  const reflections = useStore((s) => s.reflections)
  const sorted = useMemo(() => [...reflections].sort((a, b) => b.date.localeCompare(a.date)), [reflections])
  const todayEntry = sorted.find((r) => r.date === today)
  const [showAll, setShowAll] = useState(false)
  const [openDates, setOpenDates] = useState<Set<string>>(() => new Set())
  const [formRevision, setFormRevision] = useState(0)
  const composerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (formRevision > 0) composerRef.current?.querySelector('textarea')?.focus()
  }, [formRevision])

  return (
    <div className="reflections-page">
      <PageHeader title="Reflections" subtitle="Look back honestly, notice the patterns, and choose one thing to adjust." />
      <div className="reflection-columns">
        <div className="reflection-column">
          <div ref={composerRef}>
            <ReflectionForm key={`${today}-${formRevision}`} today={today} initial={todayEntry} onSaved={() => {
              setOpenDates((dates) => new Set(dates).add(today))
            }} />
          </div>
          <Slab title="Past entries" aside={<><RollingNumber value={String(sorted.length)} /> {sorted.length === 1 ? 'entry' : 'entries'}</>}>
            <ul className="reflection-entries">
              {(showAll ? sorted : sorted.slice(0, 4)).map((entry) => (
                <Entry key={entry.id} entry={entry} open={openDates.has(entry.date)} onToggle={() => {
                  setOpenDates((dates) => {
                    const next = new Set(dates)
                    if (next.has(entry.date)) next.delete(entry.date)
                    else next.add(entry.date)
                    return next
                  })
                }} onEdit={entry.date === today ? () => {
                  setFormRevision((revision) => revision + 1)
                } : undefined} />
              ))}
              {!sorted.length && <li className="reflection-empty">No reflections yet. Pick a mood above and write one line.</li>}
            </ul>
            {sorted.length > 4 && <button type="button" className="reflection-ghost" onClick={() => setShowAll((all) => !all)}>
              {showAll ? 'Show fewer' : `Show ${sorted.length - 4} more`}
            </button>}
          </Slab>
        </div>
        <div className="reflection-column">
          <Patterns reflections={sorted} today={today} />
          <Adjustments reflections={sorted} today={today} />
        </div>
      </div>
    </div>
  )
}

function Slab({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  const id = useId()
  return <section className="reflection-slab" aria-labelledby={id}>
    <div className="reflection-panel-heading"><h2 id={id}>{title}</h2>{aside && <span className="reflection-count">{aside}</span>}</div>
    {children}
  </section>
}

function RollingNumber({ value }: { value: string }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  return <span className="reflection-roll" role="img" aria-label={value}>
    {Array.from(value, (char, index) => /\d/.test(char) ? (
      <span className="reflection-wheel" key={index} aria-hidden="true">
        <span className="reflection-digits" style={{ transform: `translateY(calc(var(--reflection-digit-height) * -${ready ? Number(char) : 0}))`, transitionDelay: `${index * 70}ms` }}>
          {Array.from('0123456789', (digit) => <b key={digit}>{digit}</b>)}
        </span>
      </span>
    ) : <span key={index} aria-hidden="true">{char}</span>)}
  </span>
}

function ReflectionForm({ today, initial, onSaved }: { today: string; initial?: Reflection; onSaved: () => void }) {
  const [mood, setMood] = useState(initial?.mood ?? 0)
  const [answers, setAnswers] = useState<Record<PromptKey, string>>({
    wentWell: initial?.wentWell ?? '', drained: initial?.drained ?? '', adjust: initial?.adjust ?? '',
  })
  const [tags, setTags] = useState<string[]>(initial?.tags ?? [])
  const [saved, setSaved] = useState(false)
  const moodLabelId = useId()
  const moodRef = useRef<HTMLDivElement>(null)
  const canSave = mood > 0 && Object.values(answers).some((answer) => answer.trim())
  useEffect(() => {
    if (!saved) return
    const timer = window.setTimeout(() => setSaved(false), 1400)
    return () => window.clearTimeout(timer)
  }, [saved])

  return <Slab title="Tonight’s reflection">
    <form autoComplete="off" onSubmit={(event) => {
      event.preventDefault()
      if (!canSave) return
      actions.saveReflection({
        date: today,
        mood,
        wentWell: answers.wentWell.trim(),
        drained: answers.drained.trim(),
        adjust: answers.adjust.trim(),
        tags,
        adjustmentDone: initial?.adjust === answers.adjust.trim() ? initial?.adjustmentDone : false,
      })
      setMood(0)
      setAnswers({ wentWell: '', drained: '', adjust: '' })
      setTags([])
      setSaved(true)
      onSaved()
    }}>
      <span className="reflection-caption" id={moodLabelId}>How did today feel?</span>
      <div className="reflection-moods" ref={moodRef} role="radiogroup" aria-labelledby={moodLabelId} onKeyDown={(event) => {
        const direction = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[event.key]
        if (!direction && event.key !== 'Home' && event.key !== 'End') return
        event.preventDefault()
        const next = event.key === 'Home' ? 1 : event.key === 'End' ? 5 : Math.max(1, Math.min(5, (mood || (direction > 0 ? 0 : 6)) + direction))
        setMood(next)
        moodRef.current?.querySelector<HTMLButtonElement>(`[data-mood="${next}"]`)?.focus()
      }}>
        <span className="reflection-mood-tile" aria-hidden="true" data-selected={mood > 0} style={{ '--reflection-mood-index': Math.max(0, mood - 1) } as CSSProperties} />
        {MOODS.map((option) => <button key={option.value} data-mood={option.value} type="button" role="radio" aria-checked={mood === option.value}
          tabIndex={mood === option.value || (!mood && option.value === 1) ? 0 : -1} onClick={() => setMood(option.value)}>{option.label}</button>)}
      </div>
      <div className="reflection-fields">
        {PROMPTS.map((prompt) => <label key={prompt.key} className={`reflection-field${prompt.key === 'adjust' ? ' reflection-field-wide' : ''}`}>
          <span>{prompt.label}</span>
          <textarea rows={1} maxLength={500} placeholder={prompt.placeholder} value={answers[prompt.key]}
            onChange={(event) => setAnswers((previous) => ({ ...previous, [prompt.key]: event.target.value }))} />
        </label>)}
      </div>
      <div className="reflection-form-footer">
        <div className="reflection-chips" role="group" aria-label="Themes, optional">
          {TAGS.map((tag) => <button key={tag} type="button" className="reflection-chip" aria-pressed={tags.includes(tag)} onClick={() => {
            setTags((previous) => previous.includes(tag) ? previous.filter((item) => item !== tag) : [...previous, tag])
          }}>{tag}</button>)}
        </div>
        <button type="submit" className="reflection-save" disabled={!canSave} data-saved={saved || undefined}>{saved ? 'Saved' : 'Save reflection'}</button>
        <span className="sr-only" role="status">{saved ? 'Reflection saved.' : ''}</span>
      </div>
    </form>
  </Slab>
}

function Entry({ entry, open, onToggle, onEdit }: { entry: Reflection; open: boolean; onToggle: () => void; onEdit?: () => void }) {
  const id = useId()
  const [removing, setRemoving] = useState(false)
  useEffect(() => {
    if (!removing) return
    const timer = window.setTimeout(() => actions.removeReflection(entry.id), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 340)
    return () => window.clearTimeout(timer)
  }, [removing, entry.id])
  return <li className="reflection-entry" data-removing={removing || undefined}>
    <div>
      <button type="button" className="reflection-entry-header" aria-expanded={open} aria-controls={id} onClick={onToggle}>
        <span className="reflection-entry-meta"><b>{dayLabel(entry.date)}</b><span className="reflection-mood-badge"><i aria-hidden="true" style={{ background: moodColor(entry.mood) }} />{moodLabel(entry.mood)}</span></span>
        <span className="reflection-plus" aria-hidden="true" />
        <span className="reflection-preview">{entry.adjust || entry.wentWell || entry.drained}</span>
      </button>
      <div className="reflection-details" id={id} data-open={open} inert={!open}>
        <div>
          <dl>{PROMPTS.filter((prompt) => entry[prompt.key]).map((prompt) => <div key={prompt.key}>
            <dt>{prompt.label}</dt><dd>{entry[prompt.key]}</dd>
          </div>)}</dl>
          <div className="reflection-entry-tags">
            {entry.tags.map((tag) => <span key={tag} className="reflection-tag">{tag}</span>)}
            <div className="reflection-entry-actions">
              {onEdit && <button type="button" className="reflection-ghost" onClick={onEdit}>Edit</button>}
              <button type="button" className="reflection-ghost" aria-label={`Delete reflection from ${dayLabel(entry.date)}`} disabled={removing} onClick={() => setRemoving(true)}>Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </li>
}

function Patterns({ reflections, today }: { reflections: Reflection[]; today: string }) {
  const days = Array.from({ length: 14 }, (_, index) => addDays(today, index - 13))
  const recent = reflections.filter((entry) => entry.date >= days[0] && entry.date <= today)
  const byDate = new Map(recent.map((entry) => [entry.date, entry]))
  const average = (entries: Reflection[]) => entries.reduce((sum, entry) => sum + entry.mood, 0) / entries.length
  const mood = recent.length ? average(recent) : 0
  const themes = TAGS.map((tag) => ({ tag, entries: recent.filter((entry) => entry.tags.includes(tag)) }))
    .filter((theme) => theme.entries.length).sort((a, b) => b.entries.length - a.entries.length)
  const ranked = themes.filter((theme) => theme.entries.length >= 2).sort((a, b) => average(b.entries) - average(a.entries))
  const best = ranked[0]
  const worst = ranked[ranked.length - 1]

  return <Slab title="Patterns" aside="Last 14 days">
    <div className="reflection-average"><RollingNumber value={recent.length ? mood.toFixed(1) : '–'} /></div>
    <p className="reflection-average-label">{recent.length ? `${moodLabel(mood)} · ${recent.length} ${recent.length === 1 ? 'entry' : 'entries'}` : 'No entries yet'}</p>
    <div className="reflection-bars" role="img" aria-label={`Mood for each of the last 14 days: ${days.map((date) => `${shortDate(date)}: ${byDate.has(date) ? moodLabel(byDate.get(date)!.mood) : 'No entry'}`).join('; ')}`}>
      {days.map((date, index) => {
        const entry = byDate.get(date)
        return <span key={date} className="reflection-bar-column" title={`${shortDate(date)} · ${entry ? moodLabel(entry.mood) : 'No entry'}`}>
          <i style={{ height: `${entry ? entry.mood * 20 : 0}%`, background: entry ? moodColor(entry.mood) : undefined, '--reflection-bar-index': index } as CSSProperties} />
        </span>
      })}
    </div>
    <div className="reflection-axis"><span>{shortDate(days[0])}</span><span>Today</span></div>
    <div className="reflection-divider" />
    <ul className="reflection-themes" aria-label="Recurring themes">
      {themes.map((theme) => <li key={theme.tag}><span>{theme.tag}</span><span className="reflection-theme-track" aria-hidden="true"><i style={{ width: `${theme.entries.length / themes[0].entries.length * 100}%` }} /></span><em>{theme.entries.length}</em></li>)}
    </ul>
    <p className="reflection-note">{best && worst && best !== worst
      ? <>Days with <b>{best.tag}</b> average {average(best.entries).toFixed(1)}. Days with <b>{worst.tag}</b> average {average(worst.entries).toFixed(1)}.</>
      : 'Tag a few more days to see which themes lift your mood.'}</p>
  </Slab>
}

function Adjustments({ reflections, today }: { reflections: Reflection[]; today: string }) {
  const items = reflections.filter((entry) => entry.adjust.trim()).slice(0, 5)
  return <Slab title="Adjustments" aside={<><RollingNumber value={String(items.filter((entry) => entry.adjustmentDone).length)} /> of <RollingNumber value={String(items.length)} /> done</>}>
    <ul className="reflection-adjustments">
      {items.map((entry) => {
        const ago = daysBetween(entry.date, today)
        return <li key={entry.id} className="reflection-adjustment" data-done={entry.adjustmentDone || undefined}>
          <button type="button" className="reflection-check" role="checkbox" aria-checked={!!entry.adjustmentDone} aria-label={entry.adjust} onClick={() => actions.toggleReflectionAdjustment(entry.id)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" pathLength="1" /></svg>
          </button>
          <span className="reflection-adjustment-label"><span>{entry.adjust}</span><small>{ago === 0 ? 'Today' : ago === 1 ? 'Yesterday' : ago > 1 ? `${ago} days ago` : dayLabel(entry.date)}</small></span>
        </li>
      })}
      {!items.length && <li className="reflection-empty">Adjustments you write will collect here.</li>}
    </ul>
  </Slab>
}
