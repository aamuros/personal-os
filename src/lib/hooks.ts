import { useEffect, useState } from 'react'
import { todayKey } from './date'

/** Current local date key; rolls over at midnight without a reload. */
export function useToday(): string {
  const [today, setToday] = useState(todayKey)
  useEffect(() => {
    const id = window.setInterval(() => setToday(todayKey()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return today
}
