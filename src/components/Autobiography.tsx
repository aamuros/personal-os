import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { actions, useStore } from '../lib/store'
import type { AutobiographySection } from '../lib/types'
import './autobiography.css'

export function Autobiography() {
  const sections = useStore((s) => s.autobiography)
  const [selected, setSelected] = useState(sections[0]?.id)
  const [draft, setDraft] = useState<AutobiographySection | null>(null)
  const [saved, setSaved] = useState(false)
  const section = sections.find((item) => item.id === selected) ?? sections[0]

  function select(id: string) {
    setSelected(id)
    setSaved(false)
  }

  return <div className="autobiography">
    <header className="autobiography-header">
      <h2>My autobiography</h2>
      <p>A working draft from my recollections. Dates and details can be revised as I remember more.</p>
    </header>
    <div className="autobiography-layout">
      <nav className="autobiography-chapters" aria-label="Autobiography chapters">
        {sections.map((item, index) => <button type="button" key={item.id}
          aria-current={section?.id === item.id ? 'true' : undefined}
          disabled={draft !== null} onClick={() => select(item.id)}>
          <span>{String(index + 1).padStart(2, '0')}</span>{item.title}
        </button>)}
      </nav>
      {section && <article className="autobiography-story" aria-labelledby="autobiography-section-heading">
        <div className="autobiography-section-heading">
          <div>
            <p className="autobiography-period">{section.period}</p>
            <h3 id="autobiography-section-heading">{section.title}</h3>
          </div>
          {!draft && <button type="button" className="timeline-button timeline-secondary" onClick={() => {
            setDraft({ ...section })
            setSaved(false)
          }}><Pencil size={14} aria-hidden="true" />Edit chapter</button>}
        </div>
        {draft ? <form className="autobiography-editor" onSubmit={(event) => {
          event.preventDefault()
          if (!draft.title.trim() || !draft.body.trim()) return
          actions.updateAutobiographySection(draft.id, {
            title: draft.title.trim(), period: draft.period.trim(), body: draft.body.trim(),
          })
          setDraft(null)
          setSaved(true)
        }}>
          <label>Chapter title<input autoFocus required className="timeline-input" value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          <label>Period or date note<input className="timeline-input" value={draft.period}
            onChange={(event) => setDraft({ ...draft, period: event.target.value })} /></label>
          <label>My story<textarea required rows={18} className="timeline-input" value={draft.body}
            onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></label>
          <div className="autobiography-editor-actions">
            <button type="button" className="timeline-button timeline-secondary" onClick={() => setDraft(null)}>Cancel</button>
            <button type="submit" className="timeline-button" disabled={!draft.title.trim() || !draft.body.trim()}>Save chapter</button>
          </div>
        </form> : <div className="autobiography-prose" key={section.id}>
          {section.body.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        </div>}
        <p className="autobiography-save-status" role="status">{saved ? 'Chapter saved.' : ''}</p>
      </article>}
    </div>
  </div>
}
