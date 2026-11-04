const DAY_MS = 86_400_000

/** Dates are stored as local calendar keys (YYYY-MM-DD) to avoid timezone drift. */
export function toKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayKey = () => toKey(new Date())

export function addDays(key: string, days: number): string {
  const date = fromKey(key)
  date.setDate(date.getDate() + days)
  return toKey(date)
}

/** Whole days from `a` to `b` (positive when `b` is later). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / DAY_MS)
}

const formatters = new Map<string, Intl.DateTimeFormat>()

export function formatDate(key: string, options: Intl.DateTimeFormatOptions): string {
  const id = JSON.stringify(options)
  let formatter = formatters.get(id)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', options)
    formatters.set(id, formatter)
  }
  return formatter.format(fromKey(key))
}

export const shortDate = (key: string) => formatDate(key, { month: 'short', day: 'numeric' })
export const monthYear = (key: string) => formatDate(key, { month: 'short', year: 'numeric' })
export const longDate = (key: string) =>
  formatDate(key, { weekday: 'long', month: 'long', day: 'numeric' })

/** "Today", "Yesterday", "3 days ago", "Oct 28", "Oct 28, 2024". */
export function relativeDay(key: string, today: string): string {
  const diff = daysBetween(key, today)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff > 1 && diff < 7) return `${diff} days ago`
  return key.slice(0, 4) === today.slice(0, 4)
    ? shortDate(key)
    : formatDate(key, { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Same as relativeDay, phrased to follow a verb: "reviewed today", "reviewed on Oct 28". */
export function sincePhrase(key: string, today: string): string {
  const label = relativeDay(key, today)
  return /^\d|^[TY]/.test(label) ? label.toLowerCase() : `on ${label}`
}

/** "in 3 days", "in 6 weeks", "in 4 months". */
export function untilPhrase(key: string, today: string): string {
  const days = daysBetween(today, key)
  if (days <= 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days < 14) return `in ${days} days`
  if (days < 120) return `in ${Math.round(days / 7)} weeks`
  return `in ${Math.round(days / 30.4)} months`
}

/** "09:00" -> "9:00" (matches the original Life OS time style). */
export function formatTime(time: string): string {
  const [h, m] = time.split(':')
  return `${Number(h)}:${m}`
}
