import { addDays } from './date'
import type { Goal, Habit, LifeEvent, Reflection, Session, State } from './types'

/** Small deterministic PRNG so the demo history is stable between resets. */
function createRandom(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createSeed(today: string): State {
  const random = createRandom(20261103)
  const year = Number(today.slice(0, 4))
  const birthYear = 1978
  const birthDate = '1978-07-17'
  const atAge = (age: number, monthDay: string) => `${birthYear + age}-${monthDay}`
  const ago = (days: number) => addDays(today, -days)
  const ahead = (days: number) => addDays(today, days)

  const habitSpecs = [
    { id: 'h-run', name: 'Morning run', doneToday: false, streak: 6, rate: 0.6 },
    { id: 'h-read', name: 'Read 20 pages', doneToday: false, streak: 3, rate: 0.75 },
    { id: 'h-deep', name: 'Deep work 2h', doneToday: false, streak: 2, rate: 0.6 },
    { id: 'h-journal', name: 'Journal', doneToday: true, streak: 21, rate: 0.85 },
    { id: 'h-learning', name: 'Learning', doneToday: true, streak: 12, rate: 0.8 },
  ]
  const habits: Habit[] = habitSpecs.map(({ id, name, doneToday, streak, rate }) => {
    const log: Record<string, boolean> = {}
    const first = doneToday ? 0 : 1
    for (let i = 0; i < streak; i++) log[ago(first + i)] = true
    // The day before the streak is a miss; earlier history is irregular.
    for (let i = first + streak + 1; i < 60; i++) if (random() < rate) log[ago(i)] = true
    return { id, name, log }
  })

  const skills = [
    { id: 's-design', name: 'Design systems', targetHours: 120 },
    { id: 's-spanish', name: 'Spanish', targetHours: 150 },
    { id: 's-stats', name: 'Statistics', targetHours: 60 },
    { id: 's-writing', name: 'Writing', targetHours: 50 },
  ]
  const weights = [0.36, 0.3, 0.2, 0.14]
  const durations = [25, 30, 45, 45, 60, 60, 90]
  const recentNotes = [
    'Token naming and semantic layers',
    'Subjunctive mood drills',
    'Confidence intervals, problem set 4',
    'Drafted essay on slow productivity',
    'Component API review',
    'Podcast + shadowing practice',
    'Bayesian intuition chapter',
    'Auditing spacing scale',
  ]
  const pickSkill = () => {
    let r = random()
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i]
      if (r <= 0) return skills[i].id
    }
    return skills[0].id
  }
  const sessions: Session[] = []
  for (let i = 0; i < 365; i++) {
    const chance = i < 12 ? 1 : i === 12 ? 0 : i < 90 ? 0.62 : 0.42
    if (random() >= chance) continue
    sessions.push({
      id: `ses-${i}`,
      skillId: pickSkill(),
      date: ago(i),
      minutes: durations[Math.floor(random() * durations.length)],
      note: recentNotes[i],
    })
    if (random() < 0.12) {
      sessions.push({ id: `ses-${i}b`, skillId: pickSkill(), date: ago(i), minutes: 25 })
    }
  }

  const goals: Goal[] = [
    {
      id: 'g-portfolio',
      title: 'Ship portfolio site',
      why: 'Show the work I’m proud of and open doors to the design roles I want.',
      valueId: 'v-craft',
      start: ago(64),
      due: ahead(40),
      status: 'active',
      milestones: [
        { id: 'm-1', title: 'Pick four case studies', done: true },
        { id: 'm-2', title: 'Write case study drafts', done: true },
        { id: 'm-3', title: 'Design homepage and layout', done: true },
        { id: 'm-4', title: 'Build and polish in code', done: false },
        { id: 'm-5', title: 'Launch and share with five people', done: false },
      ],
    },
    {
      id: 'g-thesis',
      title: 'Submit master’s thesis',
      why: 'Close this chapter with work I can stand behind.',
      valueId: 'v-craft',
      start: ago(200),
      due: ahead(44),
      status: 'active',
      milestones: [
        { id: 'm-6', title: 'Research question approved', done: true },
        { id: 'm-7', title: 'Literature review', done: true },
        { id: 'm-8', title: 'Run user studies', done: true },
        { id: 'm-9', title: 'Analyze findings', done: true },
        { id: 'm-10', title: 'Write chapters 1–3', done: true },
        { id: 'm-11', title: 'Write chapters 4–5', done: false },
        { id: 'm-12', title: 'Final edit and submit', done: false },
      ],
    },
    {
      id: 'g-books',
      title: 'Read 24 books this year',
      why: 'Reading widely is how I stay curious and think more clearly.',
      valueId: 'v-curiosity',
      start: `${year}-01-01`,
      due: `${year}-12-31`,
      status: 'active',
      milestones: [],
      metric: { current: 14, target: 24, unit: 'books' },
    },
    {
      id: 'g-half',
      title: 'Run a half marathon',
      why: 'Prove to myself that small, consistent efforts add up.',
      valueId: 'v-health',
      start: ago(95),
      due: ahead(131),
      status: 'active',
      milestones: [
        { id: 'm-13', title: 'Run 5K without stopping', done: true },
        { id: 'm-14', title: 'Run 10K', done: true },
        { id: 'm-15', title: 'Run 15K', done: false },
        { id: 'm-16', title: 'Run 18K', done: false },
        { id: 'm-17', title: 'Race day', done: false },
      ],
    },
    {
      id: 'g-course',
      title: 'Complete design systems course',
      why: 'Build a solid foundation for the work I want to do next.',
      valueId: 'v-curiosity',
      start: ago(150),
      due: ago(55),
      status: 'completed',
      completedOn: ago(60),
      milestones: [
        { id: 'm-18', title: 'Foundations module', done: true },
        { id: 'm-19', title: 'Tokens and theming', done: true },
        { id: 'm-20', title: 'Final project', done: true },
      ],
    },
    {
      id: 'g-home',
      title: 'Find a calmer place to live',
      why: 'A quiet home makes it easier to rest and focus.',
      valueId: 'v-calm',
      start: ago(240),
      due: ago(150),
      status: 'completed',
      completedOn: ago(156),
      milestones: [
        { id: 'm-21', title: 'Set a budget', done: true },
        { id: 'm-22', title: 'Visit ten apartments', done: true },
        { id: 'm-23', title: 'Sign the lease', done: true },
      ],
    },
  ]

  const reflectionSeeds: Array<Omit<Reflection, 'id' | 'date'> & { daysAgo: number }> = [
    {
      daysAgo: 1,
      mood: 4,
      tags: ['Work', 'Learning'],
      wentWell: 'Outlined the last two thesis chapters. Felt focused all morning.',
      drained: 'Constant small interruptions after lunch.',
      adjust: 'Turn notifications off until noon.',
    },
    {
      daysAgo: 2,
      mood: 3,
      tags: ['Health'],
      wentWell: 'Got the run in despite the rain.',
      drained: 'Slept badly and felt foggy in the afternoon.',
      adjust: 'Screens off by 22:30.',
    },
    {
      daysAgo: 3,
      mood: 5,
      tags: ['Relationships', 'Rest'],
      wentWell: 'Long dinner with Sam and Lea. Laughed a lot.',
      drained: 'Nothing much — a genuinely good day.',
      adjust: 'Plan one unhurried evening every week.',
    },
    {
      daysAgo: 5,
      mood: 2,
      tags: ['Work'],
      wentWell: 'Shipped the component review, even if late.',
      drained: 'Overcommitted and rushed everything.',
      adjust: 'Cap my daily priorities at three.',
    },
    {
      daysAgo: 6,
      mood: 4,
      tags: ['Learning', 'Creativity'],
      wentWell: 'Spanish conversation practice felt natural for the first time.',
      drained: 'An hour of scrolling before bed.',
      adjust: 'Charge my phone outside the bedroom.',
    },
    {
      daysAgo: 8,
      mood: 3,
      tags: ['Work', 'Health'],
      wentWell: 'Protected a deep work block before meetings.',
      drained: 'Skipped lunch and crashed at 3pm.',
      adjust: 'Block a real lunch break.',
    },
    {
      daysAgo: 9,
      mood: 4,
      tags: ['Health', 'Rest'],
      wentWell: 'Easy long run along the river.',
      drained: 'Chores piled up.',
      adjust: 'Do a 15-minute reset each evening.',
    },
    {
      daysAgo: 11,
      mood: 3,
      tags: ['Learning'],
      wentWell: 'Statistics finally clicked — confidence intervals make sense.',
      drained: 'Comparing my progress to classmates.',
      adjust: 'Measure against last month, not other people.',
    },
    {
      daysAgo: 12,
      mood: 5,
      tags: ['Creativity', 'Relationships'],
      wentWell: 'Sketched portfolio ideas with Mom over a video call.',
      drained: 'Late start to the day.',
      adjust: 'Lay out clothes the night before.',
    },
    {
      daysAgo: 13,
      mood: 2,
      tags: ['Work'],
      wentWell: 'Asked for help instead of struggling alone.',
      drained: 'Vague feedback on my thesis draft.',
      adjust: 'Ask for specific examples when feedback is unclear.',
    },
  ]
  const reflections: Reflection[] = reflectionSeeds.map(({ daysAgo, ...rest }, i) => ({
    id: `r-${i}`,
    date: ago(daysAgo),
    ...rest,
  }))

  const events: LifeEvent[] = [
    { id: 'e-1', date: birthDate, title: 'Born', kind: 'milestone', note: 'Week one on the calendar.' },
    { id: 'e-2', date: atAge(7, '09-15'), title: 'First piano lesson', kind: 'memory' },
    {
      id: 'e-3',
      date: atAge(12, '07-20'),
      title: 'Family road trip along the coast',
      kind: 'memory',
      note: 'Two weeks, one tent, far too many card games.',
    },
    { id: 'e-4', date: atAge(18, '06-28'), title: 'Graduated high school', kind: 'milestone' },
    {
      id: 'e-5',
      date: atAge(18, '09-16'),
      title: 'Started university',
      kind: 'milestone',
      note: 'BA in Interaction Design.',
    },
    { id: 'e-6', date: atAge(20, '07-05'), title: 'First design internship', kind: 'achievement' },
    { id: 'e-7', date: atAge(21, '05-14'), title: 'Moved to the city', kind: 'milestone' },
    { id: 'e-8', date: atAge(22, '10-08'), title: 'Ran my first 10K', kind: 'achievement' },
    { id: 'e-9', date: atAge(23, '06-20'), title: 'Graduated with honors', kind: 'achievement' },
    { id: 'e-10', date: atAge(23, '09-02'), title: 'Started master’s program', kind: 'milestone' },
    {
      id: 'e-11',
      date: atAge(24, '04-12'),
      title: 'Two weeks in Japan with friends',
      kind: 'memory',
      note: 'Kyoto at dawn, before the crowds.',
    },
    { id: 'e-12', date: ago(156), title: 'Moved into a new apartment', kind: 'milestone' },
    { id: 'e-13', date: ago(24), title: 'Ran 10K in under 50 minutes', kind: 'achievement' },
    { id: 'e-14', date: ahead(44), title: 'Submit thesis', kind: 'milestone' },
    { id: 'e-15', date: ahead(131), title: 'Half marathon race day', kind: 'milestone' },
  ]

  return {
    version: 1,
    profile: { name: 'Adrian Moreau', birthDate, lifeExpectancy: 70, reviewedOn: ago(9) },
    priorities: [
      { id: 'p-1', title: 'Finish thesis outline', time: '09:00', done: false, date: today },
      { id: 'p-2', title: 'Gym — upper body', time: '12:30', done: false, date: today },
      { id: 'p-3', title: 'Review Figma components', time: '15:00', done: false, date: today },
      { id: 'p-4', title: 'Call Mom', time: '18:00', done: true, date: today },
    ],
    habits,
    goals,
    values: [
      { id: 'v-health', name: 'Health', description: 'Energy is the foundation for everything else.' },
      { id: 'v-connection', name: 'Connection', description: 'Show up fully for the people I love.' },
      { id: 'v-craft', name: 'Craft', description: 'Do work I’m proud to put my name on.' },
      { id: 'v-curiosity', name: 'Curiosity', description: 'Keep learning and stay a beginner at something.' },
      { id: 'v-calm', name: 'Calm', description: 'Leave room to think, rest, and notice.' },
    ],
    principles: [
      { id: 'pr-1', text: 'Decide once, then make it automatic.' },
      { id: 'pr-2', text: 'Small steps every day beat big plans.' },
      { id: 'pr-3', text: 'When unsure, choose what I’d be proud of in ten years.' },
      { id: 'pr-4', text: 'Protect the morning for deep work.' },
      { id: 'pr-5', text: 'Say no to good things to make room for great ones.' },
    ],
    areas: [
      { id: 'a-health', name: 'Health', importance: 5, satisfaction: 3 },
      { id: 'a-relationships', name: 'Relationships', importance: 5, satisfaction: 4 },
      { id: 'a-work', name: 'Work & craft', importance: 4, satisfaction: 4 },
      { id: 'a-learning', name: 'Learning', importance: 4, satisfaction: 3 },
      { id: 'a-finances', name: 'Finances', importance: 3, satisfaction: 3 },
      { id: 'a-rest', name: 'Rest & play', importance: 4, satisfaction: 2 },
    ],
    skills,
    sessions,
    reflections,
    events,
    practices: [
      {
        id: 'pa-1',
        exerciseId: 'if-then',
        date: ago(3),
        answers: [
          'Go for a morning run',
          'After my alarm on weekdays, before checking my phone',
          'Feeling tired or it’s raining',
          'Do a 15-minute workout at home instead',
        ],
      },
      {
        id: 'pa-2',
        exerciseId: 'reframe',
        date: ago(9),
        answers: [
          'My thesis advisor gave short, critical feedback on my draft.',
          'I’m not cut out for this.',
          'For: the feedback was critical. Against: every draft has improved, and she approved my research question.',
          'The feedback is about the draft, not about me — it shows me where to focus next.',
        ],
      },
    ],
  }
}
