export type ID = string

export interface Profile {
  name: string
  birthDate: string
  lifeExpectancy: number
  /** Last time the guiding foundations were reviewed (YYYY-MM-DD). */
  reviewedOn?: string
}

export interface Priority {
  id: ID
  title: string
  time?: string
  done: boolean
  date: string
}

export interface Habit {
  id: ID
  name: string
  log: Record<string, boolean>
}

export interface Milestone {
  id: ID
  title: string
  done: boolean
}

export type GoalStatus = 'active' | 'completed'

export interface Goal {
  id: ID
  title: string
  why: string
  valueId?: ID
  start: string
  due: string
  status: GoalStatus
  completedOn?: string
  milestones: Milestone[]
  metric?: { current: number; target: number; unit: string }
}

export interface Value {
  id: ID
  name: string
  description: string
}

export interface Principle {
  id: ID
  text: string
}

export interface LifeArea {
  id: ID
  name: string
  importance: number
  satisfaction: number
}

export interface Skill {
  id: ID
  name: string
  targetHours: number
}

export interface Session {
  id: ID
  skillId: ID
  date: string
  minutes: number
  note?: string
}

export interface Reflection {
  id: ID
  date: string
  mood: number
  wentWell: string
  drained: string
  adjust: string
  tags: string[]
  adjustmentDone?: boolean
}

export type EventKind = 'milestone' | 'memory' | 'achievement'

export interface LifeEvent {
  id: ID
  /** Start of the known period for sorting; omit the day/month in UI when approximate. */
  date: string
  datePrecision?: 'year' | 'month'
  title: string
  kind: EventKind
  note?: string
}

export interface AutobiographySection {
  id: ID
  title: string
  period: string
  body: string
}

export interface Practice {
  id: ID
  exerciseId: string
  date: string
  answers: string[]
}

export interface State {
  version: 1
  profile: Profile
  priorities: Priority[]
  habits: Habit[]
  goals: Goal[]
  values: Value[]
  seedValuesRemoved?: true
  principles: Principle[]
  areas: LifeArea[]
  skills: Skill[]
  sessions: Session[]
  reflections: Reflection[]
  events: LifeEvent[]
  timelineAutobiographyVersion?: 1
  autobiography: AutobiographySection[]
  practices: Practice[]
}
