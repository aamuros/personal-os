import { useMemo, useSyncExternalStore } from 'react'

export const ROUTES = [
  'dashboard',
  'foundations',
  'life-calendar',
  'goals',
  'learning',
  'reflections',
  'timeline',
  'toolkit',
] as const

export type Route = (typeof ROUTES)[number]

export interface Location {
  route: Route
  param?: string
}

function parse(hash: string): Location {
  const [route, param] = hash.replace(/^#\/?/, '').split('/')
  if (!(ROUTES as readonly string[]).includes(route)) return { route: 'dashboard' }
  return { route: route as Route, param: param ? decodeURIComponent(param) : undefined }
}

function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

export function useLocation(): Location {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => '')
  return useMemo(() => parse(hash), [hash])
}

export function navigate(route: Route, param?: string) {
  window.location.hash = param ? `${route}/${encodeURIComponent(param)}` : route
}

/** Drop a one-shot param (e.g. `#goals/new`) without adding a history entry. */
export function clearParam(route: Route) {
  window.history.replaceState(null, '', `#${route}`)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}
