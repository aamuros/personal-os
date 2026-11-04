import { addDays, daysBetween, fromKey, toKey } from "./date"
import type { Profile } from "./types"

export type TimelineUnit = "years" | "months" | "weeks"
export const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n))

export function timelineScale(profile: Profile, unit: TimelineUnit) {
  const birth = fromKey(profile.birthDate)
  const year = birth.getFullYear(),
    month = birth.getMonth()
  const date = (i: number): Date =>
    unit === "years"
      ? new Date(year + i, 0, 1)
      : unit === "months"
        ? new Date(year, month + i, 1)
        : fromKey(addDays(profile.birthDate, i * 7))
  const index = (d: Date) => {
    if (unit === "weeks") return daysBetween(profile.birthDate, toKey(d)) / 7
    if (unit === "months") {
      const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
      return (
        (d.getFullYear() - year) * 12 +
        d.getMonth() -
        month +
        (d.getDate() - 1) / days
      )
    }
    const start = new Date(d.getFullYear(), 0, 1),
      end = new Date(d.getFullYear() + 1, 0, 1)
    return (
      d.getFullYear() -
      year +
      (d.getTime() - start.getTime()) / (end.getTime() - start.getTime())
    )
  }
  return {
    date,
    index,
    max:
      unit === "years"
        ? profile.lifeExpectancy
        : profile.lifeExpectancy * (unit === "months" ? 12 : 52) - 1,
    row: unit === "years" ? 10 : unit === "months" ? 6 : 3,
    page: unit === "years" ? 10 : unit === "months" ? 12 : 52,
    last: unit === "years" ? 10 : unit === "months" ? 120 : 520,
    label(i: number) {
      const d = date(i)
      if (unit === "years")
        return d.getFullYear() % 10 === 0 ? String(d.getFullYear()) : null
      if (unit === "months")
        return d.getMonth() === 0 ? String(d.getFullYear()) : null
      return i > 0 && d.getFullYear() !== date(i - 1).getFullYear()
        ? String(d.getFullYear())
        : null
    },
  }
}

export function timelinePeriod(
  profile: Profile,
  unit: TimelineUnit,
  index: number,
) {
  const scale = timelineScale(profile, unit)
  return { start: toKey(scale.date(index)), end: toKey(scale.date(index + 1)) }
}

export function timelineRelative(delta: number, unit: TimelineUnit) {
  if (!delta) return "now"
  const n = Math.abs(delta),
    singular = unit.slice(0, -1)
  if (n === 1) return `${delta > 0 ? "next" : "last"} ${singular}`
  const days = n * { years: 365.25, months: 30.44, weeks: 7 }[unit]
  const text =
    days < 60
      ? `${Math.round(days / 7)} weeks`
      : days < 700
        ? `${Math.round(days / 30.44)} months`
        : `${Math.round(days / 365.25)} years`
  return delta > 0 ? `in ${text}` : `${text} ago`
}
