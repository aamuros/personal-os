import { useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'
export type ThemePreference = Theme | 'system'

const STORAGE_KEY = 'lifeos:theme'

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
    } catch { /* storage unavailable */ }
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
  })
  const [systemTheme, setSystemTheme] = useState<Theme>(() =>
    window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark',
  )
  const theme = preference === 'system' ? systemTheme : preference

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const syncTheme = () => setSystemTheme(media.matches ? 'light' : 'dark')
    syncTheme()
    media.addEventListener('change', syncTheme)
    return () => media.removeEventListener('change', syncTheme)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#000000' : '#f0f0f0')
    try {
      localStorage.setItem(STORAGE_KEY, preference)
    } catch {
      /* storage unavailable */
    }
  }, [theme, preference])

  const toggleTheme = useCallback(() => setPreference(theme === 'dark' ? 'light' : 'dark'), [theme])
  return { theme, toggleTheme, preference, setPreference }
}
