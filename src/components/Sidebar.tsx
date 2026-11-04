import { Moon, Plus, Search, Sun } from 'lucide-react'
import { NAV, NAV_GROUPS } from '../lib/nav'
import type { Route } from '../lib/router'
import { useStore } from '../lib/store'
import type { Theme } from '../lib/theme'
import { Logo, ic } from './ui'

export function Sidebar({
  route,
  theme,
  onToggleTheme,
  onSearch,
  onQuickAdd,
}: {
  route: Route
  theme: Theme
  onToggleTheme: () => void
  onSearch: () => void
  onQuickAdd: () => void
}) {
  const name = useStore((s) => s.profile.name)
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const themeLabel = theme === 'dark' ? 'Switch to light appearance' : 'Switch to dark appearance'
  const ThemeIcon = theme === 'dark' ? Sun : Moon

  return (
    <aside className="sidebar" aria-label="Sidebar">
      <div className="flex items-center justify-between gap-2">
        <a href="#dashboard" className="brand -ml-1.5 md:ml-0">
          <Logo />
          <span>Life OS</span>
        </a>
        <div className="flex items-center gap-0.5">
          <button type="button" className="icon-btn md:hidden" aria-label="Search" onClick={onSearch}>
            <Search {...ic} />
          </button>
          <button type="button" className="icon-btn md:hidden" aria-label={themeLabel} onClick={onToggleTheme}>
            <ThemeIcon {...ic} />
          </button>
          <button
            type="button"
            className="icon-btn bg-wash"
            aria-label="New priority"
            title="New priority"
            onClick={onQuickAdd}
          >
            <Plus {...ic} />
          </button>
        </div>
      </div>

      <button type="button" className="search-trigger mt-3 hidden md:flex" onClick={onSearch}>
        <Search size={14} strokeWidth={1.75} />
        <span className="flex-1 text-left">Search</span>
        <kbd className="kbd">⌘K</kbd>
      </button>

      <nav className="nav md:mt-3" aria-label="Primary">
        {NAV_GROUPS.map((group, i) => (
          <div key={group.label ?? i} className="nav-group">
            {group.label && <p className="nav-label">{group.label}</p>}
            {group.items.map((id) => {
              const { label, icon: Icon } = NAV[id]
              return (
                <a key={id} href={`#${id}`} className="nav-link" aria-current={route === id ? 'page' : undefined}>
                  <Icon {...ic} />
                  <span>{label}</span>
                </a>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto hidden items-center justify-between py-1.5 pl-2 md:flex">
        <span className="flex min-w-0 items-center gap-2 text-label font-medium text-secondary">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-strong text-micro text-fg">
            {initials}
          </span>
          <span className="truncate">{name.split(' ')[0]}</span>
        </span>
        <button type="button" className="icon-btn" aria-label={themeLabel} title={themeLabel} onClick={onToggleTheme}>
          <ThemeIcon {...ic} />
        </button>
      </div>
    </aside>
  )
}
