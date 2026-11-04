import type { CSSProperties, ReactNode } from 'react'
import { Sun, PanelLeft } from 'lucide-react'
import { NAV, NAV_GROUPS } from '../lib/nav'
import type { Route } from '../lib/router'
import { useStore } from '../lib/store'
import type { Theme } from '../lib/theme'

const ICONS: Record<Route, ReactNode> = {
  'dashboard': <svg className="rail-svg" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7.5" height="9" rx="2.5"/><rect x="13.5" y="3" width="7.5" height="5.5" rx="2.5"/><rect x="13.5" y="11.5" width="7.5" height="9.5" rx="2.5"/><rect x="3" y="15.5" width="7.5" height="5.5" rx="2.5"/></svg>,
  'foundations': <svg className="rail-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/></svg>,
  'life-calendar': <svg className="rail-svg" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16.5" rx="4"/><path d="M3 10h18M8 2.5v4M16 2.5v4"/></svg>,
  'goals': <svg className="rail-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/></svg>,
  'learning': <svg className="rail-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v12c0-3.3-2.7-6-6-6H3V4c0-.5.5-1 1-1h2c3.3 0 6 2.7 6 6Z"/><path d="M12 9v12c0-3.3 2.7-6 6-6h3V4c0-.5-.5-1-1-1h-2c-3.3 0-6 2.7-6 6Z"/></svg>,
  'reflections': <svg className="rail-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8.5 8.5 0 0 1-12.4 7.5L3 21l1.5-5.4A8.5 8.5 0 1 1 21 12Z"/></svg>,
  'timeline': <svg className="rail-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  'toolkit': <svg className="rail-svg" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="4"/><path d="M8.5 7V5.5A2.5 2.5 0 0 1 11 3h2a2.5 2.5 0 0 1 2.5 2.5V7M3 13h18"/></svg>,
}

export function Sidebar({ route, theme, onToggleTheme, collapsed, onToggleCollapsed }: {
  route: Route
  theme: Theme
  onToggleTheme: () => void
  collapsed: boolean
  onToggleCollapsed: () => void
}) {
  const name = useStore((s) => s.profile.name)
  const initials = name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const toggleLabel = collapsed ? 'Expand sidebar' : 'Collapse sidebar'
  const toggle = () => {
    if (window.matchMedia('(min-width: 821px)').matches) onToggleCollapsed()
  }
  return <aside className="sidebar" aria-label="Sidebar" onClick={(event) => {
    if (!(event.target as HTMLElement).closest('a,button')) toggle()
  }}>
    <div className="rail-header">
      <button className="rail-item rail-brand" type="button" onClick={toggle} aria-label={toggleLabel} aria-expanded={!collapsed} aria-controls="primary-navigation">
        <span className="rail-icon"><i className="rail-mark" aria-hidden="true" /></span><span className="rail-label">Life OS</span>
      </button>
      <button className="rail-toggle" type="button" onClick={toggle} aria-label={toggleLabel} aria-expanded={!collapsed} aria-controls="primary-navigation"><PanelLeft className="rail-svg" aria-hidden="true" /></button>
    </div>
    <nav id="primary-navigation" className="rail-nav" aria-label="Primary">
      {NAV_GROUPS.flatMap((group) => group.items).map((id, index) => <a key={id} href={`#${id}`} className="rail-item" aria-current={route === id ? 'page' : undefined} aria-label={NAV[id].label} title={collapsed ? NAV[id].label : undefined} style={{ '--rail-order': index } as CSSProperties}>
        <span className="rail-icon">{ICONS[id]}</span><span className="rail-label">{NAV[id].label}</span>
      </a>)}
    </nav>
    <div className="rail-footer">
      <button className="rail-item" type="button" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Switch to light appearance' : 'Switch to dark appearance'} title="Appearance" style={{ '--rail-order': 8 } as CSSProperties}>
        <span className="rail-icon"><Sun className="rail-svg" aria-hidden="true" /></span><span className="rail-label">Appearance</span>
      </button>
      <div className="rail-item rail-profile" title={name} style={{ '--rail-order': 9 } as CSSProperties}>
        <span className="rail-icon"><span className="rail-avatar">{initials}</span></span><span className="rail-label">{name.split(' ')[0]}</span>
      </div>
    </div>
  </aside>
}
