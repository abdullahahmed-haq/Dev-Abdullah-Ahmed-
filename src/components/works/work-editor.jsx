import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { DEFAULT_PROJECT_COLOR } from '../../lib/site-content.js'
import ProjectColorPicker from '../ui/project-color-picker.jsx'

export default function WorkEditor({ project, text, onSave, onClose }) {
  const [form, setForm] = useState(() => project || { title: '', type: '', url: '', color: DEFAULT_PROJECT_COLOR })
  const dialogRef = useRef(null)

  useEffect(() => {
    dialogRef.current?.focus()
    const closeOnEscape = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  function submit(event) {
    event.preventDefault()
    if (!form.title.trim()) return
    onSave({ ...form, title: form.title.trim(), color: form.color || DEFAULT_PROJECT_COLOR })
  }

  return (
    <div className="work-editor-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="work-editor" role="dialog" aria-modal="true" aria-labelledby="work-editor-title" tabIndex={-1} ref={dialogRef}>
        <header><div><p>{text.editorEyebrow}</p><h2 id="work-editor-title">{project ? text.editWork : text.addWork}</h2></div><button type="button" onClick={onClose} aria-label={text.closeEditor}><X aria-hidden="true" /></button></header>
        <form onSubmit={submit}>
          <label>{text.projectName}<input autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
          <label>{text.category}<input value={form.type || ''} onChange={(event) => setForm({ ...form, type: event.target.value })} /></label>
          <label>{text.url}<input dir="ltr" type="url" value={form.url || ''} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://" /></label>
          <ProjectColorPicker label={text.folderColor} value={form.color || DEFAULT_PROJECT_COLOR} onChange={(color) => setForm({ ...form, color })} />
          <div className="work-editor-actions"><button type="button" onClick={onClose}>{text.cancel}</button><button type="submit">{text.save}</button></div>
        </form>
      </section>
    </div>
  )
}
