import {
  BookOpen,
  Brain,
  Calendar,
  Clock,
  Compass,
  LayoutDashboard,
  NotebookPen,
  Target,
  type LucideIcon,
} from 'lucide-react'
import type { Route } from './router'

export const NAV: Record<Route, { label: string; icon: LucideIcon }> = {
  dashboard: { label: 'Dashboard', icon: LayoutDashboard },
  foundations: { label: 'Foundations', icon: Compass },
  'life-calendar': { label: 'Life Calendar', icon: Calendar },
  goals: { label: 'Goals', icon: Target },
  learning: { label: 'Learning', icon: BookOpen },
  reflections: { label: 'Reflections', icon: NotebookPen },
  timeline: { label: 'Timeline', icon: Clock },
  toolkit: { label: 'Toolkit', icon: Brain },
}

/** Sidebar groups follow the Understand → Plan → Act → Reflect → Adapt loop. */
export const NAV_GROUPS: Array<{ label?: string; items: Route[] }> = [
  { items: ['dashboard'] },
  { label: 'Understand', items: ['foundations', 'life-calendar'] },
  { label: 'Plan & act', items: ['goals', 'learning'] },
  { label: 'Reflect & adapt', items: ['reflections', 'timeline', 'toolkit'] },
]
