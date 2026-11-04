import { useSyncExternalStore } from 'react'
import { todayKey } from './date'
import { createSeed } from './seed'
import type {
  Goal,
  LifeArea,
  LifeEvent,
  Profile,
  Reflection,
  Session,
  State,
} from './types'

const STORAGE_KEY = 'lifeos:v1'
const PROFILE_SETUP_KEY = 'lifeos:profile-setup:2006-03-03'

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as State
      if (parsed?.version === 1) {
        // Apply the requested profile once, including to an existing saved dashboard.
        // Later edits in the life calendar remain editable and persist normally.
        if (!localStorage.getItem(PROFILE_SETUP_KEY)) {
          parsed.profile = { ...parsed.profile, birthDate: '2006-03-03' }
          parsed.events = parsed.events.map((event) =>
            event.id === 'e-1' && event.title === 'Born' && event.date === '1978-07-17'
              ? { ...event, date: '2006-03-03' }
              : event,
          )
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
            localStorage.setItem(PROFILE_SETUP_KEY, '1')
          } catch {
            /* storage full — preserve the saved dashboard in memory */
          }
        }
        return parsed
      }
    }
  } catch {
    /* corrupted or unavailable storage — fall back to the seed */
  }
  const initial = createSeed(todayKey())
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
    localStorage.setItem(PROFILE_SETUP_KEY, '1')
  } catch {
    /* storage unavailable — keep the requested profile in memory */
  }
  return initial
}

let state: State = load()
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Select a slice of state. Selectors must return existing references, not new objects. */
export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  )
}

function set(recipe: (s: State) => Partial<State>) {
  state = { ...state, ...recipe(state) }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* storage full or unavailable — keep working in memory */
  }
  listeners.forEach((listener) => listener())
}

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

/** Editing foundations counts as reviewing them. */
const reviewed = (s: State) => ({ profile: { ...s.profile, reviewedOn: todayKey() } })

const mapGoal = (s: State, id: string, fn: (g: Goal) => Goal) => ({
  goals: s.goals.map((g) => (g.id === id ? fn(g) : g)),
})

export type NewGoal = Omit<Goal, 'id' | 'status' | 'completedOn'>

export const actions = {
  // Priorities
  addPriority(title: string, time: string | undefined, date: string) {
    set((s) => ({ priorities: [...s.priorities, { id: uid(), title, time, date, done: false }] }))
  },
  togglePriority(id: string) {
    set((s) => ({
      priorities: s.priorities.map((p) => (p.id === id ? { ...p, done: !p.done } : p)),
    }))
  },
  removePriority(id: string) {
    set((s) => ({ priorities: s.priorities.filter((p) => p.id !== id) }))
  },

  // Habits
  addHabit(name: string) {
    set((s) => ({ habits: [...s.habits, { id: uid(), name, log: {} }] }))
  },
  removeHabit(id: string) {
    set((s) => ({ habits: s.habits.filter((h) => h.id !== id) }))
  },
  toggleHabit(id: string, date: string) {
    set((s) => ({
      habits: s.habits.map((h) => {
        if (h.id !== id) return h
        const log = { ...h.log }
        if (log[date]) delete log[date]
        else log[date] = true
        return { ...h, log }
      }),
    }))
  },

  // Goals
  addGoal(input: NewGoal): string {
    const id = uid()
    set((s) => ({ goals: [...s.goals, { ...input, id, status: 'active' }] }))
    return id
  },
  removeGoal(id: string) {
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }))
  },
  completeGoal(id: string) {
    set((s) => mapGoal(s, id, (g) => ({ ...g, status: 'completed', completedOn: todayKey() })))
  },
  reopenGoal(id: string) {
    set((s) => mapGoal(s, id, (g) => ({ ...g, status: 'active', completedOn: undefined })))
  },
  addMilestone(goalId: string, title: string) {
    set((s) =>
      mapGoal(s, goalId, (g) => ({
        ...g,
        milestones: [...g.milestones, { id: uid(), title, done: false }],
      })),
    )
  },
  toggleMilestone(goalId: string, milestoneId: string) {
    set((s) =>
      mapGoal(s, goalId, (g) => ({
        ...g,
        milestones: g.milestones.map((m) => (m.id === milestoneId ? { ...m, done: !m.done } : m)),
      })),
    )
  },
  removeMilestone(goalId: string, milestoneId: string) {
    set((s) =>
      mapGoal(s, goalId, (g) => ({
        ...g,
        milestones: g.milestones.filter((m) => m.id !== milestoneId),
      })),
    )
  },
  setMetric(goalId: string, current: number) {
    set((s) =>
      mapGoal(s, goalId, (g) =>
        g.metric
          ? { ...g, metric: { ...g.metric, current: Math.max(0, Math.min(g.metric.target, current)) } }
          : g,
      ),
    )
  },

  // Foundations
  addValue(name: string, description: string) {
    set((s) => ({ values: [...s.values, { id: uid(), name, description }], ...reviewed(s) }))
  },
  removeValue(id: string) {
    set((s) => ({ values: s.values.filter((v) => v.id !== id), ...reviewed(s) }))
  },
  moveValue(id: string, delta: -1 | 1) {
    set((s) => {
      const values = [...s.values]
      const from = values.findIndex((v) => v.id === id)
      const to = from + delta
      if (from < 0 || to < 0 || to >= values.length) return {}
      ;[values[from], values[to]] = [values[to], values[from]]
      return { values, ...reviewed(s) }
    })
  },
  addPrinciple(text: string) {
    set((s) => ({ principles: [...s.principles, { id: uid(), text }], ...reviewed(s) }))
  },
  removePrinciple(id: string) {
    set((s) => ({ principles: s.principles.filter((p) => p.id !== id), ...reviewed(s) }))
  },
  rateArea(id: string, field: keyof Pick<LifeArea, 'importance' | 'satisfaction'>, value: number) {
    set((s) => ({
      areas: s.areas.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
      ...reviewed(s),
    }))
  },
  markReviewed() {
    set(reviewed)
  },
  updateProfile(patch: Partial<Profile>) {
    set((s) => ({ profile: { ...s.profile, ...patch } }))
  },

  // Learning
  addSkill(name: string, targetHours: number) {
    set((s) => ({ skills: [...s.skills, { id: uid(), name, targetHours }] }))
  },
  removeSkill(id: string) {
    set((s) => ({ skills: s.skills.filter((k) => k.id !== id) }))
  },
  addSession(input: Omit<Session, 'id'>) {
    set((s) => ({ sessions: [{ ...input, id: uid() }, ...s.sessions] }))
  },
  removeSession(id: string) {
    set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) }))
  },

  // Reflections (one entry per day)
  saveReflection(input: Omit<Reflection, 'id'>) {
    set((s) => {
      const existing = s.reflections.find((r) => r.date === input.date)
      return {
        reflections: existing
          ? s.reflections.map((r) => (r.id === existing.id ? { ...existing, ...input } : r))
          : [{ ...input, id: uid() }, ...s.reflections],
      }
    })
  },
  removeReflection(id: string) {
    set((s) => ({ reflections: s.reflections.filter((r) => r.id !== id) }))
  },
  toggleReflectionAdjustment(id: string) {
    set((s) => ({
      reflections: s.reflections.map((r) =>
        r.id === id ? { ...r, adjustmentDone: !r.adjustmentDone } : r,
      ),
    }))
  },

  // Timeline
  addEvent(input: Omit<LifeEvent, 'id'>) {
    set((s) => ({ events: [...s.events, { ...input, id: uid() }] }))
  },
  removeEvent(id: string) {
    set((s) => ({ events: s.events.filter((e) => e.id !== id) }))
  },

  // Toolkit
  addPractice(exerciseId: string, date: string, answers: string[]) {
    set((s) => ({ practices: [{ id: uid(), exerciseId, date, answers }, ...s.practices] }))
  },
  removePractice(id: string) {
    set((s) => ({ practices: s.practices.filter((p) => p.id !== id) }))
  },
}
