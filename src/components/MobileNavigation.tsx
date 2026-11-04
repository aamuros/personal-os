import { useEffect, useId, useRef, useState } from 'react'
import { Moon, Sun, X } from 'lucide-react'
import { NAV, NAV_GROUPS } from '../lib/nav'
import type { Route } from '../lib/router'
import { useStore } from '../lib/store'
import type { ThemePreference } from '../lib/theme'

const PRIMARY_ROUTES = NAV_GROUPS.flatMap((group) => group.items).filter((id) => id !== 'toolkit')
const APPEARANCES = ['light', 'dark', 'system'] as const

export function MobileNavigation({ route, appearance, onAppearanceChange }: {
  route: Route
  appearance: ThemePreference
  onAppearanceChange: (appearance: ThemePreference) => void
}) {
  const name = useStore((s) => s.profile.name)
  const initials = name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const dialogId = useId()
  const titleId = useId()

  useEffect(() => setOpen(false), [route])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!open) {
      if (dialog.open) dialog.close()
      return
    }

    const desktop = window.matchMedia('(min-width: 821px)')
    if (desktop.matches) {
      setOpen(false)
      return
    }

    if (!dialog.open) dialog.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onResize = () => { if (desktop.matches) setOpen(false) }
    desktop.addEventListener('change', onResize)
    return () => {
      document.body.style.overflow = previousOverflow
      desktop.removeEventListener('change', onResize)
      if (dialog.open) dialog.close()
    }
  }, [open])

  const navigationLink = (id: Route) => {
    const { icon: Icon, label } = NAV[id]
    return (
      <a key={id} href={`#${id}`} className="mobile-nav-link" aria-current={route === id ? 'page' : undefined} onClick={() => setOpen(false)}>
        <Icon size={23} strokeWidth={1.6} aria-hidden="true" />
        <span>{label}</span>
      </a>
    )
  }

  return (
    <>
      <header className="mobile-header">
        <button type="button" className="mobile-icon-button mobile-profile-button" aria-label={`Open navigation for ${name}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={dialogId} onClick={() => setOpen(true)}>
          <span className="mobile-avatar" aria-hidden="true">{initials}</span>
        </button>
        <a href="#dashboard" className="mobile-wordmark" aria-label="Life OS home">Life OS</a>
        <button type="button" className="mobile-icon-button mobile-menu-button" aria-label="Open navigation" aria-haspopup="dialog" aria-expanded={open} aria-controls={dialogId} onClick={() => setOpen(true)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 8h16M12 15h8" /></svg>
        </button>
      </header>

      <dialog ref={dialogRef} id={dialogId} className="mobile-drawer" aria-labelledby={titleId} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect()
        if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) setOpen(false)
      }}>
        <div className="mobile-drawer-header">
          <h2 id={titleId} className="mobile-wordmark">Life OS<span className="sr-only"> navigation</span></h2>
          <button autoFocus type="button" className="mobile-icon-button mobile-close-button" aria-label="Close navigation" onClick={() => setOpen(false)}><X size={23} strokeWidth={1.6} aria-hidden="true" /></button>
        </div>

        <nav className="mobile-drawer-nav" aria-label="Primary">
          {PRIMARY_ROUTES.map(navigationLink)}
        </nav>

        <div className="mobile-drawer-footer">
          {navigationLink('toolkit')}
          <div className="mobile-drawer-profile">
            <span className="mobile-avatar" aria-hidden="true">{initials}</span>
            <span className="mobile-profile-name">{name}</span>
            <span className="mobile-profile-caption">Personal</span>
          </div>
          <div className="mobile-appearance" role="group" aria-label="Appearance">
            {APPEARANCES.map((value) => (
              <button key={value} type="button" aria-label={`${value[0].toUpperCase()}${value.slice(1)} appearance`} aria-pressed={appearance === value} title={`${value[0].toUpperCase()}${value.slice(1)} appearance`} onClick={() => onAppearanceChange(value)}>
                {value === 'light' ? <Sun size={18} strokeWidth={1.5} aria-hidden="true" /> : value === 'dark' ? <Moon size={18} strokeWidth={1.5} aria-hidden="true" /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17" /></svg>}
              </button>
            ))}
          </div>
        </div>
      </dialog>
    </>
  )
}
