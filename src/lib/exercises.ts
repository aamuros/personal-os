import { Battery, Compass, Gauge, Lightbulb, Route, ShieldCheck, type LucideIcon } from 'lucide-react'

export type StepKind = 'text' | 'long' | 'scale' | 'value' | 'goal'

export interface ExerciseStep {
  prompt: string
  helper?: string
  placeholder?: string
  kind: StepKind
}

export interface Exercise {
  id: string
  title: string
  tagline: string
  icon: LucideIcon
  minutes: number
  steps: ExerciseStep[]
  summarize: (answers: string[]) => string
}

const lower = (text = '') => (text ? text.charAt(0).toLowerCase() + text.slice(1) : '')
const trimEnd = (text = '') => text.replace(/[.!?\s]+$/, '')

export const EXERCISES: Exercise[] = [
  {
    id: 'if-then',
    title: 'If-then plan',
    tagline: 'Turn an intention into a cue-based plan you don’t have to think about.',
    icon: Route,
    minutes: 3,
    steps: [
      { kind: 'text', prompt: 'What do you want to do more consistently?', placeholder: 'Go for a morning run' },
      {
        kind: 'text',
        prompt: 'When and where will you do it?',
        helper: 'Tie it to an existing cue — a time, a place, or something you already do.',
        placeholder: 'After my alarm on weekdays, before checking my phone',
      },
      { kind: 'text', prompt: 'What is most likely to get in the way?', placeholder: 'Feeling tired or it’s raining' },
      { kind: 'text', prompt: 'If that happens, what will you do instead?', placeholder: 'A 15-minute workout at home' },
    ],
    summarize: (a) =>
      `${trimEnd(a[0])} — ${lower(trimEnd(a[1]))}. If ${lower(trimEnd(a[2]))}: ${lower(trimEnd(a[3]))}.`,
  },
  {
    id: 'reframe',
    title: 'Reframe a thought',
    tagline: 'Loosen the grip of an unhelpful thought by looking at it from another angle.',
    icon: Lightbulb,
    minutes: 5,
    steps: [
      { kind: 'long', prompt: 'What happened?', helper: 'Describe the situation in plain, neutral terms.', placeholder: 'My advisor gave short, critical feedback…' },
      { kind: 'long', prompt: 'What thought showed up?', placeholder: 'I’m not cut out for this.' },
      {
        kind: 'long',
        prompt: 'What supports that thought — and what doesn’t?',
        helper: 'Look for facts on both sides, as a fair friend would.',
      },
      { kind: 'long', prompt: 'What is a more balanced way to see it?', placeholder: 'The feedback is about the draft, not about me…' },
    ],
    summarize: (a) => a[3],
  },
  {
    id: 'friction',
    title: 'Friction audit',
    tagline: 'Make the habits you want easier and the ones you don’t a little harder.',
    icon: Gauge,
    minutes: 4,
    steps: [
      { kind: 'text', prompt: 'Which habit do you want to make easier?', placeholder: 'Reading before bed' },
      { kind: 'text', prompt: 'How could you remove a step or make it more visible?', placeholder: 'Leave the book on my pillow' },
      { kind: 'text', prompt: 'Which habit do you want to do less?', placeholder: 'Scrolling in bed' },
      { kind: 'text', prompt: 'How could you add friction to it?', placeholder: 'Charge my phone in the kitchen' },
    ],
    summarize: (a) => `Easier: ${lower(trimEnd(a[1]))}. Harder: ${lower(trimEnd(a[3]))}.`,
  },
  {
    id: 'values-check',
    title: 'Values check-in',
    tagline: 'See how closely last week matched what you say matters most.',
    icon: Compass,
    minutes: 3,
    steps: [
      { kind: 'value', prompt: 'Which value do you want to check in on?' },
      { kind: 'scale', prompt: 'How well did last week reflect it?', helper: '1 means not at all, 5 means fully.' },
      { kind: 'long', prompt: 'What is one small action that would honor it this week?', placeholder: 'Call Lea on Thursday instead of texting' },
    ],
    summarize: (a) => `${a[0]} · ${a[1]}/5 — next: ${lower(trimEnd(a[2]))}.`,
  },
  {
    id: 'energy',
    title: 'Energy audit',
    tagline: 'Notice what fuels you and what drains you, then adjust one thing.',
    icon: Battery,
    minutes: 4,
    steps: [
      { kind: 'long', prompt: 'What gave you energy this week?', placeholder: 'Morning runs, dinner with friends…' },
      { kind: 'long', prompt: 'What drained it?', placeholder: 'Back-to-back meetings, late nights…' },
      { kind: 'text', prompt: 'What is one change you could make next week?', placeholder: 'Keep Wednesday afternoons meeting-free' },
    ],
    summarize: (a) => `Change: ${lower(trimEnd(a[2]))}.`,
  },
  {
    id: 'premortem',
    title: 'Pre-mortem',
    tagline: 'Imagine a goal didn’t happen, work out why, and prevent it now.',
    icon: ShieldCheck,
    minutes: 5,
    steps: [
      { kind: 'goal', prompt: 'Which goal are you thinking about?' },
      {
        kind: 'long',
        prompt: 'It’s the deadline and the goal didn’t happen. What went wrong?',
        helper: 'Be specific — the most likely reasons, not the most dramatic.',
      },
      { kind: 'long', prompt: 'What can you do now to prevent that?', placeholder: 'Book the time in my calendar today' },
    ],
    summarize: (a) => `${a[0]} — prevent it by: ${lower(trimEnd(a[2]))}.`,
  },
]

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e]),
)
