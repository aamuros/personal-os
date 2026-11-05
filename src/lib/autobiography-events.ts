import type { LifeEvent } from './types'

export function createAutobiographyEvents(): LifeEvent[] {
  return [
    { id: 'bio-born', date: '2006-03-03', title: 'Born', kind: 'milestone', note: 'My story began on March 3, 2006.' },
    { id: 'bio-nkp', date: '2009-01-01', datePrecision: 'year', title: 'Started Bilaran NKP School', kind: 'milestone', note: 'Around 2009–2012, starting at about age 3. Mom stayed until it was time to go home. Snacks: Watatops, Yakult, biscuits, and C2.' },
    { id: 'bio-bilaran', date: '2013-01-01', datePrecision: 'year', title: 'Started Bilaran Elementary School', kind: 'milestone', note: 'Grades 1–2, around 2013–2015. I remember starting at about age 6 or 7; dates need checking.' },
    { id: 'bio-tuy', date: '2016-01-01', datePrecision: 'year', title: 'Transferred to NMS Tuy', kind: 'milestone', note: 'Grade 3 through Grade 6, around 2016–2019. The campus and the older, bigger students felt overwhelming at first.' },
    { id: 'bio-elementary', date: '2019-01-01', datePrecision: 'year', title: 'Finished elementary at NMS Tuy', kind: 'milestone', note: 'Completed Grade 6 around 2019; exact graduation date not recorded.' },
    { id: 'bio-basketball', date: '2019-01-01', datePrecision: 'year', title: 'Played basketball on another campus', kind: 'memory', note: 'In Grade 6, I faced bigger and very good opponents. Placed around 2019 from my school timeline; the exact year needs checking.' },
    { id: 'bio-nasugbu', date: '2019-01-01', datePrecision: 'year', title: 'Started Grade 7 at NMS Nasugbu', kind: 'milestone', note: 'Transferred to the Nasugbu branch for high school around 2019, and stayed through senior high school in 2024.' },
    { id: 'bio-football', date: '2019-01-01', datePrecision: 'year', title: 'Joined district football in Grade 7', kind: 'achievement', note: 'My teammates were people I admired and looked up to. Around 2019, based on my recalled Grade 7 year.' },
    { id: 'bio-grade8', date: '2020-01-01', datePrecision: 'year', title: 'Grade 8 at NMS Nasugbu', kind: 'milestone', note: 'I recall Grade 8 in 2020, but also remember it nearly ending when the pandemic arrived. The sequence needs checking.' },
    { id: 'bio-pandemic', date: '2020-04-01', datePrecision: 'month', title: 'School life during the pandemic', kind: 'memory', note: 'I associate the disruption with around April 2020. During the pandemic I played Call of Duty on my phone; before it, I played Mobile Legends.' },
    { id: 'bio-junior-finish', date: '2022-01-01', datePrecision: 'year', title: 'Finished junior high school', kind: 'milestone', note: 'Around 2022 at NMS Nasugbu; exact graduation date needs checking.' },
    { id: 'bio-senior-start', date: '2022-01-01', datePrecision: 'year', title: 'Continued senior high school at NMS', kind: 'milestone', note: 'Stayed at NMS Nasugbu for senior high school, around 2022–2024.' },
    { id: 'bio-senior-finish', date: '2024-01-01', datePrecision: 'year', title: 'Finished senior high school at NMS', kind: 'milestone', note: 'Completed senior high school around 2024 before going to Mapúa University.' },
    { id: 'bio-mapua', date: '2024-01-01', datePrecision: 'year', title: 'Started college at Mapúa University', kind: 'milestone', note: 'Around 2024, inferred from finishing senior high school in 2024. Enrollment date needs checking. At the time of writing, I describe myself as a third-year student.' },
  ]
}

// Match both identifiers and titles so unrelated, personally added events survive.
const DEMO_TITLES = [
  'Born', 'First piano lesson', 'Family road trip along the coast', 'Graduated high school',
  'Started university', 'First design internship', 'Moved to the city', 'Ran my first 10K',
  'Graduated with honors', 'Started master’s program', 'Two weeks in Japan with friends',
  'Moved into a new apartment', 'Ran 10K in under 50 minutes', 'Submit thesis', 'Half marathon race day',
]

export function integrateAutobiographyEvents(events: LifeEvent[]): LifeEvent[] {
  const kept = events.filter((event) => !DEMO_TITLES.some((title, index) => event.id === `e-${index + 1}` && event.title === title))
  const ids = new Set(kept.map((event) => event.id))
  return [...kept, ...createAutobiographyEvents().filter((event) => !ids.has(event.id))]
}
