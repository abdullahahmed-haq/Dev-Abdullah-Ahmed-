import { z } from 'zod'

import { canonicalBytes, sha256 } from './canonical-json'
import { LOCALES, type CompiledRelease, type Locale, type PublishedPageChrome, type PublishedPayload, type PublishedSeo, type ReleaseFileKind, type ReleaseIndex } from './types'

const schemaVersion = 1
const rendererVersion = 1
const MAX_INDEX_BYTES = 256 * 1024

const localeSchema = z.enum(LOCALES)
const releaseIdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{6}Z-[0-9A-HJKMNP-TV-Z]{26}$/)

export interface PublishableSource {
  revision: number
  site: Record<string, unknown>
  blog: Record<string, unknown> & { posts?: Array<Record<string, unknown>> }
}

interface ReleaseBuildOptions {
  releaseId: string
  createdAt?: Date
  now?: Date
  canonicalOrigin?: string
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function localized(value: unknown, locale: Locale, fallback = ''): string {
  if (typeof value === 'string') return value.trim() || fallback
  if (!value || typeof value !== 'object') return fallback
  const record = value as Record<string, unknown>
  return text(record[locale], text(record.en, text(record.ar, fallback)))
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function validSlug(value: unknown): string {
  const slug = text(value).normalize('NFC')
  if (!/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(slug)) throw new Error(`Invalid published slug: ${slug || '(empty)'}`)
  return slug
}

function isPublic(locale: Record<string, unknown>, now: number): boolean {
  const state = text(locale.state)
  if (state === 'published') return Boolean(text(locale.publishedAt))
  return state === 'scheduled' && Boolean(text(locale.scheduledAt)) && Date.parse(text(locale.scheduledAt)) <= now
}

function publishedLocale(value: Record<string, unknown>, now: number): Record<string, unknown> | null {
  if (!('draft' in value || 'live' in value || 'scheduled' in value)) return isPublic(value, now) ? value : null
  const scheduled = object(value.scheduled)
  if (scheduled && Date.parse(text(scheduled.publishAt)) <= now) {
    const snapshot = object(scheduled.snapshot)
    return Object.keys(snapshot).length ? { ...snapshot, publishedAt: text(scheduled.publishAt) } : null
  }
  const live = object(value.live)
  const snapshot = object(live.snapshot)
  return Object.keys(snapshot).length && text(live.publishedAt) ? { ...snapshot, publishedAt: text(live.publishedAt) } : null
}

function chrome(site: Record<string, unknown>, locale: Locale): PublishedPageChrome {
  const profile = object(site.profile)
  const settings = object(site.settings)
  const brand = localized(settings.siteTitle, locale, localized(profile.name, locale, 'Portfolio'))
  return {
    brand,
    navigation: [
      { href: `/${locale}`, label: locale === 'ar' ? 'الرئيسية' : 'Home' },
      { href: `/${locale}/works`, label: locale === 'ar' ? 'الأعمال' : 'Works' },
      { href: `/${locale}/blog`, label: locale === 'ar' ? 'المدونة' : 'Blog' },
      { href: `/${locale}/contact`, label: locale === 'ar' ? 'تواصل' : 'Contact' },
    ],
    contactLabel: locale === 'ar' ? 'تواصل' : 'Contact',
  }
}

function seo(title: string, description: string, canonicalPath: string): PublishedSeo {
  return { title, description, canonicalPath }
}

function payload<T>(releaseId: string, locale: Locale, kind: string, pageSeo: PublishedSeo, pageChrome: PublishedPageChrome, data: T): PublishedPayload<T> {
  return {
    schemaVersion,
    minimumRendererVersion: rendererVersion,
    releaseId,
    locale,
    kind,
    seo: pageSeo,
    chrome: pageChrome,
    data,
  }
}

function projectData(project: Record<string, unknown>, locale: Locale) {
  const document = object(project.document)
  const slug = validSlug(project.slug || project.id)
  const title = localized(document.title, locale)
  if (!title) throw new Error(`Project ${slug} is missing a ${locale} title.`)
  return {
    id: text(project.id, slug),
    slug,
    title,
    category: localized(document.category, locale),
    summary: localized(document.summary, locale),
    client: localized(document.client, locale),
    role: localized(document.role, locale),
    duration: localized(document.duration, locale),
    year: text(document.year),
    cover: document.cover ?? null,
    color: text(project.color, '#d5aa21'),
    tools: Array.isArray(document.tools) ? document.tools : [],
    sections: Array.isArray(document.sections) ? document.sections : [],
  }
}

function articleData(post: Record<string, unknown>, locale: Locale, now: number) {
  const local = publishedLocale(object(object(post.locales)[locale]), now)
  if (!local) return null
  const slug = validSlug(local.slug)
  const title = text(local.title)
  if (!title) throw new Error(`Article ${slug} is missing a ${locale} title.`)
  return {
    id: text(post.id, slug),
    slug,
    title,
    excerpt: text(local.excerpt),
    category: text(local.category),
    tags: Array.isArray(local.tags) ? local.tags.map((tag) => text(tag)).filter(Boolean) : [],
    cover: text(local.cover),
    coverAlt: text(local.coverAlt),
    publishedAt: text(local.publishedAt || local.scheduledAt),
    updatedAt: text(post.updatedAt),
    featured: Boolean(local.featured),
    document: Array.isArray(local.document) ? local.document : [],
  }
}

function ulid(date: Date): string {
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
  let timestamp = date.getTime()
  let value = ''
  for (let index = 0; index < 10; index += 1) {
    value = alphabet[timestamp % 32] + value
    timestamp = Math.floor(timestamp / 32)
  }
  const random = crypto.getRandomValues(new Uint8Array(16))
  for (const byte of random) value += alphabet[byte % 32]
  return value.slice(0, 26)
}

export function createReleaseId(date = new Date()): string {
  const iso = date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  return `${iso.slice(0, 8)}-${iso.slice(9, 15)}Z-${ulid(date)}`.replace(/^(\d{4})(\d{2})(\d{2})-/, '$1-$2-$3T')
}

export async function compileRelease(source: PublishableSource, options: ReleaseBuildOptions): Promise<CompiledRelease> {
  releaseIdSchema.parse(options.releaseId)
  if (!Number.isSafeInteger(source.revision) || source.revision < 0) throw new Error('A non-negative integer source revision is required.')

  const createdAt = options.createdAt ?? new Date()
  const now = (options.now ?? createdAt).getTime()
  const origin = (options.canonicalOrigin ?? 'https://portfolio.example').replace(/\/$/, '')
  const files = new Map<string, Uint8Array>()
  const kinds = new Map<string, ReleaseFileKind>()
  const sitemapUrls: Array<{ loc: string; lastModified?: string }> = []
  const rssFeeds: Record<Locale, { title: string; path: string; items: Array<{ title: string; description: string; path: string; publishedAt: string }> }> = {
    en: { title: 'Blog', path: '/en/blog/rss.xml', items: [] },
    ar: { title: 'المدونة', path: '/ar/blog/rss.xml', items: [] },
  }
  const site = object(source.site)
  const profile = object(site.profile)
  const settings = object(site.settings)
  const projects = Array.isArray(site.projects) ? site.projects.map(object).filter((project) => object(project.document).title) : []
  const posts = Array.isArray(source.blog.posts) ? source.blog.posts.map(object) : []

  async function add(key: string, kind: ReleaseFileKind, value: unknown) {
    if (files.has(key)) throw new Error(`Duplicate release key: ${key}`)
    const bytes = canonicalBytes(value)
    files.set(key, bytes)
    kinds.set(key, kind)
  }

  async function addPagedIndex<T extends Record<string, unknown>>(
    key: string,
    kind: 'works-index' | 'blog-index',
    locale: Locale,
    contentKind: string,
    pageSeo: PublishedSeo,
    pageChrome: PublishedPageChrome,
    collectionName: 'projects' | 'articles',
    entries: T[],
  ) {
    const build = (items: T[], page: number, pageCount: number) => payload(
      options.releaseId,
      locale,
      contentKind,
      pageSeo,
      pageChrome,
      { [collectionName]: items, pagination: { page, pageCount, total: entries.length } },
    )

    if (canonicalBytes(build(entries, 1, 1)).byteLength <= MAX_INDEX_BYTES) {
      await add(key, kind, build(entries, 1, 1))
      return
    }

    // Keep headroom for the final page count, which is only known after chunking.
    const chunks: T[][] = []
    let chunk: T[] = []
    for (const entry of entries) {
      const candidate = [...chunk, entry]
      if (canonicalBytes(build(candidate, chunks.length + 1, 0)).byteLength > MAX_INDEX_BYTES - 1024) {
        if (chunk.length === 0) throw new Error(`${key} contains one card that exceeds the ${MAX_INDEX_BYTES} byte index limit.`)
        chunks.push(chunk)
        chunk = [entry]
      } else {
        chunk = candidate
      }
    }
    if (chunk.length > 0 || chunks.length === 0) chunks.push(chunk)

    for (const [index, items] of chunks.entries()) {
      const page = index + 1
      const shardKey = page === 1 ? key : key.replace(/\.json$/, `-p${page}.json`)
      const value = build(items, page, chunks.length)
      if (canonicalBytes(value).byteLength > MAX_INDEX_BYTES) throw new Error(`${shardKey} exceeds the ${MAX_INDEX_BYTES} byte index limit.`)
      await add(shardKey, kind, value)
    }
  }

  await add('site.json', 'site', {
    schemaVersion,
    supportedLocales: LOCALES,
    canonicalOrigin: origin,
    identity: { name: text(profile.name), email: text(profile.email), role: text(profile.role) },
    social: object(settings.social),
    redirects: object(settings.redirects),
    seoDefaults: object(settings.seo),
  })

  for (const locale of LOCALES) {
    const pageChrome = chrome(site, locale)
    const localizedProjects = projects.map((project) => projectData(project, locale))
    const localizedArticles = posts.map((post) => articleData(post, locale, now)).filter((article): article is NonNullable<typeof article> => Boolean(article))
      .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt))

    sitemapUrls.push({ loc: `/${locale}` }, { loc: `/${locale}/contact` }, { loc: `/${locale}/works` }, { loc: `/${locale}/blog` })

    await add(`pages/${locale}-home.json`, 'page', payload(
      options.releaseId,
      locale,
      'home',
      seo(pageChrome.brand, localized(profile.bio, locale), `/${locale}`),
      pageChrome,
      {
        profile: { name: localized(profile.name, locale, text(profile.name)), role: localized(profile.role, locale, text(profile.role)), bio: localized(profile.bio, locale, text(profile.bio)) },
        availability: Boolean(settings.availability),
        featuredProjects: localizedProjects.slice(0, 3).map(({ sections, ...summary }) => summary),
        latestArticles: localizedArticles.slice(0, 3).map(({ document, ...summary }) => summary),
      },
    ))

    await add(`pages/${locale}-contact.json`, 'page', payload(
      options.releaseId,
      locale,
      'contact',
      seo(locale === 'ar' ? 'تواصل' : 'Contact', localized(profile.bio, locale), `/${locale}/contact`),
      pageChrome,
      { email: text(profile.email), availability: Boolean(settings.availability) },
    ))

    const workIndex = localizedProjects.map(({ sections, ...summary }) => summary)
    await addPagedIndex(
      `works/${locale}-index.json`,
      'works-index',
      locale,
      'works-index',
      seo(locale === 'ar' ? 'الأعمال' : 'Works', '', `/${locale}/works`),
      pageChrome,
      'projects',
      workIndex,
    )

    for (const project of localizedProjects) {
      sitemapUrls.push({ loc: `/${locale}/works/${encodeURIComponent(project.slug)}` })
      await add(`works/projects/${project.slug}-${locale}.json`, 'project', payload(
        options.releaseId,
        locale,
        'project',
        seo(project.title, project.summary, `/${locale}/works/${encodeURIComponent(project.slug)}`),
        pageChrome,
        project,
      ))
    }

    const blogIndex = localizedArticles.map(({ document, ...summary }) => summary)
    await addPagedIndex(
      `blog/${locale}-index.json`,
      'blog-index',
      locale,
      'blog-index',
      seo(locale === 'ar' ? 'المدونة' : 'Blog', '', `/${locale}/blog`),
      pageChrome,
      'articles',
      blogIndex,
    )

    for (const article of localizedArticles) {
      const path = `/${locale}/blog/${encodeURIComponent(article.slug)}`
      sitemapUrls.push({ loc: path, lastModified: article.updatedAt || article.publishedAt })
      rssFeeds[locale].items.push({ title: article.title, description: article.excerpt, path, publishedAt: article.publishedAt })
      await add(`blog/articles/${article.slug}-${locale}.json`, 'article', payload(
        options.releaseId,
        locale,
        'article',
        seo(article.title, article.excerpt, `/${locale}/blog/${encodeURIComponent(article.slug)}`),
        pageChrome,
        article,
      ))
    }
  }

  await add('sitemap.json', 'sitemap', { urls: sitemapUrls.sort((left, right) => left.loc.localeCompare(right.loc)) })
  await add('rss.json', 'rss', { generatedAt: createdAt.toISOString(), feeds: rssFeeds })

  const filesIndex: ReleaseIndex['files'] = {}
  for (const [key, bytes] of [...files.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    if ((kinds.get(key) === 'works-index' || kinds.get(key) === 'blog-index') && bytes.byteLength > MAX_INDEX_BYTES) {
      throw new Error(`${key} exceeds the ${MAX_INDEX_BYTES} byte index limit.`)
    }
    filesIndex[key] = { sha256: await sha256(bytes), bytes: bytes.byteLength, kind: kinds.get(key)! }
  }

  const index: ReleaseIndex = {
    schemaVersion,
    minimumRendererVersion: rendererVersion,
    releaseId: options.releaseId,
    sourceRevision: source.revision,
    createdAt: createdAt.toISOString(),
    files: filesIndex,
  }
  const indexBytes = canonicalBytes(index)
  return { index, indexBytes, files }
}

export function assertPublishedLocale(value: string): Locale {
  return localeSchema.parse(value)
}
