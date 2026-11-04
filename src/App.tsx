import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import { CommandPalette } from './components/CommandPalette'
import { QuickAddDialog } from './components/QuickAdd'
import { Sidebar } from './components/Sidebar'
import { NAV } from './lib/nav'
import { useLocation, type Route } from './lib/router'
import { useTheme } from './lib/theme'
import Dashboard from './pages/Dashboard'
import Foundations from './pages/Foundations'
import Goals from './pages/Goals'
import Learning from './pages/Learning'
import LifeCalendar from './pages/LifeCalendar'
import Reflections from './pages/Reflections'
import Timeline from './pages/Timeline'
import Toolkit from './pages/Toolkit'

const PAGES: Record<Route, ComponentType> = {
  dashboard: Dashboard,
  foundations: Foundations,
  'life-calendar': LifeCalendar,
  goals: Goals,
  learning: Learning,
  reflections: Reflections,
  timeline: Timeline,
  toolkit: Toolkit,
}

export default function App() {
  const { route } = useLocation()
  const { theme, toggleTheme } = useTheme()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    document.title = route === 'dashboard' ? 'Life OS' : `${NAV[route].label} · Life OS`
    window.scrollTo({ top: 0 })
  }, [route])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const openQuickAdd = useCallback(() => setQuickAddOpen(true), [])
  const Page = PAGES[route]

  return (
    <div className="min-h-dvh">
      <button type="button" className="skip-link" onClick={() => mainRef.current?.focus()}>
        Skip to content
      </button>
      <Sidebar
        route={route}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSearch={() => setPaletteOpen(true)}
        onQuickAdd={openQuickAdd}
      />
      <main ref={mainRef} id="main" tabIndex={-1} className="main">
        <div className="panel">
          <div key={route} className="page-enter mx-auto w-full max-w-[1120px]">
            <Page />
          </div>
        </div>
      </main>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
        onNewPriority={openQuickAdd}
      />
      <QuickAddDialog open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </div>
  )
}
