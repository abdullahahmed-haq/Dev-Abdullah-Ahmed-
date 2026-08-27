export const BLOG_SCHEMA_VERSION = 2
export const BLOG_LOCALES = Object.freeze(['ar', 'en'])

const MAX_BLOCKS = 150
const MAX_DEPTH = 6
const TEXT_LIMIT = 20_000
const URL_LIMIT = 2_000

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function text(value, fallback = '', limit = TEXT_LIMIT) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : fallback
}

function line(value, fallback = '', limit = 240) {
  return text(value, fallback, limit).replace(/[\r\n]+/g, ' ')
}

export function safeUrl(value, { allowLocal = true } = {}) {
  const source = text(value, '', URL_LIMIT)
  if (!source) return ''
  if (allowLocal && source.startsWith('/media/blog/')) return source
  try {
    const url = new URL(source)
    return url.protocol === 'https:' ? url.href : ''
  } catch {
    return ''
  }
}

export function slugify(value) {
  const source = text(value, '', 180).toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').normalize('NFKD')
  const slug = source.replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 120)
  return slug || 'untitled'
}

function id(value, fallback) {
  return line(value, fallback, 100)
}

function inlineText(value) {
  const source = text(value)
  if (!source) return []
  const parts = []
  const matcher = /(\*\*[^*]+\*\*|~~[^~]+~~|`[^`]+`|\*[^*]+\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g
  let cursor = 0
  for (const match of source.matchAll(matcher)) {
    if (match.index > cursor) parts.push({ type: 'text', text: source.slice(cursor, match.index), styles: {} })
    const token = match[0]
    const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/)
    if (link) parts.push({ type: 'link', content: link[1], href: safeUrl(link[2], { allowLocal: false }) })
    else if (token.startsWith('**')) parts.push({ type: 'text', text: token.slice(2, -2), styles: { bold: true } })
    else if (token.startsWith('~~')) parts.push({ type: 'text', text: token.slice(2, -2), styles: { strike: true } })
    else if (token.startsWith('`')) parts.push({ type: 'text', text: token.slice(1, -1), styles: { code: true } })
    else parts.push({ type: 'text', text: token.slice(1, -1), styles: { italic: true } })
    cursor = match.index + token.length
  }
  if (cursor < source.length) parts.push({ type: 'text', text: source.slice(cursor), styles: {} })
  return parts.filter((part) => part.type !== 'link' ? part.text : part.content)
}

function normalizeInline(value) {
  if (typeof value === 'string') return inlineText(value)
  if (!Array.isArray(value)) return []
  return value.slice(0, 1_000).flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    if (item.type === 'link') {
      const content = line(item.content, '', 4_000)
      const href = safeUrl(item.href, { allowLocal: false })
      return content && href ? [{ type: 'link', content, href }] : []
    }
    if (item.type !== 'text') return []
    const styles = item.styles && typeof item.styles === 'object' ? item.styles : {}
    return [{ type: 'text', text: text(item.text, '', 4_000), styles: {
      bold: Boolean(styles.bold), italic: Boolean(styles.italic), underline: Boolean(styles.underline), strike: Boolean(styles.strike), code: Boolean(styles.code),
      textColor: ['default', 'gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'].includes(styles.textColor) ? styles.textColor : 'default',
      backgroundColor: ['default', 'gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'].includes(styles.backgroundColor) ? styles.backgroundColor : 'default',
    } }]
  }).filter((item) => item.text)
}

function normalizeBlock(value, index, depth = 0) {
  if (!value || typeof value !== 'object' || depth > MAX_DEPTH) return null
  const type = ['paragraph', 'heading', 'bulletListItem', 'numberedListItem', 'checkListItem', 'toggleListItem', 'quote', 'callout', 'codeBlock', 'divider', 'table', 'image', 'gallery', 'video', 'audio', 'embed', 'button', 'columnList', 'column'].includes(value.type) ? value.type : 'paragraph'
  const block = { ...value, id: id(value.id, `block-${index + 1}`), type, props: {}, content: [], children: [] }
  const sourceProps = value.props && typeof value.props === 'object' ? value.props : {}
  if (type === 'heading') block.props.level = [2, 3, 4].includes(Number(sourceProps.level)) ? Number(sourceProps.level) : 2
  if (type === 'checkListItem') block.props.checked = Boolean(sourceProps.checked)
  if (type === 'codeBlock') { block.props.language = line(sourceProps.language, 'text', 40); block.content = text(value.content, '', TEXT_LIMIT) }
  else if (type === 'divider') block.content = []
  else if (type === 'image' || type === 'video' || type === 'audio') {
    block.props = { url: safeUrl(sourceProps.url), alt: line(sourceProps.alt, '', 240), caption: text(sourceProps.caption, '', 500), name: line(sourceProps.name, '', 180) }
  } else if (type === 'gallery') {
    block.props.items = Array.isArray(sourceProps.items) ? sourceProps.items.slice(0, 12).map((item) => ({ url: safeUrl(item?.url), alt: line(item?.alt, '', 240), caption: text(item?.caption, '', 500) })).filter((item) => item.url) : []
  } else if (type === 'embed') {
    const url = safeUrl(sourceProps.url, { allowLocal: false })
    block.props = { url: /^(https:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\//i.test(url) ? url : '', caption: text(sourceProps.caption, '', 500) }
  } else if (type === 'button') {
    block.props = { url: safeUrl(sourceProps.url), style: sourceProps.style === 'secondary' ? 'secondary' : 'primary' }
    block.content = normalizeInline(value.content)
  } else if (type === 'table') {
    const rows = value.content?.rows
    block.content = { rows: Array.isArray(rows) ? rows.slice(0, 20).map((row) => ({ cells: Array.isArray(row?.cells) ? row.cells.slice(0, 8).map(normalizeInline) : [] })) : [] }
  } else if (type === 'columnList') {
    block.props.columns = Math.max(2, Math.min(3, Number(sourceProps.columns) || 2))
  } else if (type === 'column') {
    block.props.width = Math.max(20, Math.min(80, Number(sourceProps.width) || 50))
  } else {
    block.props = { textAlignment: ['left', 'center', 'right', 'justify'].includes(sourceProps.textAlignment) ? sourceProps.textAlignment : 'left' }
    block.content = normalizeInline(value.content)
  }
  block.children = Array.isArray(value.children) ? value.children.slice(0, MAX_BLOCKS).map((child, childIndex) => normalizeBlock(child, childIndex, depth + 1)).filter(Boolean) : []
  if (type === 'columnList' && (block.children.length < 2 || block.children.length > 3 || block.children.some((child) => child.type !== 'column'))) return { ...block, type: 'paragraph', props: { textAlignment: 'left' }, content: [] }
  if (type === 'column' && block.children.some((child) => child.type === 'columnList' || child.type === 'column')) block.children = block.children.filter((child) => child.type !== 'columnList' && child.type !== 'column')
  return block
}

function legacyBlockToBlocks(block, index) {
  const base = { ...(block && typeof block === 'object' ? block : {}), id: id(block?.id, `legacy-${index + 1}`), children: [] }
  const type = block?.type || 'paragraph'
  if (type === 'list') return (Array.isArray(block.items) ? block.items : ['']).slice(0, 50).map((item, listIndex) => ({ ...base, id: `${base.id}-${listIndex + 1}`, type: block.ordered ? 'numberedListItem' : 'bulletListItem', props: { textAlignment: 'left' }, content: inlineText(item) }))
  if (type === 'heading') return [{ ...base, type: 'heading', props: { level: block.level === 3 ? 3 : 2 }, content: inlineText(block.text) }]
  if (type === 'quote') return [{ ...base, type: 'quote', props: { textAlignment: 'left' }, content: inlineText(block.text) }]
  if (type === 'callout') return [{ ...base, type: 'callout', props: { textAlignment: 'left' }, content: inlineText(block.text) }]
  if (type === 'code') return [{ ...base, type: 'codeBlock', props: { language: line(block.language, 'text', 40), filename: line(block.filename, '', 120) }, content: text(block.code) }]
  if (type === 'divider') return [{ ...base, type: 'divider', props: {}, content: [] }]
  if (['image', 'video', 'audio'].includes(type)) return [{ ...base, type, props: { url: safeUrl(block.url), alt: line(block.alt, '', 240), caption: text(block.caption, '', 500), name: '' }, content: [] }]
  if (type === 'gallery') return [{ ...base, type: 'gallery', props: { items: Array.isArray(block.items) ? block.items.map((item) => ({ url: safeUrl(item?.url), alt: line(item?.alt, '', 240), caption: text(item?.caption, '', 500) })).filter((item) => item.url) : [] }, content: [] }]
  if (type === 'table') return [{ ...base, type: 'table', props: {}, content: { rows: Array.isArray(block.rows) ? block.rows.map((row) => ({ cells: Array.isArray(row) ? row.map((cell) => inlineText(cell)) : [] })) : [] } }]
  if (type === 'button') return [{ ...base, type: 'button', props: { url: safeUrl(block.url), style: block.style === 'secondary' ? 'secondary' : 'primary' }, content: inlineText(block.text) }]
  if (type === 'embed') return [{ ...base, type: 'embed', props: { url: safeUrl(block.url, { allowLocal: false }), caption: text(block.caption, '', 500) }, content: [] }]
  return [{ ...base, type: 'paragraph', props: { textAlignment: 'left' }, content: inlineText(block?.text) }]
}

export function createEmptyDocument() {
  return [{ id: `block-${crypto.randomUUID?.() || Date.now()}`, type: 'paragraph', props: { textAlignment: 'left' }, content: [], children: [] }]
}

export function createEmptySnapshot() {
  return { title: '', excerpt: '', slug: 'untitled', category: '', tags: [], cover: '', coverAlt: '', seoTitle: '', seoDescription: '', featured: false, document: createEmptyDocument() }
}

export function createEmptyBlogPost(locales = ['en']) {
  const now = new Date().toISOString()
  const entries = {}
  for (const locale of BLOG_LOCALES) if (locales.includes(locale)) entries[locale] = { locale, draft: createEmptySnapshot(), live: null, scheduled: null }
  return { id: '', createdAt: now, updatedAt: now, locales: entries }
}

export function normalizeSnapshot(value) {
  const source = value && typeof value === 'object' ? value : {}
  const blocks = Array.isArray(source.document) ? source.document : []
  return {
    title: line(source.title, '', 180), excerpt: text(source.excerpt, '', 700), slug: slugify(source.slug || source.title), category: line(source.category, '', 80),
    tags: Array.isArray(source.tags) ? [...new Set(source.tags.map((item) => line(item, '', 60)).filter(Boolean))].slice(0, 12) : [],
    cover: safeUrl(source.cover), coverAlt: line(source.coverAlt, '', 240), seoTitle: line(source.seoTitle, '', 180), seoDescription: line(source.seoDescription, '', 300), featured: Boolean(source.featured),
    document: blocks.slice(0, MAX_BLOCKS).map((block, index) => normalizeBlock(block, index)).filter(Boolean),
  }
}

function snapshotFromLegacy(value) {
  return normalizeSnapshot({ ...value, document: (Array.isArray(value?.blocks) ? value.blocks : []).flatMap(legacyBlockToBlocks) })
}

function validDate(value) {
  return !Number.isNaN(Date.parse(value || '')) ? new Date(value).toISOString() : ''
}

export function normalizeLocale(value, locale, now = Date.now()) {
  const source = value && typeof value === 'object' ? value : {}
  if ('draft' in source || 'live' in source || 'scheduled' in source) {
    const live = source.live && typeof source.live === 'object' ? { snapshot: normalizeSnapshot(source.live.snapshot), publishedAt: validDate(source.live.publishedAt) } : null
    const scheduled = source.scheduled && typeof source.scheduled === 'object' && validDate(source.scheduled.publishAt) ? { snapshot: normalizeSnapshot(source.scheduled.snapshot), publishAt: validDate(source.scheduled.publishAt), createdAt: validDate(source.scheduled.createdAt) || new Date(now).toISOString() } : null
    return { ...source, locale, draft: normalizeSnapshot(source.draft), live: live?.publishedAt ? live : null, scheduled }
  }
  const draft = snapshotFromLegacy(source)
  const state = source.state === 'published' ? 'published' : source.state === 'scheduled' ? 'scheduled' : 'draft'
  const publishedAt = validDate(source.publishedAt)
  const scheduledAt = validDate(source.scheduledAt)
  const dueScheduledLegacy = state === 'scheduled' && scheduledAt && Date.parse(scheduledAt) <= now
  return {
    ...source,
    locale,
    draft,
    // A legacy scheduled post whose time is already due becomes a public snapshot
    // during migration; it must never disappear merely because the old timer missed it.
    live: state === 'published' && publishedAt ? { snapshot: draft, publishedAt } : dueScheduledLegacy ? { snapshot: draft, publishedAt: scheduledAt } : null,
    scheduled: state === 'scheduled' && scheduledAt && Date.parse(scheduledAt) > now ? { snapshot: draft, publishAt: scheduledAt, createdAt: new Date(now).toISOString() } : null,
  }
}

export function normalizePost(value, index = 0, now = Date.now()) {
  const source = value && typeof value === 'object' ? value : {}
  const locales = {}
  for (const locale of BLOG_LOCALES) if (source.locales?.[locale]) locales[locale] = normalizeLocale(source.locales[locale], locale, now)
  const createdAt = validDate(source.createdAt) || new Date(now).toISOString()
  return { ...source, id: id(source.id, `post-${index + 1}`, 120), createdAt, updatedAt: validDate(source.updatedAt) || createdAt, locales }
}

export function normalizeStore(value, now = Date.now()) {
  const source = value && typeof value === 'object' ? value : {}
  return { ...source, schemaVersion: BLOG_SCHEMA_VERSION, posts: Array.isArray(source.posts) ? source.posts.slice(0, 500).map((post, index) => normalizePost(post, index, now)) : [] }
}

export function publicLocale(locale, now = Date.now()) {
  if (!locale) return null
  if (locale.scheduled && Date.parse(locale.scheduled.publishAt) <= now) return { ...locale.scheduled.snapshot, publishedAt: locale.scheduled.publishAt }
  return locale.live ? { ...locale.live.snapshot, publishedAt: locale.live.publishedAt } : null
}

export function publicationState(locale, now = Date.now()) {
  const publicSnapshot = publicLocale(locale, now)
  if (locale?.scheduled && Date.parse(locale.scheduled.publishAt) > now) return publicSnapshot ? 'scheduled-with-live' : 'scheduled'
  if (!publicSnapshot) return 'draft'
  return JSON.stringify(locale.draft) === JSON.stringify(publicSnapshot) ? 'published' : 'unpublished-changes'
}

export function documentPlainText(blocks = []) {
  const collect = (block) => {
    if (!block) return ''
    const content = typeof block.content === 'string' ? block.content : Array.isArray(block.content) ? block.content.map((item) => item.type === 'link' ? item.content : item.text).join(' ') : block.type === 'table' ? (block.content?.rows || []).flatMap((row) => row.cells || []).flatMap((cell) => cell || []).map((item) => item.type === 'link' ? item.content : item.text).join(' ') : ''
    const props = block.props || {}
    const extra = block.type === 'gallery' ? (props.items || []).map((item) => `${item.alt} ${item.caption}`).join(' ') : `${props.caption || ''} ${props.alt || ''}`
    return `${content} ${extra} ${(block.children || []).map(collect).join(' ')}`
  }
  return blocks.map(collect).join(' ').replace(/\s+/g, ' ').trim()
}

export function applyCommand(post, command, now = new Date()) {
  const next = clone(post)
  const locale = command.locale
  if (!BLOG_LOCALES.includes(locale) || !next.locales?.[locale]) throw new Error('The selected article language does not exist.')
  const current = next.locales[locale]
  if (command.type === 'save-draft') current.draft = normalizeSnapshot(command.snapshot)
  else if (command.type === 'publish-locale') { current.live = { snapshot: normalizeSnapshot(current.draft), publishedAt: now.toISOString() }; current.scheduled = null }
  else if (command.type === 'schedule-locale') {
    const publishAt = validDate(command.publishAt)
    if (!publishAt || Date.parse(publishAt) <= now.getTime()) throw new Error('Schedule time must be in the future.')
    current.scheduled = { snapshot: normalizeSnapshot(current.draft), publishAt, createdAt: now.toISOString() }
  } else if (command.type === 'cancel-schedule') current.scheduled = null
  else if (command.type === 'unpublish-locale') { current.live = null; current.scheduled = null }
  else if (command.type === 'restore-snapshot') current.draft = normalizeSnapshot(command.snapshot)
  else throw new Error('Unknown authoring command.')
  next.updatedAt = now.toISOString()
  return next
}
