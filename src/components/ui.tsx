import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Check as CheckIcon, Plus, X } from 'lucide-react'
import { longDate } from '../lib/date'
import { useToday } from '../lib/hooks'

/** Default icon props — matches the 1.5px stroke of the original Bencho icons. */
export const ic = { size: 16, strokeWidth: 1.5 } as const

export function cx(...classes: Array<string | false | null | undefined | 0>) {
  return classes.filter(Boolean).join(' ')
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  const today = useToday()
  return (
    <header className="page-header">
      <div className="page-header-copy">
        <p className="page-eyebrow">{eyebrow ?? longDate(today)}</p>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  )
}

export function Card({
  title,
  aside,
  children,
  className,
}: {
  title?: ReactNode
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <section className={cx('card', className)} aria-labelledby={title ? id : undefined}>
      {(title || aside) && (
        <div className="card-header">
          {title ? (
            <h2 id={id} className="card-title">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {aside}
        </div>
      )}
      {children}
    </section>
  )
}

export function Check({
  checked,
  onChange,
  label,
  small,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  small?: boolean
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className={cx('check', small && 'check-sm')}
      onClick={() => onChange(!checked)}
    >
      {checked && <CheckIcon size={small ? 10 : 12} strokeWidth={2.75} />}
    </button>
  )
}

/** Non-interactive status circle that shares the checkbox styling. */
export function StatusDot({ done }: { done: boolean }) {
  return (
    <span className="check check-sm" data-checked={done} aria-hidden>
      {done && <CheckIcon size={10} strokeWidth={3} />}
    </span>
  )
}

export function Progress({
  value,
  label,
  tone = 'cyan',
  className,
}: {
  value: number
  label: string
  tone?: 'cyan' | 'amber' | 'green'
  className?: string
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      className={cx('progress', className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      data-tone={tone}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Stat({ label, value, caption }: { label: string; value: ReactNode; caption?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-caption font-medium text-muted">{label}</span>
      <strong className="text-[26px] leading-[32px] font-medium tracking-[-0.65px] tabular-nums sm:text-stat sm:leading-[34px] sm:tracking-[-0.8px]">
        {value}
      </strong>
      {caption && <span className="truncate text-caption text-tertiary">{caption}</span>}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (value: T) => void
  options: Array<{ value: T; label: ReactNode; count?: number }>
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="segmented">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count != null && <span className="tabular-nums text-muted">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Field({
  label,
  optional,
  hint,
  group,
  children,
}: {
  label: ReactNode
  optional?: boolean
  hint?: ReactNode
  /** Render as a labelled group instead of a <label>, for multi-control fields. */
  group?: boolean
  children: ReactNode
}) {
  const id = useId()
  const caption = (
    <span id={id} className="text-label text-secondary">
      {label}
      {optional && <span className="text-faint"> (optional)</span>}
    </span>
  )
  const body = (
    <>
      {caption}
      {children}
      {hint && <span className="text-caption text-muted">{hint}</span>}
    </>
  )
  return group ? (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-2">
      {body}
    </div>
  ) : (
    <label className="flex flex-col gap-2">{body}</label>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-2 text-body text-muted">{children}</p>
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  ariaLabel,
  className,
  style,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  ariaLabel?: string
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={cx('sheet', className)}
      style={style}
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : ariaLabel}
      onClose={onClose}
      onMouseDown={(e) => {
        // The body fills the dialog, so a direct hit on <dialog> is a backdrop click.
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {open && (
        <div className="sheet-body">
          {title && (
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id={titleId} className="text-heading font-medium">
                  {title}
                </h2>
                {description && <p className="mt-1 text-label text-muted">{description}</p>}
              </div>
              <button
                type="button"
                className="icon-btn -mt-0.5 -mr-1.5"
                aria-label="Close dialog"
                onClick={onClose}
              >
                <X {...ic} />
              </button>
            </div>
          )}
          {children}
        </div>
      )}
    </dialog>
  )
}

/** "+ Add …" ghost button that expands into a one-line inline form. */
export function InlineAdd({
  buttonLabel,
  placeholder,
  onSubmit,
  className,
}: {
  buttonLabel: string
  placeholder: string
  onSubmit: (value: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const close = () => {
    setOpen(false)
    setValue('')
  }

  if (!open) {
    return (
      <button type="button" className={cx('btn btn-ghost mt-2 -ml-3.5', className)} onClick={() => setOpen(true)}>
        <Plus {...ic} />
        {buttonLabel}
      </button>
    )
  }

  return (
    <form
      className={cx('row mt-2 bg-wash', className)}
      onSubmit={(e) => {
        e.preventDefault()
        const text = value.trim()
        if (!text) return
        onSubmit(text)
        setValue('')
      }}
    >
      <input
        autoFocus
        className="inline-input"
        value={value}
        maxLength={140}
        placeholder={placeholder}
        aria-label={buttonLabel}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && close()}
        onBlur={() => !value.trim() && close()}
      />
      <button type="submit" className="btn btn-primary btn-sm" disabled={!value.trim()}>
        Add
      </button>
      <button type="button" className="icon-btn" aria-label="Cancel" onClick={close}>
        <X size={14} strokeWidth={1.5} />
      </button>
    </form>
  )
}

export function RemoveButton({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return (
    <button type="button" className={cx('icon-btn row-action', className)} aria-label={label} onClick={onClick}>
      <X size={14} strokeWidth={1.5} />
    </button>
  )
}

export function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden>
      <circle cx="18" cy="18" r="18" fill="var(--text)" />
      <circle cx="18" cy="18" r="6" fill="var(--base)" />
    </svg>
  )
}
