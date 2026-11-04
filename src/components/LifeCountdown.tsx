import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { addDays, daysBetween, formatDate, fromKey, shortDate, toKey, untilPhrase } from '../lib/date'
import { useStore } from '../lib/store'

const UNITS = { days: 86400, hours: 3600, minutes: 60, seconds: 1 }
type Unit = keyof typeof UNITS
const UNIT_NAMES = Object.keys(UNITS) as Unit[]
const PLACES = 10
const fmt = (n: number) => Math.max(0, Math.floor(n)).toLocaleString('en-US')
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

function fullYears(birth: Date, date: Date) {
  let years = date.getFullYear() - birth.getFullYear()
  if (date < new Date(date.getFullYear(), birth.getMonth(), birth.getDate())) years--
  return years
}

export function LifeCountdown() {
  const profile = useStore((s) => s.profile)
  const events = useStore((s) => s.events)
  const [now, setNow] = useState(Date.now)
  const [unit, setUnit] = useState<Unit>('seconds')
  const today = toKey(new Date(now))
  // Match the life calendar's 52 weeks per year, using local calendar dates.
  const total = profile.lifeExpectancy * 52
  const end = fromKey(addDays(profile.birthDate, total * 7)).getTime()
  const birth = fromKey(profile.birthDate)
  const current = Math.floor(daysBetween(profile.birthDate, today) / 7)
  const seconds = Math.max(0, Math.floor((end - now) / 1000))
  const value = Math.min(10 ** PLACES - 1, Math.floor(seconds / UNITS[unit]))
  const midnight = fromKey(today).getTime()
  const nextMidnight = fromKey(addDays(today, 1)).getTime()
  const dayPercent = clamp((now - midnight) / (nextMidnight - midnight) * 100, 0, 100)
  const next = useMemo(
    () => events.filter((e) => e.date > today).sort((a, b) => a.date.localeCompare(b.date))[0],
    [events, today],
  )

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])

  return (
    <section className="lc" aria-labelledby="life-countdown-title">
      <header className="lc-head">
        <h2 id="life-countdown-title" className="lc-title">Time left</h2>
        <a href="#life-calendar" className="lc-meta card-link" aria-label="Open life calendar">
          {current >= total ? 'All weeks lived' : current < 0 ? 'Life ahead' : `week ${fmt(current + 1)} of ${fmt(total)}`}
          <ArrowRight size={12} aria-hidden />
        </a>
      </header>
      <Odometer value={value} unit={unit} />
      <CountdownUnits unit={unit} onChange={setUnit} />
      <WeekField birthDate={profile.birthDate} total={total} current={current} today={today} />
      <dl className="lc-stats">
        <div>
          <dt>Today</dt><dd>{Math.floor(dayPercent)}% gone</dd>
          <div className="lc-bar" aria-hidden><span style={{ width: `${dayPercent}%` }} /></div>
        </div>
        <div><dt>Weekends left</dt><dd>{fmt(seconds / 604800)}</dd></div>
        <div><dt>Birthdays left</dt><dd>{fmt(fullYears(birth, new Date(end)) - fullYears(birth, new Date(now)))}</dd></div>
        <div><dt>Waking hours left</dt><dd>{fmt(seconds / 3600 * (16 / 24))}</dd></div>
      </dl>
      <div className="lc-milestone">
        <span>Next milestone</span>
        {next ? (
          <a href="#timeline" className="lc-milestone-link">
            <span>{next.title}</span>
            <small>{shortDate(next.date)}, {untilPhrase(next.date, today)}</small>
          </a>
        ) : <a href="#timeline/new" className="card-link">Add a milestone <ArrowRight size={12} aria-hidden /></a>}
      </div>
    </section>
  )
}

function CountdownUnits({ unit, onChange }: { unit: Unit; onChange: (unit: Unit) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [tile, setTile] = useState({ left: 0, width: 0 })
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => {
      const button = element.querySelector<HTMLButtonElement>('[aria-checked="true"]')
      if (button) setTile({ left: button.offsetLeft, width: button.offsetWidth })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [unit])
  return (
    <div ref={ref} className="lc-units" role="radiogroup" aria-label="Countdown unit">
      <span className="lc-unit-tile" aria-hidden style={{ width: tile.width, transform: `translateX(${tile.left}px)` }} />
      {UNIT_NAMES.map((name, index) => (
        <button key={name} type="button" role="radio" className="lc-unit" aria-checked={name === unit} tabIndex={name === unit ? 0 : -1}
          onClick={() => onChange(name)}
          onKeyDown={(e) => {
            const directions: Record<string, number> = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }
            if (!(e.key in directions) && e.key !== 'Home' && e.key !== 'End') return
            e.preventDefault()
            const next = e.key === 'Home' ? 0 : e.key === 'End' ? UNIT_NAMES.length - 1 : clamp(index + directions[e.key], 0, UNIT_NAMES.length - 1)
            onChange(UNIT_NAMES[next])
            ref.current?.querySelectorAll('button')[next]?.focus()
          }}
        >{name}</button>
      ))}
    </div>
  )
}

function Odometer({ value, unit }: { value: number; unit: Unit }) {
  const strips = useRef<(HTMLSpanElement | null)[]>([])
  const columns = useRef(Array.from({ length: PLACES }, (_, p) => {
    const initial = Math.floor(value / 10 ** p)
    return { pos: initial, velocity: 0, target: initial, goal: initial, due: 0 }
  }))
  const frame = useRef(0)
  const motion = useRef(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { motion.current = query.matches }
    update()
    query.addEventListener('change', update)
    return () => {
      query.removeEventListener('change', update)
      cancelAnimationFrame(frame.current)
    }
  }, [])

  useEffect(() => {
    cancelAnimationFrame(frame.current)
    const snap = motion.current || document.hidden
    columns.current.forEach((col, p) => {
      const goal = Math.floor(value / 10 ** p)
      if (goal !== col.goal) {
        col.goal = goal
        col.due = performance.now() + p * 40
      }
      if (snap) { col.pos = col.target = col.goal; col.velocity = 0 }
    })
    let previous = 0
    const tick = (time: number) => {
      const dt = previous ? clamp((time - previous) / 16.67, 0, 2.5) : 1
      previous = time
      let busy = false
      columns.current.forEach((col, p) => {
        if (time >= col.due) col.target = col.goal
        else busy = true
        const gap = col.target - col.pos
        if (Math.abs(gap) > 24) col.pos += Math.round((gap - Math.sign(gap) * 24) / 10) * 10
        col.velocity += (col.target - col.pos) * 0.136 * dt
        col.velocity *= 0.69 ** dt
        col.pos += col.velocity * dt
        if (Math.abs(col.target - col.pos) < 0.004 && Math.abs(col.velocity) < 0.004) {
          col.pos = col.target; col.velocity = 0
        } else busy = true
        const el = strips.current[p]
        if (el) {
          el.style.transform = `translateY(${-(((col.pos % 10) + 10) % 10) / 11 * 100}%)`
          el.style.filter = col.velocity ? `blur(${Math.min(3, Math.abs(col.velocity) * 2.4)}px)` : ''
        }
      })
      if (busy && !snap) frame.current = requestAnimationFrame(tick)
    }
    tick(performance.now())
    return () => cancelAnimationFrame(frame.current)
  }, [value])

  const shown = String(value).length
  return (
    <div className="lc-num" role="timer" aria-live="off" aria-label={`${fmt(value)} ${unit} left`}>
      <span className="lc-digits" aria-hidden>
        {Array.from({ length: PLACES }, (_, i) => {
          const p = PLACES - 1 - i
          return (
            <Fragment key={p}>
              <span className="lc-col" data-on={p < shown || undefined}>
                <span className="lc-strip" ref={(el) => { strips.current[p] = el }}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d, index) => <span key={index}>{d}</span>)}
                </span>
              </span>
              {p > 0 && p % 3 === 0 && <span className="lc-sep" data-on={shown > p || undefined}>,</span>}
            </Fragment>
          )
        })}
      </span>
    </div>
  )
}

function WeekField({ birthDate, total, current, today }: { birthDate: string; total: number; current: number; today: string }) {
  const field = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const layout = useRef({ pitch: 1, cols: 130, rows: 1 })
  const repaint = useRef<() => void>(() => {})
  const hovered = useRef<number | null>(null)
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    const el = field.current
    const cv = canvas.current
    if (!el || !cv) return
    const context = cv.getContext('2d')
    if (!context) return
    const ctx = context
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let progress = reduced.matches ? 1 : 0
    const started = performance.now()
    const draw = () => {
      const { pitch, cols, rows } = layout.current
      const width = el.clientWidth
      if (!width) return
      const colors = getComputedStyle(el)
      const signal = colors.getPropertyValue('--dashboard-signal').trim()
      ctx.clearRect(0, 0, width, rows * pitch)
      const size = pitch * 0.74
      const offset = (pitch - size) / 2
      const reveal = progress >= 1 ? Infinity : (1 - (1 - progress) ** 3) * (current + 81)
      for (let index = 0; index < total; index++) {
        const lived = index < current
        const scale = lived ? clamp((reveal - index) / 80, 0, 1) : index === current && reveal <= current ? 0 : 1
        if (!scale) continue
        const side = size * scale
        const inset = (size - side) / 2
        const x = index % cols * pitch + offset + inset
        const y = Math.floor(index / cols) * pitch + offset + inset
        ctx.fillStyle = index === current ? signal : colors.color
        ctx.globalAlpha = index === current ? 1 : lived ? 0.82 : 0.09
        ctx.beginPath()
        ctx.roundRect(x, y, side, side, Math.min(1.5, side / 3))
        ctx.fill()
        if (index === current) {
          ctx.globalAlpha = 0.35
          ctx.strokeStyle = signal
          ctx.lineWidth = 2
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
      if (hovered.current !== null) {
        const index = hovered.current
        ctx.strokeStyle = colors.color
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.roundRect(index % cols * pitch + offset - 1, Math.floor(index / cols) * pitch + offset - 1, size + 2, size + 2, 2)
        ctx.stroke()
      }
    }
    const resize = () => {
      const width = el.clientWidth
      if (!width) return
      const cols = width < 480 ? 52 : width < 720 ? 104 : 130
      const rows = Math.ceil(total / cols)
      const pitch = width / cols
      const height = rows * pitch
      layout.current = { pitch, cols, rows }
      const dpr = window.devicePixelRatio || 1
      cv.width = Math.round(width * dpr)
      cv.height = Math.round(height * dpr)
      cv.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw()
    }
    const animate = (time: number) => {
      progress = reduced.matches ? 1 : Math.min(1, (time - started) / 1100)
      draw()
      if (progress < 1) frame = requestAnimationFrame(animate)
    }
    repaint.current = draw
    resize()
    if (progress < 1) frame = requestAnimationFrame(animate)
    const observer = new ResizeObserver(resize)
    observer.observe(el)
    const theme = new MutationObserver(draw)
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      theme.disconnect()
      repaint.current = () => {}
    }
  }, [total, current])

  useEffect(() => {
    hovered.current = selected
    repaint.current()
  }, [selected])

  let description = 'Each dot is a week. Hover or use arrow keys to explore.'
  if (selected !== null) {
    const start = addDays(birthDate, selected * 7)
    const end = formatDate(addDays(start, 6), { month: 'short', day: 'numeric', year: 'numeric' })
    description = `Week ${fmt(selected + 1)} of ${fmt(total)}, ${shortDate(start)} – ${end} (age ${Math.floor(selected / 52)})${selected === current ? ' — this week' : ''}`
  }

  return (
    <>
      <div className="lc-field" ref={field}>
        <canvas ref={canvas} tabIndex={0} role="img" aria-label={`${fmt(total)} weeks in your life. ${fmt(clamp(current, 0, total))} lived. Today is ${shortDate(today)}.`}
          aria-describedby="life-week-description"
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const { pitch, cols, rows } = layout.current
            const col = Math.floor((e.clientX - rect.left) / pitch)
            const row = Math.floor((e.clientY - rect.top) / pitch)
            const index = row * cols + col
            setSelected(col >= 0 && col < cols && row >= 0 && row < rows && index < total ? index : null)
          }}
          onPointerLeave={() => { if (document.activeElement !== canvas.current) setSelected(null) }}
          onFocus={() => setSelected(clamp(current, 0, total - 1))}
          onBlur={() => setSelected(null)}
          onKeyDown={(e) => {
            const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -layout.current.cols, ArrowDown: layout.current.cols }
            if (e.key in steps || e.key === 'Home' || e.key === 'End') {
              e.preventDefault()
              setSelected((prev) => e.key === 'Home' ? 0 : e.key === 'End' ? total - 1 : clamp((prev ?? current) + steps[e.key], 0, total - 1))
            }
          }}
        />
      </div>
      <p className="lc-read" id="life-week-description" aria-live="polite">{description}</p>
    </>
  )
}
