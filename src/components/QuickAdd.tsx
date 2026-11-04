import { useState } from 'react'
import { todayKey } from '../lib/date'
import { actions } from '../lib/store'
import { Dialog, Field } from './ui'

export function QuickAddDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="New priority" description="Adds to today’s list on your dashboard.">
      <QuickAddForm onDone={onClose} />
    </Dialog>
  )
}

function QuickAddForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim()) return
        actions.addPriority(title.trim(), time || undefined, todayKey())
        onDone()
      }}
    >
      <Field label="Priority">
        <input
          autoFocus
          required
          className="input"
          maxLength={120}
          placeholder="What would you like to do?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <Field label="Time" optional>
        <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <button type="submit" className="btn btn-primary mt-1 w-full" disabled={!title.trim()}>
        Add priority
      </button>
    </form>
  )
}
