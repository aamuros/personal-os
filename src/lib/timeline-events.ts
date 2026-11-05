import { daysBetween, formatDate } from './date'
import type { EventKind, LifeEvent } from './types'

export type EventView = 'upcoming' | 'past'

export function formatEventDate(event: LifeEvent) {
  if (event.datePrecision === 'year') return `Around ${event.date.slice(0, 4)}`
  if (event.datePrecision === 'month') return `Around ${formatDate(event.date, { month: 'long', year: 'numeric' })}`
  return formatDate(event.date, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function splitTimelineEvents(events: LifeEvent[], today: string) {
  return {
    upcoming: events.filter((event) => event.date >= today).sort((a, b) => a.date.localeCompare(b.date)),
    past: events.filter((event) => event.date < today).sort((a, b) => b.date.localeCompare(a.date)),
  }
}

/** Preserve the chosen time direction, including the order of events on the same day. */
export function groupEventMonths(events: LifeEvent[]) {
  const groups = new Map<string, { month: string; events: LifeEvent[] }>()
  for (const event of events) {
    const month = event.date.slice(0, event.datePrecision === 'year' ? 4 : 7)
    if (!groups.has(month)) groups.set(month, { month, events: [] })
    groups.get(month)!.events.push(event)
  }
  return [...groups.values()]
}

export function summarizeEventYears(events: LifeEvent[]) {
  const years = new Map<string, { year: string; count: number; kinds: Record<EventKind, number> }>()
  for (const event of events) {
    const year = event.date.slice(0, 4)
    if (!years.has(year)) years.set(year, { year, count: 0, kinds: { milestone: 0, memory: 0, achievement: 0 } })
    const summary = years.get(year)!
    summary.count++
    summary.kinds[event.kind]++
  }
  return [...years.values()]
}

export function eventAge(date: string, birthDate: string) {
  return Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4)) - (date.slice(5) < birthDate.slice(5) ? 1 : 0)
}

export function eventRelative(date: string, today: string) {
  const delta = daysBetween(today, date)
  if (delta === 0) return 'Today'
  if (delta === 1) return 'Tomorrow'
  if (delta === -1) return 'Yesterday'
  const days = Math.abs(delta)
  const [value, unit] = days < 14 ? [days, 'day']
    : days < 70 ? [Math.round(days / 7), 'week']
    : days < 365 ? [Math.round(days / 30.44), 'month']
    : [Math.round(days / 365.25), 'year']
  const label = `${value} ${unit}${value === 1 ? '' : 's'}`
  return delta > 0 ? `in ${label}` : `${label} ago`
}
