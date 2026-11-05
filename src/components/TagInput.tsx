import { useId, useRef, useState } from 'react'
import './tag-input.css'

// Adapted from the independent recreation in the supplied Tag Input.html.
// Tags commit immediately; CSS owns only the chip/menu entrance animation.
const clean = (text: string) => text.replace(/\s+/g, ' ').trim()
const key = (text: string) => clean(text).toLowerCase()

export function TagInput({ value, onChange, suggestions = [], label = 'Tags', placeholder = 'Add tag…' }: {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: readonly string[]
  label?: string
  placeholder?: string
}) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [armed, setArmed] = useState(false)
  const [status, setStatus] = useState('')
  const options = [...new Map(suggestions.map((tag) => [key(tag), clean(tag)])).values()]
  const taken = new Set(value.map(key))
  const items = options.filter((tag) => !taken.has(key(tag)) && key(tag).includes(key(query))).slice(0, 5)
  const showMenu = open && items.length > 0
  const activeItem = showMenu ? items[active] : undefined

  function add(raw: string[]) {
    const next = [...value]
    const added: string[] = []
    for (const text of raw) {
      const tag = options.find((option) => key(option) === key(text)) ?? clean(text)
      if (!tag || next.some((item) => key(item) === key(tag))) continue
      next.push(tag)
      added.push(tag)
    }
    if (added.length) {
      onChange(next)
      setStatus(`${added.join(', ')} added`)
    }
    setQuery('')
    setActive(-1)
    setArmed(false)
  }

  function remove(tag: string) {
    onChange(value.filter((item) => item !== tag))
    setArmed(false)
    setStatus(`${tag} removed`)
    inputRef.current?.focus()
  }

  return <div className="tag-input" onBlur={(event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return
    setOpen(false)
    setActive(-1)
    setArmed(false)
  }}>
    <div className="tag-input-field" role="group" aria-label={label} onMouseDown={(event) => {
      if ((event.target as HTMLElement).closest('button, input, [role="option"]')) return
      event.preventDefault()
      inputRef.current?.focus()
    }}>
      {value.map((tag, index) => <span className="tag-input-chip" key={tag} data-armed={armed && index === value.length - 1 || undefined}>
        <span title={tag}>{tag}</span>
        <button className="tag-input-remove" type="button" aria-label={`Remove ${tag}`} onClick={() => remove(tag)}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" /></svg>
        </button>
      </span>)}
      <input ref={inputRef} className="tag-input-entry" value={query} placeholder={placeholder} aria-label={label}
        role="combobox" aria-expanded={showMenu} aria-controls={showMenu ? `${id}-list` : undefined}
        aria-autocomplete="list" aria-activedescendant={activeItem ? `${id}-option-${active}` : undefined}
        autoComplete="off" enterKeyHint="done" onFocus={() => setOpen(true)} onChange={(event) => {
          const text = event.target.value
          setOpen(true)
          setActive(-1)
          setArmed(false)
          if ((event.nativeEvent instanceof InputEvent && event.nativeEvent.isComposing) || !text.includes(',')) { setQuery(text); return }
          const parts = text.split(',')
          const tail = parts.pop() ?? ''
          add(parts)
          setQuery(tail)
        }} onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return
          if (event.key !== 'Backspace') setArmed(false)
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault()
            if (activeItem) add([activeItem])
            else if (clean(query)) add([query])
          } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && items.length) {
            event.preventDefault()
            setOpen(true)
            setActive(event.key === 'ArrowDown' ? (active + 1) % items.length : active <= 0 ? items.length - 1 : active - 1)
          } else if (event.key === 'Escape') {
            event.preventDefault()
            setOpen(false)
            setActive(-1)
          } else if (event.key === 'Backspace' && !query && value.length) {
            event.preventDefault()
            if (armed) remove(value[value.length - 1])
            else setArmed(true)
          }
        }} />
    </div>
    {showMenu && <ul className="tag-input-menu" id={`${id}-list`} role="listbox" aria-label={`${label} suggestions`}>
      {items.map((tag, index) => <li key={tag} id={`${id}-option-${index}`} role="option" aria-selected={active === index}
        onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => { add([tag]); inputRef.current?.focus() }}>{tag}</li>)}
    </ul>}
    <span className="sr-only" role="status">{status}</span>
  </div>
}
