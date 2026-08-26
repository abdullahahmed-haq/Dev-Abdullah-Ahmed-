export const BLOG_LOCALES = Object.freeze(['ar', 'en'])
export const BLOG_STATES = Object.freeze(['draft', 'scheduled', 'published'])

export const DEFAULT_BLOG_STORE = Object.freeze({ schemaVersion: 1, posts: Object.freeze([]) })

function text(value, fallback = '', maxLength = 20_000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : fallback
}

function oneLine(value, fallback = '', maxLength = 240) {
  return text(value, fallback, maxLength).replace(/[\r\n]+/g, ' ')
}

function stringArray(value, maxItems = 16, maxLength = 80) {
  return Array.isArray(value)
    ? [...new Set(value.map((item) => oneLine(item, '', maxLength)).filter(Boolean))].slice(0, maxItems)
    : []
}

function safeUrl(value, { allowRelative = true } = {}) {
  const source = text(value, '', 2_000)
  if (!source) return ''
  if (allowRelative && source.startsWith('/media/blog/')) return source
  try {
    const url = new URL(source)
    return url.protocol === 'https:' ? url.href : ''
  } catch {
    return ''
  }
}

export function slugify(value) {
  const source = text(value, '', 180).toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').normalize('NFKD')
  const slug = source
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
  return slug || 'untitled'
}

function normalizeBlock(block, index) {
  const source = block && typeof block === 'object' ? block : {}
  const type = ['paragraph', 'heading', 'quote', 'callout', 'list', 'code', 'image', 'gallery', 'video', 'audio', 'divider', 'table', 'button', 'embed'].includes(source.type)
    ? source.type
    : 'paragraph'
  const base = { id: oneLine(source.id, `block-${index + 1}`, 100), type }

  if (type === 'divider') return base
  if (type === 'gallery') return { ...base, items: (Array.isArray(source.items) ? source.items : []).slice(0, 12).map((item) => ({ url: safeUrl(item?.url), alt: oneLine(item?.alt, '', 240), caption: text(item?.caption, '', 500) })).filter((item) => item.url) }
  if (type === 'image' || type === 'video' || type === 'audio') return { ...base, url: safeUrl(source.url), alt: oneLine(source.alt, '', 240), caption: text(source.caption, '', 500) }
  if (type === 'embed') {
    const url = safeUrl(source.url, { allowRelative: false })
    const permitted = /^(https:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\//i.test(url)
    return { ...base, url: permitted ? url : '', caption: text(source.caption, '', 500) }
  }
  if (type === 'code') return { ...base, code: text(source.code, '', 20_000), language: oneLine(source.language, 'text', 40), filename: oneLine(source.filename, '', 120) }
  if (type === 'table') return { ...base, rows: (Array.isArray(source.rows) ? source.rows : []).slice(0, 20).map((row) => (Array.isArray(row) ? row.slice(0, 8).map((cell) => oneLine(cell, '', 400)) : [])) }
  if (type === 'button') return { ...base, text: oneLine(source.text, '', 120), url: safeUrl(source.url), style: source.style === 'secondary' ? 'secondary' : 'primary' }
  if (type === 'list') return { ...base, ordered: Boolean(source.ordered), items: (Array.isArray(source.items) ? source.items : []).slice(0, 50).map((item) => text(item, '', 2_000)).filter(Boolean) }
  return { ...base, text: text(source.text, '', 20_000), level: type === 'heading' && source.level === 3 ? 3 : 2 }
}

function normalizeLocale(value, locale) {
  if (!value || typeof value !== 'object') return null
  const state = BLOG_STATES.includes(value.state) ? value.state : 'draft'
  const scheduledAt = state === 'scheduled' && !Number.isNaN(Date.parse(value.scheduledAt || '')) ? new Date(value.scheduledAt).toISOString() : ''
  const publishedAt = !Number.isNaN(Date.parse(value.publishedAt || '')) ? new Date(value.publishedAt).toISOString() : ''
  const title = oneLine(value.title, '', 180)
  const blocks = (Array.isArray(value.blocks) ? value.blocks : []).slice(0, 150).map(normalizeBlock)

  return {
    locale,
    state,
    slug: slugify(value.slug || title),
    title,
    excerpt: text(value.excerpt, '', 700),
    category: oneLine(value.category, '', 80),
    tags: stringArray(value.tags, 12, 60),
    cover: safeUrl(value.cover),
    coverAlt: oneLine(value.coverAlt, '', 240),
    seoTitle: oneLine(value.seoTitle, '', 180),
    seoDescription: oneLine(value.seoDescription, '', 300),
    scheduledAt,
    publishedAt,
    featured: Boolean(value.featured),
    blocks,
  }
}

export function normalizeBlogPost(value, index = 0) {
  const source = value && typeof value === 'object' ? value : {}
  const createdAt = !Number.isNaN(Date.parse(source.createdAt || '')) ? new Date(source.createdAt).toISOString() : new Date(0).toISOString()
  const updatedAt = !Number.isNaN(Date.parse(source.updatedAt || '')) ? new Date(source.updatedAt).toISOString() : createdAt
  const locales = {}
  for (const locale of BLOG_LOCALES) {
    const normalized = normalizeLocale(source.locales?.[locale], locale)
    if (normalized) locales[locale] = normalized
  }
  return {
    id: oneLine(source.id, `post-${index + 1}`, 120),
    createdAt,
    updatedAt,
    locales,
  }
}

export function normalizeBlogStore(value) {
  const source = value && typeof value === 'object' ? value : {}
  const posts = Array.isArray(source.posts) ? source.posts.slice(0, 500).map(normalizeBlogPost) : []
  return { schemaVersion: 1, posts }
}

export function isLocalePublic(locale, now = Date.now()) {
  if (!locale) return false
  if (locale.state === 'published') return true
  return locale.state === 'scheduled' && Boolean(locale.scheduledAt) && Date.parse(locale.scheduledAt) <= now
}

export function blockPlainText(block) {
  if (!block) return ''
  if (block.type === 'gallery') return block.items.map((item) => `${item.alt} ${item.caption}`).join(' ')
  if (block.type === 'list') return block.items.join(' ')
  if (block.type === 'table') return block.rows.flat().join(' ')
  return [block.text, block.code, block.caption, block.alt, block.filename].filter(Boolean).join(' ')
}

export function getReadingMinutes(locale) {
  const words = (locale?.blocks || []).map(blockPlainText).join(' ').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 210))
}

export function getLocalizedPost(post, locale) {
  const content = post?.locales?.[locale]
  return content ? { ...content, id: post.id, createdAt: post.createdAt, updatedAt: post.updatedAt } : null
}

export function publicPostSummary(post, locale) {
  const content = getLocalizedPost(post, locale)
  if (!content || !isLocalePublic(content)) return null
  return { ...content, readingMinutes: getReadingMinutes(content) }
}

export function searchText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064b-\u065f\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
}

export function matchesBlogQuery(content, query) {
  const needle = searchText(query)
  if (!needle) return true
  return searchText([content.title, content.excerpt, content.category, ...(content.tags || []), ...(content.blocks || []).map(blockPlainText)].join(' ')).includes(needle)
}

export function listPublicPosts(store, locale, { query = '', category = '', tag = '' } = {}, now = Date.now()) {
  return (store.posts || [])
    .map((post) => getLocalizedPost(post, locale))
    .filter((content) => content && isLocalePublic(content, now))
    .filter((content) => !category || content.category === category)
    .filter((content) => !tag || content.tags.includes(tag))
    .filter((content) => matchesBlogQuery(content, query))
    .map((content) => ({ ...content, readingMinutes: getReadingMinutes(content) }))
    .sort((left, right) => Date.parse(right.publishedAt || right.updatedAt) - Date.parse(left.publishedAt || left.updatedAt))
}

export function findPublicPost(store, locale, slug, now = Date.now()) {
  const post = (store.posts || []).find((item) => item.locales?.[locale]?.slug === slug)
  if (!post) return null
  const content = getLocalizedPost(post, locale)
  return isLocalePublic(content, now) ? { post, content: { ...content, readingMinutes: getReadingMinutes(content) } } : null
}

export function createEmptyBlogPost(locales = ['ar']) {
  const now = new Date().toISOString()
  const entries = {}
  for (const locale of BLOG_LOCALES) {
    if (!locales.includes(locale)) continue
    entries[locale] = normalizeLocale({ title: '', state: 'draft', blocks: [{ id: `block-${locale}-1`, type: 'paragraph', text: '' }] }, locale)
  }
  return { id: '', createdAt: now, updatedAt: now, locales: entries }
}
