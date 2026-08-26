import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Bold, Code2, FilePlus2, GripVertical, ImagePlus, Italic, Plus, Save, Settings2, Strikethrough, Trash2, X } from 'lucide-react'
import { createBlogPost, deleteBlogPost, updateBlogPost, uploadBlogMedia } from '../../lib/blog-api.js'
import { BLOG_LOCALES, createEmptyBlogPost, getReadingMinutes, slugify } from '../../lib/blog-model.js'
import { BlogBlocks } from './blog-blocks.jsx'
import './blog-article-page.css'
import './blog-editor.css'

const labels = {
  ar: { close: 'العودة', saving: 'جارٍ الحفظ…', saved: 'تم الحفظ', failed: 'تعذر الحفظ — محفوظ محليًا', conflict: 'يوجد تعديل أحدث', reload: 'تحميل نسخة الخادم', saveCopy: 'حفظ كنسخة', addLocale: 'إضافة لغة', title: 'عنوان المقال', excerpt: 'اكتب ملخصًا قصيرًا للمقال', slug: 'الرابط', category: 'التصنيف', tags: 'الوسوم (بفواصل)', cover: 'رابط الغلاف', coverAlt: 'وصف صورة الغلاف', seoTitle: 'عنوان SEO', seoDescription: 'وصف SEO', state: 'الحالة', draft: 'مسودة', published: 'منشور', scheduled: 'مجدول', scheduleAt: 'موعد النشر', save: 'حفظ', delete: 'حذف المقال', confirmDelete: 'اكتب عنوان المقال للحذف النهائي', cancel: 'إلغاء', confirm: 'حذف نهائيًا', upload: 'اختيار صورة', changeCover: 'تغيير الغلاف', remove: 'حذف', type: 'نوع الكتلة', paragraph: 'نص', heading: 'عنوان', quote: 'اقتباس', callout: 'تنبيه', list: 'قائمة', code: 'كود', image: 'صورة', gallery: 'معرض', video: 'فيديو', audio: 'صوت', divider: 'فاصل', table: 'جدول', button: 'زر رابط', embed: 'تضمين فيديو', body: 'ابدأ الكتابة…', url: 'الرابط', caption: 'التعليق', alt: 'الوصف البديل', language: 'لغة الكود', filename: 'اسم الملف', rows: 'كل صف في سطر، والخلايا مفصولة بـ |', galleryItems: 'رابط صورة في كل سطر', listItems: 'عنصر في كل سطر', ordered: 'قائمة مرقمة', featured: 'مقال مميز', toolbar: 'تنسيق', contents: 'في هذا المقال', settings: 'إعدادات المقال', blockSettings: 'إعدادات الكتلة', addContent: 'إضافة محتوى', reading: 'دقائق للقراءة', moveUp: 'تحريك لأعلى', moveDown: 'تحريك لأسفل', drag: 'اسحب لإعادة الترتيب' },
  en: { close: 'Back', saving: 'Saving…', saved: 'Saved', failed: 'Save failed — stored locally', conflict: 'A newer edit exists', reload: 'Load server version', saveCopy: 'Save as copy', addLocale: 'Add language', title: 'Article title', excerpt: 'Write a short article summary', slug: 'Slug', category: 'Category', tags: 'Tags (comma separated)', cover: 'Cover URL', coverAlt: 'Cover image description', seoTitle: 'SEO title', seoDescription: 'SEO description', state: 'State', draft: 'Draft', published: 'Published', scheduled: 'Scheduled', scheduleAt: 'Publish at', save: 'Save', delete: 'Delete article', confirmDelete: 'Type the article title to delete it permanently', cancel: 'Cancel', confirm: 'Delete permanently', upload: 'Choose image', changeCover: 'Change cover', remove: 'Remove', type: 'Block type', paragraph: 'Text', heading: 'Heading', quote: 'Quote', callout: 'Callout', list: 'List', code: 'Code', image: 'Image', gallery: 'Gallery', video: 'Video', audio: 'Audio', divider: 'Divider', table: 'Table', button: 'Link button', embed: 'Video embed', body: 'Start writing…', url: 'URL', caption: 'Caption', alt: 'Alt text', language: 'Code language', filename: 'Filename', rows: 'One row per line, cells separated with |', galleryItems: 'One image URL per line', listItems: 'One item per line', ordered: 'Numbered list', featured: 'Featured article', toolbar: 'Format', contents: 'In this article', settings: 'Article settings', blockSettings: 'Block settings', addContent: 'Add content', reading: 'min read', moveUp: 'Move up', moveDown: 'Move down', drag: 'Drag to reorder' },
}

const blockTypes = ['paragraph', 'heading', 'quote', 'callout', 'list', 'code', 'image', 'gallery', 'video', 'audio', 'divider', 'table', 'button', 'embed']

function newBlock(type) {
  const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `block-${Date.now()}`
  if (type === 'list') return { id, type, ordered: false, items: [''] }
  if (type === 'gallery') return { id, type, items: [] }
  if (type === 'code') return { id, type, language: 'js', filename: '', code: '' }
  if (type === 'table') return { id, type, rows: [['', ''], ['', '']] }
  if (type === 'button') return { id, type, text: '', url: '', style: 'primary' }
  if (type === 'heading') return { id, type, level: 2, text: '' }
  return { id, type, text: '', url: '', alt: '', caption: '' }
}

function dateInputValue(value) {
  return value ? new Date(value).toISOString().slice(0, 16) : ''
}

function editorDate(value, locale) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value || Date.now()))
}

export default function BlogEditor({ initial, initialTag, uiLanguage, onClose, onSaved, onDeleted }) {
  const [post, setPost] = useState(() => initial || createEmptyBlogPost([uiLanguage]))
  const [tag, setTag] = useState(initialTag || '')
  const [locale, setLocale] = useState(() => initial?.locales?.[uiLanguage] ? uiLanguage : Object.keys(initial?.locales || {})[0] || uiLanguage)
  const text = labels[locale]
  const [status, setStatus] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const timerRef = useRef(null)
  const latestRef = useRef(post)
  const dialogRef = useRef(null)
  const saveInFlightRef = useRef(false)
  const draftKey = `blog-draft:${post.id || 'new'}`

  useEffect(() => { latestRef.current = post }, [post])
  useEffect(() => () => window.clearTimeout(timerRef.current), [])
  useEffect(() => {
    dialogRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (confirmingDelete) setConfirmingDelete(false)
        else if (settingsOpen) setSettingsOpen(false)
        else if (addMenuOpen) setAddMenuOpen(false)
        else onClose()
      }
      if (event.key !== 'Tab') return
      const focusable = [...(dialogRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), summary, [href]') || [])].filter((element) => element.offsetParent !== null)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [addMenuOpen, confirmingDelete, onClose, settingsOpen])

  async function persist(next = latestRef.current) {
    if (saveInFlightRef.current || !Object.values(next.locales).some((entry) => entry.title.trim())) return
    saveInFlightRef.current = true
    setStatus('saving')
    try {
      const result = next.id ? await updateBlogPost(next, tag) : await createBlogPost(next)
      setPost(result.body.post); latestRef.current = result.body.post; setTag(result.tag); setStatus('saved')
      localStorage.removeItem(draftKey)
      onSaved?.(result.body.post, result.tag)
    } catch (error) {
      localStorage.setItem(draftKey, JSON.stringify(next))
      setStatus(error.code === 'REVISION_CONFLICT' ? 'conflict' : 'failed')
    } finally {
      saveInFlightRef.current = false
    }
  }

  function queueSave(next) {
    setPost(next); latestRef.current = next
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => persist(next), 650)
  }

  function updateLocale(patch) {
    const current = post.locales[locale]
    queueSave({ ...post, locales: { ...post.locales, [locale]: { ...current, ...patch } } })
  }

  function addLocale(nextLocale) {
    if (post.locales[nextLocale]) return setLocale(nextLocale)
    const template = createEmptyBlogPost([nextLocale]).locales[nextLocale]
    queueSave({ ...post, locales: { ...post.locales, [nextLocale]: template } })
    setLocale(nextLocale)
  }

  function updateBlock(index, patch) {
    const blocks = [...post.locales[locale].blocks]
    blocks[index] = { ...blocks[index], ...patch }
    updateLocale({ blocks })
  }

  function moveBlock(index, direction) {
    const blocks = [...post.locales[locale].blocks]
    const target = index + direction
    if (target < 0 || target >= blocks.length) return
    ;[blocks[index], blocks[target]] = [blocks[target], blocks[index]]
    updateLocale({ blocks })
  }

  function reorderBlocks(from, to) {
    if (from === to || from < 0 || to < 0) return
    const blocks = [...post.locales[locale].blocks]
    const [moved] = blocks.splice(from, 1)
    blocks.splice(to, 0, moved)
    updateLocale({ blocks })
  }

  async function upload(index, file) {
    if (!file) return
    try { setStatus('saving'); const media = await uploadBlogMedia(file); updateBlock(index, { url: media.url }) } catch { setStatus('failed') }
  }

  async function uploadCover(file) {
    if (!file) return
    try { setStatus('saving'); const media = await uploadBlogMedia(file); updateLocale({ cover: media.url }) } catch { setStatus('failed') }
  }

  async function removePost() {
    const title = post.locales[locale]?.title || ''
    if (!post.id || deleteText !== title) return
    try { await deleteBlogPost(post.id, tag); onDeleted?.(post.id); onClose() } catch { setStatus('failed') }
  }

  function saveAsCopy() {
    const copied = { ...post, id: '', locales: Object.fromEntries(Object.entries(post.locales).map(([key, value]) => [key, { ...value, slug: `${value.slug || 'untitled'}-copy`, state: 'draft', publishedAt: '', scheduledAt: '' }])) }
    setTag('')
    persist(copied)
  }

  const article = post.locales[locale]
  const headings = article.blocks.filter((block) => block.type === 'heading' && block.text)
  const stateText = status === 'saving' ? text.saving : status === 'saved' ? text.saved : status === 'conflict' ? text.conflict : status === 'failed' ? text.failed : ''

  return (
    <div className="blog-editor-overlay" role="presentation">
      <section className="blog-editor blog-article-page" role="dialog" aria-modal="true" aria-label={text.title} dir={locale === 'ar' ? 'rtl' : 'ltr'} tabIndex={-1} ref={dialogRef}>
        <header className="blog-editor-topbar">
          <div className="blog-editor-topbar-start"><button type="button" onClick={onClose} aria-label={text.close}><X aria-hidden="true" /><span>{text.close}</span></button><small className={`is-${status || 'idle'}`} aria-live="polite">{stateText}</small></div>
          <div className="blog-editor-topbar-actions">
            {status === 'conflict' && <><button type="button" onClick={() => window.location.reload()}>{text.reload}</button><button type="button" onClick={saveAsCopy}>{text.saveCopy}</button></>}
            <div className="blog-editor-locales">{BLOG_LOCALES.map((item) => post.locales[item] ? <button key={item} type="button" className={item === locale ? 'is-active' : ''} onClick={() => setLocale(item)} aria-label={`${text.addLocale}: ${item.toUpperCase()}`} aria-pressed={item === locale}>{item.toUpperCase()}</button> : <button key={item} type="button" onClick={() => addLocale(item)} aria-label={`${text.addLocale}: ${item.toUpperCase()}`}><Plus aria-hidden="true" />{item.toUpperCase()}</button>)}</div>
            <button type="button" className={settingsOpen ? 'is-active' : ''} onClick={() => setSettingsOpen((value) => !value)} aria-label={text.settings} aria-expanded={settingsOpen}><Settings2 aria-hidden="true" /><span>{text.settings}</span></button>
            <button className="is-primary" type="button" onClick={() => persist()} aria-label={text.save}><Save aria-hidden="true" /><span>{text.save}</span></button>
          </div>
        </header>

        <article className="blog-editor-canvas">
          <header className="blog-article-hero blog-editor-hero">
            <div className="blog-article-meta"><span>{article.category || text.category}</span><span>{editorDate(article.publishedAt || post.updatedAt, locale)}</span><span>{getReadingMinutes(article)} {text.reading}</span></div>
            <textarea className="blog-editor-title" rows="1" placeholder={text.title} aria-label={text.title} value={article.title} onChange={(event) => updateLocale({ title: event.target.value, slug: article.slug === slugify(article.title) || article.slug === 'untitled' ? slugify(event.target.value) : article.slug })} />
            <textarea className="blog-editor-excerpt" rows="1" placeholder={text.excerpt} aria-label={text.excerpt} value={article.excerpt} onChange={(event) => updateLocale({ excerpt: event.target.value })} />
            {article.cover ? <figure className="blog-editor-cover"><img src={article.cover} alt={article.coverAlt} decoding="async" /><label className="blog-editor-cover-action"><ImagePlus aria-hidden="true" />{text.changeCover}<input type="file" accept="image/*" onChange={(event) => uploadCover(event.target.files?.[0])} /></label></figure> : <label className="blog-editor-cover-empty"><ImagePlus aria-hidden="true" /><span>{text.upload}</span><input type="file" accept="image/*" onChange={(event) => uploadCover(event.target.files?.[0])} /></label>}
          </header>

          <div className={`blog-article-layout blog-editor-article-layout ${headings.length > 0 ? 'has-toc' : 'no-toc'}`}>
            {headings.length > 0 && <nav className="blog-article-toc blog-editor-toc" aria-label={text.contents}><p>{text.contents}</p>{headings.map((heading) => <button key={heading.id} type="button" className={`blog-toc-link is-level-${heading.level}`} onClick={() => document.getElementById(`editor-${heading.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>{heading.text}</button>)}</nav>}
            <div className="blog-article-content">
              <div className="blog-blocks blog-editor-blocks">{article.blocks.map((block, index) => <BlockEditor key={block.id} block={block} index={index} locale={locale} text={text} onChange={(patch) => updateBlock(index, patch)} onMove={moveBlock} onReorder={reorderBlocks} onRemove={() => updateLocale({ blocks: article.blocks.filter((_, itemIndex) => itemIndex !== index) })} onUpload={(file) => upload(index, file)} />)}</div>
              <div className="blog-editor-add-wrap"><button className="blog-editor-add-trigger" type="button" onClick={() => setAddMenuOpen((value) => !value)} aria-expanded={addMenuOpen}><Plus aria-hidden="true" />{text.addContent}</button>{addMenuOpen && <div className="blog-editor-add" role="menu">{blockTypes.map((type) => <button key={type} type="button" role="menuitem" onClick={() => { updateLocale({ blocks: [...article.blocks, newBlock(type)] }); setAddMenuOpen(false) }}><FilePlus2 aria-hidden="true" />{text[type]}</button>)}</div>}</div>
            </div>
          </div>
        </article>

        {settingsOpen && <><button className="blog-editor-settings-backdrop" type="button" aria-label={text.close} onClick={() => setSettingsOpen(false)} /><aside className="blog-editor-settings" aria-label={text.settings}><header><h2>{text.settings}</h2><button type="button" onClick={() => setSettingsOpen(false)} aria-label={text.close}><X aria-hidden="true" /></button></header><div className="blog-editor-settings-fields">
          <label>{text.state}<select value={article.state} onChange={(event) => updateLocale({ state: event.target.value, publishedAt: event.target.value === 'published' && !article.publishedAt ? new Date().toISOString() : article.publishedAt })}><option value="draft">{text.draft}</option><option value="published">{text.published}</option><option value="scheduled">{text.scheduled}</option></select></label>
          {article.state === 'scheduled' && <label>{text.scheduleAt}<input type="datetime-local" value={dateInputValue(article.scheduledAt)} onChange={(event) => updateLocale({ scheduledAt: event.target.value ? new Date(event.target.value).toISOString() : '' })} /></label>}
          <label>{text.category}<input value={article.category} onChange={(event) => updateLocale({ category: event.target.value })} /></label>
          <label>{text.tags}<input value={article.tags.join(', ')} onChange={(event) => updateLocale({ tags: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></label>
          <label>{text.slug}<input dir="ltr" value={article.slug} onChange={(event) => updateLocale({ slug: slugify(event.target.value) })} /></label>
          <label>{text.cover}<input dir="ltr" value={article.cover} onChange={(event) => updateLocale({ cover: event.target.value })} /></label>
          <label>{text.coverAlt}<input value={article.coverAlt} onChange={(event) => updateLocale({ coverAlt: event.target.value })} /></label>
          <label>{text.seoTitle}<input value={article.seoTitle} onChange={(event) => updateLocale({ seoTitle: event.target.value })} /></label>
          <label>{text.seoDescription}<textarea value={article.seoDescription} onChange={(event) => updateLocale({ seoDescription: event.target.value })} /></label>
          <label className="blog-editor-checkbox"><input type="checkbox" checked={article.featured} onChange={(event) => updateLocale({ featured: event.target.checked })} />{text.featured}</label>
          {post.id && <button className="blog-editor-delete" type="button" onClick={() => setConfirmingDelete(true)}><Trash2 aria-hidden="true" />{text.delete}</button>}
        </div></aside></>}

        {confirmingDelete && <div className="blog-editor-confirm"><div><h2>{text.delete}</h2><p>{text.confirmDelete}</p><input aria-label={text.confirmDelete} value={deleteText} onChange={(event) => setDeleteText(event.target.value)} /><footer><button type="button" onClick={() => setConfirmingDelete(false)}>{text.cancel}</button><button className="is-danger" type="button" onClick={removePost} disabled={deleteText !== (post.locales[locale]?.title || '')}>{text.confirm}</button></footer></div></div>}
      </section>
    </div>
  )
}

function BlockEditor({ block, index, locale, text, onChange, onMove, onReorder, onRemove, onUpload }) {
  const [dragOver, setDragOver] = useState(false)
  const textareaRef = useRef(null)
  const simpleText = ['paragraph', 'heading', 'quote', 'callout'].includes(block.type)
  const field = (label, key, extra = {}) => <label>{label}<input {...extra} value={block[key] || ''} onChange={(event) => onChange({ [key]: event.target.value })} /></label>

  function surround(marker) {
    const input = textareaRef.current
    const value = block.text || ''
    const start = input?.selectionStart ?? value.length
    const end = input?.selectionEnd ?? value.length
    onChange({ text: `${value.slice(0, start)}${marker}${value.slice(start, end) || 'text'}${marker}${value.slice(end)}` })
  }

  const toolbar = <div className="blog-live-block-toolbar"><button className="blog-block-drag" type="button" draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', String(index))} aria-label={text.drag}><GripVertical aria-hidden="true" /></button><select aria-label={text.type} value={block.type} onChange={(event) => onChange(newBlock(event.target.value))}>{blockTypes.map((type) => <option key={type} value={type}>{text[type]}</option>)}</select>{block.type === 'heading' && <select aria-label={text.type} value={block.level || 2} onChange={(event) => onChange({ level: Number(event.target.value) })}><option value="2">H2</option><option value="3">H3</option></select>}<span /><button type="button" onClick={() => onMove(index, -1)} aria-label={text.moveUp}><ArrowUp aria-hidden="true" /></button><button type="button" onClick={() => onMove(index, 1)} aria-label={text.moveDown}><ArrowDown aria-hidden="true" /></button><button type="button" onClick={onRemove} aria-label={text.remove}><Trash2 aria-hidden="true" /></button></div>

  let content
  if (simpleText) {
    const className = block.type === 'heading' ? `blog-live-heading is-h${block.level || 2}` : `blog-live-${block.type}`
    content = <><textarea id={block.type === 'heading' ? `editor-${block.id}` : undefined} ref={textareaRef} className={className} rows="1" aria-label={text.body} placeholder={text.body} value={block.text || ''} onChange={(event) => onChange({ text: event.target.value })} /><div className="blog-inline-toolbar" aria-label={text.toolbar}><span>{text.toolbar}</span><button type="button" onClick={() => surround('**')} aria-label="Bold"><Bold aria-hidden="true" /></button><button type="button" onClick={() => surround('*')} aria-label="Italic"><Italic aria-hidden="true" /></button><button type="button" onClick={() => surround('`')} aria-label="Code"><Code2 aria-hidden="true" /></button><button type="button" onClick={() => surround('~~')} aria-label="Strikethrough"><Strikethrough aria-hidden="true" /></button></div></>
  } else if (block.type === 'list') {
    content = <><textarea className="blog-live-list" aria-label={text.listItems} placeholder={text.listItems} value={(block.items || []).join('\n')} onChange={(event) => onChange({ items: event.target.value.split('\n') })} /><label className="blog-editor-checkbox blog-live-list-option"><input type="checkbox" checked={block.ordered} onChange={(event) => onChange({ ordered: event.target.checked })} />{text.ordered}</label></>
  } else if (block.type === 'code') {
    content = <figure className="blog-code blog-live-code"><figcaption><input aria-label={text.filename} placeholder={text.filename} value={block.filename || ''} onChange={(event) => onChange({ filename: event.target.value })} /><input aria-label={text.language} placeholder={text.language} value={block.language || ''} onChange={(event) => onChange({ language: event.target.value })} /></figcaption><textarea dir="ltr" aria-label={text.code} value={block.code || ''} onChange={(event) => onChange({ code: event.target.value })} /></figure>
  } else if (block.type === 'divider') {
    content = <hr />
  } else {
    const hasPreview = block.type === 'gallery' ? block.items?.some((item) => item.url) : block.type === 'table' ? block.rows?.some((row) => row.some(Boolean)) : Boolean(block.url || block.text)
    content = <><div className={`blog-live-preview${hasPreview ? '' : ' is-empty'}`}>{hasPreview ? <BlogBlocks blocks={[block]} locale={locale} /> : <span>{text[block.type]}</span>}</div><details className="blog-block-details" open={!hasPreview}><summary><Settings2 aria-hidden="true" />{text.blockSettings}</summary><div>
      {['image', 'video', 'audio'].includes(block.type) && <><div className="blog-block-fields">{field(text.url, 'url', { dir: 'ltr' })}{field(text.alt, 'alt')}</div><label className="blog-upload"><ImagePlus aria-hidden="true" />{text.upload}<input type="file" accept={block.type === 'image' ? 'image/*' : block.type === 'video' ? 'video/mp4' : 'audio/*'} onChange={(event) => onUpload(event.target.files?.[0])} /></label><input aria-label={text.caption} placeholder={text.caption} value={block.caption || ''} onChange={(event) => onChange({ caption: event.target.value })} /></>}
      {block.type === 'gallery' && <textarea aria-label={text.galleryItems} placeholder={text.galleryItems} value={(block.items || []).map((item) => item.url).join('\n')} onChange={(event) => onChange({ items: event.target.value.split('\n').filter(Boolean).map((url) => ({ url, alt: '', caption: '' })) })} />}
      {block.type === 'table' && <textarea aria-label={text.rows} placeholder={text.rows} value={(block.rows || []).map((row) => row.join(' | ')).join('\n')} onChange={(event) => onChange({ rows: event.target.value.split('\n').map((row) => row.split('|').map((cell) => cell.trim())) })} />}
      {block.type === 'button' && <div className="blog-block-fields">{field(text.body, 'text')}{field(text.url, 'url', { dir: 'ltr' })}</div>}
      {block.type === 'embed' && <div className="blog-block-fields">{field(text.url, 'url', { dir: 'ltr' })}{field(text.caption, 'caption')}</div>}
    </div></details></>
  }

  return <article className={`blog-live-block is-${block.type}${dragOver ? ' is-drag-over' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={(event) => { event.preventDefault(); setDragOver(false); onReorder(Number(event.dataTransfer.getData('text/plain')), index) }}>{toolbar}{content}</article>
}
