import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Card, Empty } from "./ui"
import { fromKey, toKey } from "../lib/date"
import {
  clamp,
  timelinePeriod,
  timelineRelative,
  timelineScale,
  type TimelineUnit,
} from "../lib/timeline-wheel"
import type { LifeEvent, Profile } from "../lib/types"

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  )
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(query.matches)
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])
  return reduced
}

export function TimelineWheel({
  profile,
  today,
  events,
  renderEvents,
}: {
  profile: Profile
  today: string
  events: LifeEvent[]
  renderEvents: (events: LifeEvent[]) => ReactNode
}) {
  const [unit, setUnit] = useState<TimelineUnit>("years")
  const [selectedDate, setSelectedDate] = useState(today)
  const scale = useMemo(() => timelineScale(profile, unit), [profile, unit])
  const index = clamp(
    Math.floor(scale.index(fromKey(selectedDate))),
    0,
    scale.max,
  )
  const period = timelinePeriod(profile, unit, index)
  const matching = events
    .filter((e) => e.date >= period.start && e.date < period.end)
    .sort((a, b) => a.date.localeCompare(b.date))
  const date = scale.date(index)
  const title =
    unit === "years"
      ? String(date.getFullYear())
      : unit === "months"
        ? date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
        : `Week ${(index + 1).toLocaleString("en-US")}`

  return (
    <div className="tw-layout">
      <div className="tw-workspace">
        <WheelScale
          key={`${unit}-${profile.birthDate}-${profile.lifeExpectancy}`}
          profile={profile}
          today={today}
          unit={unit}
          initialDate={selectedDate}
          onSelect={setSelectedDate}
          onUnit={setUnit}
        />
        <p className="tw-help text-caption text-muted">
          Scroll or drag to travel through time. Use arrow keys to move, Page Up
          or Down to skip, and T to return to today.
        </p>
      </div>
      <Card
        className="tw-events"
        title={`Events · ${title}`}
        aside={
          <span className="text-caption tabular-nums text-muted">
            {matching.length} recorded
          </span>
        }
      >
        {matching.length ? (
          renderEvents(matching)
        ) : (
          <Empty>
            No events recorded for this {unit.slice(0, -1)}. Use Add event to
            record a moment.
          </Empty>
        )}
      </Card>
    </div>
  )
}

function WheelScale({
  profile,
  today,
  unit,
  initialDate,
  onSelect,
  onUnit,
}: {
  profile: Profile
  today: string
  unit: TimelineUnit
  initialDate: string
  onSelect: (date: string) => void
  onUnit: (unit: TimelineUnit) => void
}) {
  const scale = useMemo(() => timelineScale(profile, unit), [profile, unit])
  const todayTick = clamp(Math.floor(scale.index(fromKey(today))), 0, scale.max)
  const initial = clamp(
    Math.floor(scale.index(fromKey(initialDate))),
    0,
    scale.max,
  )
  const [position, setPosition] = useState(initial)
  const [held, setHeld] = useState(false)
  const [width, setWidth] = useState(800)
  const element = useRef<HTMLDivElement>(null)
  const motion = useRef({
    p: initial,
    target: initial,
    velocity: 0,
    frame: 0,
    last: 0,
  })
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const drag = useRef<{
    id: number
    x: number
    p: number
    moved: boolean
    item: number | null
    track: boolean
    step: number
    samples: {
      t: number
      x: number
    }[]
  } | null>(null)
  const reduced = useReducedMotion()
  const near = Math.round(clamp(position, 0, scale.max))
  const spread = Math.min(440, Math.max(0, width / 2 - 16))
  const step = Math.max(24, spread / 3)
  const trackStep = Math.max(1, spread / 15)

  const go = useCallback(
    (target: number) => {
      clearTimeout(settle.current)
      const m = motion.current
      m.target = clamp(Math.round(target), 0, scale.max)
      if (reduced) {
        cancelAnimationFrame(m.frame)
        m.frame = 0
        m.p = m.target
        m.velocity = 0
        setPosition(m.p)
        return
      }
      if (m.frame) return
      m.last = performance.now()
      const tick = (time: number) => {
        const dt = Math.min(0.032, (time - m.last) / 1000)
        m.last = time
        m.velocity += (230 * (m.target - m.p) - 24 * m.velocity) * dt
        m.p += m.velocity * dt
        if (Math.abs(m.velocity) < 0.004 && Math.abs(m.target - m.p) < 0.0006) {
          m.p = m.target
          m.velocity = 0
          m.frame = 0
          setPosition(m.p)
          return
        }
        setPosition(m.p)
        m.frame = requestAnimationFrame(tick)
      }
      m.frame = requestAnimationFrame(tick)
    },
    [scale.max, reduced],
  )

  useEffect(() => {
    // Preserve today's exact date when changing scales from the current tick.
    onSelect(near === todayTick ? today : toKey(scale.date(near)))
  }, [near, todayTick, today, scale, onSelect])

  useEffect(() => {
    const el = element.current
    if (!el) return
    const observer = new ResizeObserver(() => setWidth(el.clientWidth))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = element.current
    if (!el) return
    let streak = 0,
      lastNotch = 0
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey || drag.current) return
      e.preventDefault()
      const m = motion.current
      let delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (!delta) return
      if (e.deltaMode === 1) delta *= 16
      if (e.deltaMode === 2) delta *= el.clientWidth
      const legacy = e as WheelEvent & { wheelDeltaY?: number }
      const notch =
        e.deltaMode === 1 ||
        (!e.deltaX &&
          Math.abs(e.deltaY) >= 50 &&
          legacy.wheelDeltaY &&
          Math.abs(legacy.wheelDeltaY) % 120 === 0)
      if (notch) {
        const time = performance.now()
        streak = time - lastNotch < 160 ? Math.min(streak + 1, 10) : 0
        lastNotch = time
        go(m.target + Math.sign(delta) * (1 + streak))
      } else {
        clearTimeout(settle.current)
        cancelAnimationFrame(m.frame)
        m.frame = 0
        m.velocity = 0
        const scrollStep = e.target instanceof Element && e.target.closest(".tw-field")
          ? trackStep
          : step
        m.p = clamp(m.p + delta / (scrollStep * 0.8), -0.35, scale.max + 0.35)
        m.target = m.p
        setPosition(m.p)
        settle.current = setTimeout(() => go(m.p), 110)
      }
    }
    el.addEventListener("wheel", wheel, { passive: false })
    return () => {
      el.removeEventListener("wheel", wheel)
      clearTimeout(settle.current)
    }
  }, [go, scale, step, trackStep])

  useEffect(
    () => () => {
      cancelAnimationFrame(motion.current.frame)
      clearTimeout(settle.current)
    },
    [],
  )

  // If reduced motion is enabled during a spring, settle immediately.
  useEffect(() => {
    if (reduced) go(motion.current.target)
  }, [reduced, go])

  const endDrag = (
    e: React.PointerEvent<HTMLDivElement>,
    cancelled = false,
  ) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    drag.current = null
    setHeld(false)
    const m = motion.current
    if (cancelled) {
      go(m.p)
      return
    }
    if (!d.moved) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left - rect.width / 2
      const offset =
        spread > 0 && Math.abs(x) < spread * 0.97
          ? (d.track ? 15 : 3) * Math.atanh(x / spread)
          : Math.sign(x) * (d.track ? 24 : 6)
      go(d.item !== null && Number.isFinite(d.item) ? d.item : m.p + offset)
      return
    }
    const first = d.samples[0],
      last = d.samples[d.samples.length - 1]
    const dt = (last.t - first.t) / 1000
    const velocity =
      dt > 0 && e.timeStamp - last.t < 80
        ? -(last.x - first.x) / dt / d.step
        : 0
    m.velocity = reduced
      ? 0
      : clamp(velocity, -3000 / d.step, 3000 / d.step)
    go(m.p + m.velocity * 0.2)
  }

  const selected = scale.date(near)
  const birth = fromKey(profile.birthDate)
  let age = selected.getFullYear() - birth.getFullYear()
  if (
    selected <
    new Date(selected.getFullYear(), birth.getMonth(), birth.getDate())
  )
    age--
  const context =
    unit === "years"
      ? near === 0
        ? "Born"
        : `Turns ${near}`
      : unit === "months"
        ? `Age ${Math.max(0, age)}`
        : selected.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
  const relative = timelineRelative(near - todayTick, unit)
  const plain =
    unit === "weeks"
      ? `Week ${near + 1}`
      : unit === "months"
        ? selected.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          })
        : String(selected.getFullYear())
  const todayDistance = todayTick - position
  const raw = spread * Math.tanh(todayDistance / 15)
  const limit = Math.max(0, width / 2 - 38)
  const marker = clamp(raw, -limit, limit)
  const markerState =
    Math.abs(todayDistance) < 0.5
      ? "here"
      : Math.abs(todayDistance) > 23 || Math.abs(raw) > limit
        ? todayDistance < 0
          ? "left"
          : "right"
        : "view"

  return (
    <section
      className="tw"
      data-held={held || undefined}
      data-tone={
        near <= todayTick
          ? undefined
          : near >= scale.max - scale.last
            ? "over"
            : "warn"
      }
      aria-label="Timeline wheel"
    >
      <header className="tw-head">
        <h2>Timeline</h2>
        <span>
          {context} · {relative}
        </span>
      </header>
      <div className="tw-stage">
        <div
          className="tw-scale"
          ref={element}
          role="slider"
          tabIndex={0}
          aria-label="Timeline position"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={scale.max}
          aria-valuenow={near}
          aria-valuetext={`${plain}, ${context}, ${relative}`}
          aria-describedby="timeline-wheel-help"
          onPointerDown={(e) => {
            if (e.pointerType === "mouse" && e.button !== 0) return
            clearTimeout(settle.current)
            const m = motion.current
            cancelAnimationFrame(m.frame)
            m.frame = 0
            m.velocity = 0
            e.currentTarget.focus()
            e.currentTarget.setPointerCapture(e.pointerId)
            setHeld(true)
            const track = e.target instanceof Element && !!e.target.closest(".tw-field")
            drag.current = {
              id: e.pointerId,
              x: e.clientX,
              p: m.p,
              moved: false,
              track,
              step: track ? trackStep : step,
              item: e.target instanceof Element
                ? Number(e.target.closest<HTMLElement>("[data-tick]")?.dataset.tick ?? NaN)
                : null,
              samples: [{ t: e.timeStamp, x: e.clientX }],
            }
          }}
          onPointerMove={(e) => {
            const d = drag.current
            if (!d || e.pointerId !== d.id) return
            const dx = e.clientX - d.x
            if (Math.abs(dx) > 4) d.moved = true
            if (!d.moved) return
            let p = d.p - dx / d.step
            if (p < 0) p *= 0.3
            if (p > scale.max) p = scale.max + (p - scale.max) * 0.3
            motion.current.p = motion.current.target = p
            setPosition(p)
            d.samples.push({ t: e.timeStamp, x: e.clientX })
            if (d.samples.length > 6) d.samples.shift()
          }}
          onPointerUp={(e) => endDrag(e)}
          onPointerCancel={(e) => endDrag(e, true)}
          onLostPointerCapture={(e) => endDrag(e, true)}
          onKeyDown={(e) => {
            const t = Math.round(motion.current.target)
            const targets: Record<string, number> = {
              ArrowRight: t + 1,
              ArrowUp: t + 1,
              ArrowLeft: t - 1,
              ArrowDown: t - 1,
              PageUp: t + scale.page,
              PageDown: t - scale.page,
              Home: 0,
              End: scale.max,
              t: todayTick,
              T: todayTick,
            }
            if (e.key in targets) {
              e.preventDefault()
              go(targets[e.key])
            }
          }}
        >
          <div className="tw-rack" aria-hidden>
            {Array.from({ length: 13 }, (_, slot) => {
              const item = near + slot - 6
              if (item < 0 || item > scale.max) return null
              const distance = item - position
              const a = Math.abs(distance)
              const date = scale.date(item)
              const active = item === near
              const year = date.getFullYear()
              return (
                <div
                  key={item}
                  className="tw-cover"
                  data-tick={item}
                  data-on={active || undefined}
                  style={{
                    zIndex: active ? 100 : 90 - Math.round(a * 10),
                    opacity: clamp(6 - a, 0, 1),
                    transform: reduced
                      ? `translateX(${spread * Math.tanh(distance / 3)}px)`
                      : `translateX(${spread * Math.tanh(distance / 3)}px) translateZ(${60 * Math.exp(-distance * distance * 2) - a * 24}px) rotateY(${clamp(-distance * 64, -72, 72)}deg)`,
                  }}
                >
                  <span className="tw-cover-index">
                    {unit.slice(0, -1)} {item + (unit === "years" ? 0 : 1)}
                  </span>
                  <div className="tw-cover-date">
                    {unit === "months" && (
                      <span className="tw-cover-month">
                        {date.toLocaleDateString("en-US", { month: "short" })}
                      </span>
                    )}
                    <div className="tw-rolls">
                      <RollingNumber
                        value={unit === "weeks" ? item + 1 : year}
                        grouped={unit === "weeks"}
                        reduced={reduced}
                      />
                    </div>
                  </div>
                  <span className="tw-cover-title">
                    {timelineRelative(item - todayTick, unit)}
                  </span>
                </div>
              )
            })}
            <div className="tw-fade" data-side="l" />
            <div className="tw-fade" data-side="r" />
          </div>
          <div className="tw-field" aria-hidden>
            {Array.from({ length: 49 }, (_, slot) => {
              const item = near + slot - 24
              const distance = item - position
              const a = Math.abs(distance)
              if (item < 0 || item > scale.max || a > 23) return null
              const label = scale.label(item)
              const x = spread * Math.tanh(distance / 15)
              const opacity = a > 14 ? clamp((22 - a) / 8, 0, 1) : 1
              return (
                <Fragment key={item}>
                  <span
                    className="tw-bar"
                    data-tick={item}
                    data-on={item <= near || undefined}
                    style={{
                      height: (label ? 22 : 14) + 30 * Math.exp(-distance * distance / 26),
                      opacity,
                      transform: `translateX(${x}px) rotate(${spread ? 11 * x / spread : 0}deg) scaleX(${Math.max(0.4, 1 - 0.04 * a)})`,
                      filter: a > 9 ? `blur(${Math.min(1.2, (a - 9) * 0.07)}px)` : undefined,
                    }}
                  />
                  {label && (
                    <span className="tw-lab" data-tick={item} style={{
                      opacity: opacity * 0.9,
                      transform: `translateX(${x}px) translateX(-50%)`,
                    }}>
                      {label}
                    </span>
                  )}
                </Fragment>
              )
            })}
          </div>
        </div>
        <button
          type="button"
          className="tw-mark"
          data-state={markerState}
          aria-current={markerState === "here" ? "date" : undefined}
          aria-label="Jump to today"
          style={{ transform: `translateX(calc(-50% + ${marker}px))` }}
          onClick={() => go(todayTick)}
        >
          {markerState === "left" ? (
            <ChevronLeft size={13} aria-hidden />
          ) : markerState !== "right" ? (
            <span className="tw-dia" aria-hidden />
          ) : null}
          Today{" "}
          {markerState === "right" && <ChevronRight size={13} aria-hidden />}
        </button>
      </div>
      <div className="tw-units" role="group" aria-label="Timeline scale">
        {(["years", "months", "weeks"] as const).map((u) => (
          <button
            key={u}
            type="button"
            className="tw-unit"
            aria-pressed={u === unit}
            onClick={() => onUnit(u)}
          >
            {u}
          </button>
        ))}
      </div>
      <p id="timeline-wheel-help" className="sr-only">
        Scroll, drag, or use arrow keys to move. Page Up and Down skip larger
        intervals. Home and End move to the limits. Press T to return to today.
      </p>
    </section>
  )
}

function RollingNumber({
  value,
  grouped,
  reduced,
}: {
  value: number
  grouped: boolean
  reduced: boolean
}) {
  const length = String(value).length
  return (
    <>
      {[3, 2, 1, 0].map((p) => (
        <Fragment key={p}>
          <RollingColumn
            value={Math.floor(value / 10 ** p)}
            visible={p < length}
            delay={p * 40}
            reduced={reduced}
          />
          {p === 3 && grouped && (
            <span className="tw-sep" data-on={length > 3 || undefined}>
              ,
            </span>
          )}
        </Fragment>
      ))}
    </>
  )
}

function RollingColumn({
  value,
  visible = true,
  delay = 0,
  reduced,
}: {
  value: number
  visible?: boolean
  delay?: number
  reduced: boolean
}) {
  const strip = useRef<HTMLSpanElement>(null)
  const state = useRef({ pos: value, velocity: 0 })
  const base = 10
  useEffect(() => {
    let frame = 0,
      previous = 0
    const start = performance.now() + delay
    const tick = (time: number) => {
      const dt = previous ? clamp((time - previous) / 16.67, 0, 2.5) : 1
      previous = time
      const s = state.current
      if (reduced || document.hidden) {
        s.pos = value
        s.velocity = 0
      } else if (time >= start) {
        const gap = value - s.pos
        if (Math.abs(gap) > 24)
          s.pos += Math.round((gap - Math.sign(gap) * 24) / base) * base
        s.velocity += (value - s.pos) * 0.152 * dt
        s.velocity *= 0.71 ** dt
        s.pos += s.velocity * dt
      }
      const done =
        Math.abs(value - s.pos) < 0.004 && Math.abs(s.velocity) < 0.004
      if (done) {
        s.pos = value
        s.velocity = 0
      }
      if (strip.current) {
        strip.current.style.transform = `translateY(${(-(((s.pos % base) + base) % base) / (base + 1)) * 100}%)`
        strip.current.style.filter = s.velocity
          ? `blur(${Math.min(3, Math.abs(s.velocity) * 2.4)}px)`
          : ""
      }
      if (!done) frame = requestAnimationFrame(tick)
    }
    tick(performance.now())
    return () => cancelAnimationFrame(frame)
  }, [value, delay, base, reduced])
  return (
    <span
      className="tw-col tw-d"
      data-on={visible || undefined}
    >
      <span className="tw-strip" ref={strip}>
        {DIGITS.map((text, i) => (
          <span key={i}>{text}</span>
        ))}
      </span>
    </span>
  )
}
