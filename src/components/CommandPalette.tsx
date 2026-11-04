import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  Clock,
  Moon,
  NotebookPen,
  Plus,
  Search,
  Sun,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { monthYear, shortDate } from '../lib/date'
import { EXERCISES } from '../lib/exercises'
import { NAV } from '../lib/nav'
import { ROUTES, navigate } from '../lib/router'
import { useStore } from '../lib/store'
import type { Theme } from '../lib/theme'
import { Dialog } from './ui'

interface Command {
  id: string
  group: string
  label: string
  hint?: string
  icon: LucideIcon
  run: () => void
}

interface PaletteProps {
  open: boolean
  onClose: () => void
  theme: Theme
  onToggleTheme: () => void
  onNewPriority: () => void
}

export function CommandPalette(props: PaletteProps) {
  return (
    <Dialog open={props.open} onClose={props.onClose} ariaLabel="Search Life OS" className="palette">
      <PaletteContent {...props} />
    </Dialog>
  )
}

function PaletteContent({ onClose, theme, onToggleTheme, onNewPriority }: PaletteProps) {
  const goals = useStore((s) => s.goals)
  const events = useStore((s) => s.events)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const commands = useMemo<Command[]>(
    () => [
      ...ROUTES.map((route) => ({
        id: `page-${route}`,
        group: 'Go to',
        label: NAV[route].label,
        icon: NAV[route].icon,
        run: () => navigate(route),
      })),
      { id: 'new-priority', group: 'Create', label: 'New priority', icon: Plus, run: onNewPriority },
      { id: 'new-goal', group: 'Create', label: 'New goal', icon: Target, run: () => navigate('goals', 'new') },
      {
        id: 'new-session',
        group: 'Create',
        label: 'Log learning session',
        icon: BookOpen,
        run: () => navigate('learning', 'new'),
      },
      {
        id: 'new-reflection',
        group: 'Create',
        label: 'Write reflection',
        icon: NotebookPen,
        run: () => navigate('reflections'),
      },
      { id: 'new-event', group: 'Create', label: 'Add life event', icon: Clock, run: () => navigate('timeline', 'new') },
      {
        id: 'theme',
        group: 'Preferences',
        label: theme === 'dark' ? 'Switch to light appearance' : 'Switch to dark appearance',
        icon: theme === 'dark' ? Sun : Moon,
        run: onToggleTheme,
      },
      ...goals.map((g) => ({
        id: `goal-${g.id}`,
        group: 'Goals',
        label: g.title,
        hint: g.status === 'completed' ? 'Completed' : `Due ${shortDate(g.due)}`,
        icon: Target,
        run: () => navigate('goals', g.id),
      })),
      ...EXERCISES.map((e) => ({
        id: `exercise-${e.id}`,
        group: 'Toolkit',
        label: e.title,
        hint: `${e.minutes} min`,
        icon: e.icon,
        run: () => navigate('toolkit', e.id),
      })),
      ...events.map((e) => ({
        id: `event-${e.id}`,
        group: 'Timeline',
        label: e.title,
        hint: monthYear(e.date),
        icon: Clock,
        run: () => navigate('timeline'),
      })),
    ],
    [goals, events, theme, onToggleTheme, onNewPriority],
  )

  const q = query.trim().toLowerCase()
  const results = useMemo(
    () =>
      q
        ? commands.filter((c) => `${c.label} ${c.hint ?? ''} ${c.group}`.toLowerCase().includes(q)).slice(0, 40)
        : commands.filter((c) => c.group === 'Go to' || c.group === 'Create'),
    [commands, q],
  )
  const groups = useMemo(() => {
    const map = new Map<string, Array<{ command: Command; index: number }>>()
    results.forEach((command, i) => {
      const list = map.get(command.group) ?? []
      list.push({ command, index: i })
      map.set(command.group, list)
    })
    return [...map.entries()]
  }, [results])

  useEffect(() => setIndex(0), [q])
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [index])

  const run = (command: Command | undefined) => {
    if (!command) return
    onClose()
    command.run()
  }

  return (
    <div>
      <div className="flex h-14 items-center gap-3 border-b border-line px-5">
        <Search size={16} strokeWidth={1.5} className="shrink-0 text-muted" />
        <input
          autoFocus
          className="inline-input text-title"
          placeholder="Search or jump to…"
          value={query}
          aria-label="Search"
          aria-controls="palette-results"
          aria-activedescendant={results[index] ? `cmd-${results[index].id}` : undefined}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setIndex((i) => Math.min(i + 1, results.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setIndex((i) => Math.max(i - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              run(results[index])
            }
          }}
        />
        <kbd className="kbd">Esc</kbd>
      </div>
      <div ref={listRef} id="palette-results" role="listbox" className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
        {groups.map(([group, items]) => (
          <div key={group} role="group" aria-label={group} className="pb-1">
            <p className="px-3 pt-2 pb-1 text-caption font-medium text-muted">{group}</p>
            {items.map(({ command, index: i }) => {
              const Icon = command.icon
              return (
                <button
                  key={command.id}
                  id={`cmd-${command.id}`}
                  type="button"
                  role="option"
                  aria-selected={i === index}
                  data-active={i === index}
                  className="palette-item"
                  onMouseMove={() => setIndex(i)}
                  onClick={() => run(command)}
                >
                  <Icon size={16} strokeWidth={1.5} className="shrink-0 text-tertiary" />
                  <span className="min-w-0 flex-1 truncate">{command.label}</span>
                  {command.hint && <span className="shrink-0 text-caption text-muted">{command.hint}</span>}
                </button>
              )
            })}
          </div>
        ))}
        {results.length === 0 && (
          <p className="px-3 py-10 text-center text-body text-muted">No results for “{query.trim()}”</p>
        )}
      </div>
    </div>
  )
}
