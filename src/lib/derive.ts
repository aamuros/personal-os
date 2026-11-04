import { addDays, daysBetween, fromKey } from './date'
import type { Goal, Habit, Profile, Session } from './types'

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? one : many}`
}

export function habitStreak(habit: Habit, today: string): number {
  let day = habit.log[today] ? today : addDays(today, -1)
  let streak = 0
  while (habit.log[day]) {
    streak++
    day = addDays(day, -1)
  }
  return streak
}

export function goalProgress(goal: Goal): number {
  if (goal.status === 'completed') return 1
  if (goal.metric) {
    return goal.metric.target > 0 ? Math.min(1, goal.metric.current / goal.metric.target) : 0
  }
  if (goal.milestones.length === 0) return 0
  return goal.milestones.filter((m) => m.done).length / goal.milestones.length
}

export type Pace = 'complete' | 'on-track' | 'behind' | 'overdue'

/** Compares actual progress with how far through the goal's window we are. */
export function goalPace(goal: Goal, today: string): Pace {
  if (goal.status === 'completed') return 'complete'
  if (daysBetween(today, goal.due) < 0) return 'overdue'
  const total = Math.max(1, daysBetween(goal.start, goal.due))
  const expected = Math.min(1, Math.max(0, daysBetween(goal.start, today) / total))
  return goalProgress(goal) + 0.15 < expected ? 'behind' : 'on-track'
}

export const paceLabel: Record<Pace, string> = {
  complete: 'Completed',
  'on-track': 'On track',
  behind: 'Behind pace',
  overdue: 'Overdue',
}

export function lifeStats(profile: Profile, today: string) {
  const totalWeeks = profile.lifeExpectancy * 52
  const days = Math.max(0, daysBetween(profile.birthDate, today))
  const current = Math.min(Math.floor(days / 7), totalWeeks - 1)
  const weekNumber = current + 1

  const birth = fromKey(profile.birthDate)
  const now = fromKey(today)
  let age = now.getFullYear() - birth.getFullYear()
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  if (beforeBirthday) age--
  const lastBirthday = `${birth.getFullYear() + age}${profile.birthDate.slice(4)}`

  return {
    totalWeeks,
    current,
    weekNumber,
    weeksLeft: Math.max(0, totalWeeks - weekNumber),
    pct: weekNumber / totalWeeks,
    age: Math.max(0, age),
    weeksSinceBirthday: Math.max(0, Math.floor(daysBetween(lastBirthday, today) / 7)),
  }
}

export function minutesByDay(sessions: Session[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const s of sessions) map[s.date] = (map[s.date] ?? 0) + s.minutes
  return map
}

export function sumMinutes(byDay: Record<string, number>, from: string, to: string): number {
  let total = 0
  for (let day = from; day <= to; day = addDays(day, 1)) total += byDay[day] ?? 0
  return total
}

export function dayStreak(byDay: Record<string, number>, today: string): number {
  let day = byDay[today] ? today : addDays(today, -1)
  let streak = 0
  while (byDay[day]) {
    streak++
    day = addDays(day, -1)
  }
  return streak
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export function formatHours(minutes: number): string {
  const hours = minutes / 60
  if (hours === 0) return '0h'
  return `${hours < 10 ? hours.toFixed(1).replace(/\.0$/, '') : Math.round(hours)}h`
}

export const MOODS = [
  { value: 1, label: 'Drained' },
  { value: 2, label: 'Low' },
  { value: 3, label: 'Steady' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Great' },
] as const

export function moodLabel(mood: number): string {
  return MOODS.find((m) => m.value === Math.round(mood))?.label ?? '—'
}
