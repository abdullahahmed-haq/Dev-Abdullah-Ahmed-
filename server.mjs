import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { createServer as createViteServer, loadEnv } from 'vite'
import { DEFAULT_SITE_CONTENT, normalizeSiteContent } from './src/lib/content-model.js'
import { DEFAULT_BLOG_STORE, BLOG_LOCALES, findPublicPost, isLocalePublic, listPublicPosts, normalizeBlogPost, normalizeBlogStore, publicPostSummary } from './src/lib/blog-model.js'
import {
  createContentTag,
  createLoginLimiter,
  createSessionStore,
  getSecurityHeaders,
  isAllowedOrigin,
  matchesContentTag,
  parseCookies,
  parseTrustProxy,
} from './server-security.mjs'

const rootDirectory = path.dirname(fileURLToPath(import.meta.url))
const development = process.argv.includes('--dev') || process.env.NODE_ENV !== 'production'
const mode = development ? 'development' : 'production'
const environment = { ...loadEnv(mode, rootDirectory, ''), ...process.env }
const contentFile = path.join(rootDirectory, 'data', 'site-content.json')
const blogFile = path.resolve(rootDirectory, environment.BLOG_DATA_FILE || 'data/blog-posts.json')
const blogMediaDirectory = path.resolve(rootDirectory, environment.BLOG_MEDIA_DIR || 'data/blog-media')
const sessionCookie = 'my_profile_admin'
const sessionIdleDuration = 30 * 60 * 1000
const sessionAbsoluteDuration = 12 * 60 * 60 * 1000
const sessions = createSessionStore({
  idleDuration: sessionIdleDuration,
  absoluteDuration: sessionAbsoluteDuration,
  maxSessions: 1_000,
})
const loginLimiter = createLoginLimiter({
  maxAttempts: 5,
  blockDuration: 10 * 60 * 1000,
  maxEntries: 10_000,
})
const configuredOrigins = String(environment.APP_ORIGIN || '').split(',').map((value) => value.trim()).filter(Boolean)
let contentWriteQueue = Promise.resolve()
let blogWriteQueue = Promise.resolve()

function cliValue(flag) {
  const index = process.argv.indexOf(flag)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function safeEqual(left, right) {
  const leftHash = crypto.createHash('sha256').update(String(left)).digest()
  const rightHash = crypto.createHash('sha256').update(String(right)).digest()
  return crypto.timingSafeEqual(leftHash, rightHash)
}

function getSession(request) {
  const token = parseCookies(request.headers.cookie)[sessionCookie]
  return sessions.get(token)
}

function requireAdmin(request, response, next) {
  if (!getSession(request)) {
    response.status(401).json({ code: 'UNAUTHENTICATED', message: 'Admin sign-in is required.' })
    return
  }
  next()
}

function requireSameOrigin(request, response, next) {
  const origin = request.get('origin')
  const requestOrigin = request.get('host') ? `${request.protocol}://${request.get('host')}` : ''
  const allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : [requestOrigin]
  if (!isAllowedOrigin(origin, allowedOrigins)) {
    response.status(403).json({ code: 'INVALID_ORIGIN', message: 'Request origin is not allowed.' })
    return
  }
  next()
}

async function readContent() {
  try {
    return normalizeSiteContent(JSON.parse(await fs.readFile(contentFile, 'utf8')))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    const initialContent = normalizeSiteContent(DEFAULT_SITE_CONTENT)
    await writeContent(initialContent)
    return initialContent
  }
}

async function writeContent(value) {
  const content = normalizeSiteContent(value)
  await fs.mkdir(path.dirname(contentFile), { recursive: true })
  const temporaryFile = `${contentFile}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`
  await fs.writeFile(temporaryFile, `${JSON.stringify(content, null, 2)}\n`, 'utf8')
  await fs.rename(temporaryFile, contentFile)
  return content
}

async function readBlogStore() {
  try {
    return normalizeBlogStore(JSON.parse(await fs.readFile(blogFile, 'utf8')))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    const initialStore = normalizeBlogStore(DEFAULT_BLOG_STORE)
    await writeBlogStore(initialStore)
    return initialStore
  }
}

async function writeBlogStore(value) {
  const store = normalizeBlogStore(value)
  await fs.mkdir(path.dirname(blogFile), { recursive: true })
  const temporaryFile = `${blogFile}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`
  await fs.writeFile(temporaryFile, `${JSON.stringify(store, null, 2)}\n`, 'utf8')
  await fs.rename(temporaryFile, blogFile)
  return store
}

function validLocale(value) {
  return BLOG_LOCALES.includes(value) ? value : ''
}

function getRequestOrigin(request) {
  return configuredOrigins[0] || (request.get('host') ? `${request.protocol}://${request.get('host')}` : '')
}

function escapeXml(value) {
  return String(value || '').replace(/[<>&'\"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[character]))
}

function postHasDuplicateSlug(store, post) {
  return store.posts.some((item) => item.id !== post.id && BLOG_LOCALES.some((locale) => post.locales[locale]?.slug && item.locales[locale]?.slug === post.locales[locale].slug))
}

function detectBlogMediaMime(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return 'image/webp'
  if (buffer.length >= 6 && (buffer.subarray(0, 6).toString() === 'GIF87a' || buffer.subarray(0, 6).toString() === 'GIF89a')) return 'image/gif'
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString() === 'ftyp') return 'video/mp4'
  if (buffer.length >= 3 && buffer.subarray(0, 3).toString() === 'ID3') return 'audio/mpeg'
  if (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return 'audio/mpeg'
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WAVE') return 'audio/wav'
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString() === 'OggS') return 'audio/ogg'
  return ''
}

const mediaExtensions = Object.freeze({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/ogg': 'ogg' })

const app = express()
app.set('trust proxy', parseTrustProxy(environment.TRUST_PROXY))
app.disable('x-powered-by')
app.use(express.json({ limit: '256kb' }))
app.use((_request, response, next) => {
  response.set(getSecurityHeaders({
    development,
    hsts: !development && environment.ENABLE_HSTS === 'true',
  }))
  next()
})
app.use('/api', (_request, response, next) => {
  response.set('Cache-Control', 'no-store')
  next()
})

app.get('/api/content', async (_request, response, next) => {
  try {
    const content = await readContent()
    response.set('ETag', createContentTag(content)).json({ content })
  } catch (error) {
    next(error)
  }
})

app.put('/api/content', requireSameOrigin, requireAdmin, async (request, response, next) => {
  try {
    const update = contentWriteQueue.then(async () => {
      const currentContent = await readContent()
      const currentTag = createContentTag(currentContent)
      if (!request.get('if-match')) {
        return { status: 428, tag: currentTag, body: { code: 'REVISION_REQUIRED', message: 'Reload before saving changes.' } }
      }
      if (!matchesContentTag(request.get('if-match'), currentTag)) {
        return { status: 412, tag: currentTag, body: { code: 'REVISION_CONFLICT', message: 'Content changed; reload before saving.' } }
      }

      const content = await writeContent(request.body)
      return { status: 200, tag: createContentTag(content), body: { content } }
    })
    contentWriteQueue = update.then(() => undefined, () => undefined)
    const result = await update
    response.status(result.status).set('ETag', result.tag).json(result.body)
  } catch (error) {
    next(error)
  }
})

app.get('/api/blog/:locale/posts', async (request, response, next) => {
  try {
    const locale = validLocale(request.params.locale)
    if (!locale) return response.status(404).json({ code: 'LOCALE_NOT_FOUND', message: 'Blog locale not found.' })
    const page = Math.max(1, Math.min(10_000, Number(request.query.page) || 1))
    const limit = Math.max(1, Math.min(24, Number(request.query.limit) || 9))
    const posts = listPublicPosts(await readBlogStore(), locale, { query: request.query.q, category: request.query.category, tag: request.query.tag })
    const categories = [...new Set(posts.map((post) => post.category).filter(Boolean))]
    const tags = [...new Set(posts.flatMap((post) => post.tags || []))]
    response.json({ posts: posts.slice((page - 1) * limit, page * limit), total: posts.length, page, limit, categories, tags })
  } catch (error) {
    next(error)
  }
})

app.get('/api/blog/:locale/posts/:slug', async (request, response, next) => {
  try {
    const locale = validLocale(request.params.locale)
    if (!locale) return response.status(404).json({ code: 'LOCALE_NOT_FOUND', message: 'Blog locale not found.' })
    const store = await readBlogStore()
    const found = findPublicPost(store, locale, request.params.slug)
    if (!found) return response.status(404).json({ code: 'POST_NOT_FOUND', message: 'Post not found.' })
    const related = listPublicPosts(store, locale)
      .filter((candidate) => candidate.id !== found.post.id)
      .filter((candidate) => candidate.category === found.content.category || candidate.tags.some((tag) => found.content.tags.includes(tag)))
      .slice(0, 3)
    const alternates = Object.fromEntries(BLOG_LOCALES.map((candidateLocale) => {
      const candidate = found.post.locales[candidateLocale]
      return [candidateLocale, candidate && isLocalePublic(candidate) ? { slug: candidate.slug, title: candidate.title } : null]
    }))
    response.set('ETag', createContentTag(found.post)).json({ post: found.content, related, alternates })
  } catch (error) {
    next(error)
  }
})

app.get('/api/admin/blog/posts', requireAdmin, async (_request, response, next) => {
  try {
    const store = await readBlogStore()
    response.json({ posts: store.posts.map((post) => ({ post, tag: createContentTag(post) })) })
  } catch (error) {
    next(error)
  }
})

app.post('/api/admin/blog/posts', requireSameOrigin, requireAdmin, async (request, response, next) => {
  try {
    const update = blogWriteQueue.then(async () => {
      const store = await readBlogStore()
      const now = new Date().toISOString()
      const post = normalizeBlogPost({ ...request.body, id: crypto.randomUUID(), createdAt: now, updatedAt: now }, store.posts.length)
      if (Object.keys(post.locales).length === 0) return { status: 400, body: { code: 'LOCALE_REQUIRED', message: 'At least one locale is required.' } }
      if (postHasDuplicateSlug(store, post)) return { status: 409, body: { code: 'DUPLICATE_SLUG', message: 'A post already uses this slug.' } }
      const nextStore = await writeBlogStore({ ...store, posts: [post, ...store.posts] })
      const stored = nextStore.posts.find((item) => item.id === post.id)
      return { status: 201, post: stored }
    })
    blogWriteQueue = update.then(() => undefined, () => undefined)
    const result = await update
    if (!result.post) return response.status(result.status).json(result.body)
    response.status(result.status).set('ETag', createContentTag(result.post)).json({ post: result.post })
  } catch (error) {
    next(error)
  }
})

app.put('/api/admin/blog/posts/:id', requireSameOrigin, requireAdmin, async (request, response, next) => {
  try {
    const update = blogWriteQueue.then(async () => {
      const store = await readBlogStore()
      const existing = store.posts.find((post) => post.id === request.params.id)
      if (!existing) return { status: 404, body: { code: 'POST_NOT_FOUND', message: 'Post not found.' } }
      const tag = createContentTag(existing)
      if (!request.get('if-match')) return { status: 428, tag, body: { code: 'REVISION_REQUIRED', message: 'Reload before saving changes.' } }
      if (!matchesContentTag(request.get('if-match'), tag)) return { status: 412, tag, body: { code: 'REVISION_CONFLICT', message: 'This post was changed elsewhere.' } }
      const post = normalizeBlogPost({ ...request.body, id: existing.id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() })
      if (Object.keys(post.locales).length === 0) return { status: 400, body: { code: 'LOCALE_REQUIRED', message: 'At least one locale is required.' } }
      if (postHasDuplicateSlug(store, post)) return { status: 409, body: { code: 'DUPLICATE_SLUG', message: 'A post already uses this slug.' } }
      const nextStore = await writeBlogStore({ ...store, posts: store.posts.map((item) => item.id === post.id ? post : item) })
      const stored = nextStore.posts.find((item) => item.id === post.id)
      return { status: 200, post: stored }
    })
    blogWriteQueue = update.then(() => undefined, () => undefined)
    const result = await update
    if (!result.post) return response.status(result.status).set(result.tag ? { ETag: result.tag } : {}).json(result.body)
    response.status(result.status).set('ETag', createContentTag(result.post)).json({ post: result.post })
  } catch (error) {
    next(error)
  }
})

app.delete('/api/admin/blog/posts/:id', requireSameOrigin, requireAdmin, async (request, response, next) => {
  try {
    const update = blogWriteQueue.then(async () => {
      const store = await readBlogStore()
      const existing = store.posts.find((post) => post.id === request.params.id)
      if (!existing) return { status: 404, body: { code: 'POST_NOT_FOUND', message: 'Post not found.' } }
      const tag = createContentTag(existing)
      if (!request.get('if-match')) return { status: 428, tag, body: { code: 'REVISION_REQUIRED', message: 'Reload before deleting.' } }
      if (!matchesContentTag(request.get('if-match'), tag)) return { status: 412, tag, body: { code: 'REVISION_CONFLICT', message: 'This post was changed elsewhere.' } }
      await writeBlogStore({ ...store, posts: store.posts.filter((post) => post.id !== existing.id) })
      return { status: 204 }
    })
    blogWriteQueue = update.then(() => undefined, () => undefined)
    const result = await update
    if (result.status === 204) return response.status(204).end()
    return response.status(result.status).set(result.tag ? { ETag: result.tag } : {}).json(result.body)
  } catch (error) {
    next(error)
  }
})

app.post('/api/admin/blog/media', requireSameOrigin, requireAdmin, express.raw({ type: () => true, limit: '24mb' }), async (request, response, next) => {
  try {
    const buffer = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0)
    const mimeType = detectBlogMediaMime(buffer)
    if (!mimeType || request.get('content-type')?.split(';')[0] !== mimeType) return response.status(415).json({ code: 'INVALID_MEDIA', message: 'Only verified images, MP4 video, and audio files are allowed.' })
    const filename = `${crypto.randomBytes(18).toString('hex')}.${mediaExtensions[mimeType]}`
    await fs.mkdir(blogMediaDirectory, { recursive: true })
    await fs.writeFile(path.join(blogMediaDirectory, filename), buffer, { flag: 'wx' })
    response.status(201).json({ url: `/media/blog/${filename}`, mimeType, filename: decodeURIComponent(request.get('x-filename') || filename).slice(0, 180) })
  } catch (error) {
    next(error)
  }
})

app.delete('/api/admin/blog/media/:filename', requireSameOrigin, requireAdmin, async (request, response, next) => {
  try {
    const filename = path.basename(request.params.filename)
    if (filename !== request.params.filename || !/^[a-f0-9]{36}\.(jpg|png|webp|gif|mp4|mp3|wav|ogg)$/.test(filename)) return response.status(400).json({ code: 'INVALID_MEDIA', message: 'Invalid media filename.' })
    const store = await readBlogStore()
    if (JSON.stringify(store).includes(`/media/blog/${filename}`)) return response.status(409).json({ code: 'MEDIA_IN_USE', message: 'This media item is still used by a post.' })
    await fs.unlink(path.join(blogMediaDirectory, filename)).catch((error) => { if (error.code !== 'ENOENT') throw error })
    response.status(204).end()
  } catch (error) {
    next(error)
  }
})

app.get('/blog/:locale/rss.xml', async (request, response, next) => {
  try {
    const locale = validLocale(request.params.locale)
    if (!locale) return response.status(404).end()
    const origin = getRequestOrigin(request)
    const posts = listPublicPosts(await readBlogStore(), locale)
    const items = posts.map((post) => `<item><title>${escapeXml(post.title)}</title><link>${escapeXml(`${origin}/blog/${locale}/${encodeURIComponent(post.slug)}`)}</link><guid>${escapeXml(`${origin}/blog/${locale}/${encodeURIComponent(post.slug)}`)}</guid><description>${escapeXml(post.excerpt)}</description><pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate></item>`).join('')
    response.type('application/rss+xml').send(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Blog</title><link>${escapeXml(`${origin}/blog/${locale}`)}</link><description>Personal notes and articles</description>${items}</channel></rss>`)
  } catch (error) {
    next(error)
  }
})

app.get('/sitemap.xml', async (request, response, next) => {
  try {
    const origin = getRequestOrigin(request)
    const store = await readBlogStore()
    const urls = BLOG_LOCALES.flatMap((locale) => [
      `<url><loc>${escapeXml(`${origin}/blog/${locale}`)}</loc></url>`,
      ...listPublicPosts(store, locale).map((post) => `<url><loc>${escapeXml(`${origin}/blog/${locale}/${encodeURIComponent(post.slug)}`)}</loc><lastmod>${post.updatedAt.slice(0, 10)}</lastmod></url>`),
    ])
    response.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`)
  } catch (error) {
    next(error)
  }
})

app.get('/robots.txt', (request, response) => {
  const origin = getRequestOrigin(request)
  response.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`)
})

app.get('/api/auth/session', (request, response) => {
  response.json({ authenticated: Boolean(getSession(request)) })
})

app.post('/api/auth/login', requireSameOrigin, (request, response) => {
  const username = environment.ADMIN_USERNAME
  const password = environment.ADMIN_PASSWORD
  if (!username || !password || password.length < 12) {
    response.status(503).json({
      code: 'ADMIN_NOT_CONFIGURED',
      message: 'The admin account is not configured on the server.',
    })
    return
  }

  const address = request.ip || request.socket.remoteAddress || 'unknown'
  const limit = loginLimiter.check(address)
  if (!limit.allowed) {
    response.set('Retry-After', String(limit.retryAfterSeconds))
    response.status(429).json({ code: 'TOO_MANY_ATTEMPTS', message: 'Try again in a few minutes.' })
    return
  }

  const valid = safeEqual(request.body?.username || '', username)
    && safeEqual(request.body?.password || '', password)
  if (!valid) {
    loginLimiter.recordFailure(address)
    response.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'Incorrect username or password.' })
    return
  }

  loginLimiter.clear(address)
  const token = crypto.randomBytes(32).toString('base64url')
  sessions.create(token)
  response.cookie(sessionCookie, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: !development,
    maxAge: sessionAbsoluteDuration,
    path: '/',
  })
  response.json({ authenticated: true })
})

app.post('/api/auth/logout', requireSameOrigin, (request, response) => {
  const token = parseCookies(request.headers.cookie)[sessionCookie]
  if (token) sessions.delete(token)
  response.clearCookie(sessionCookie, { httpOnly: true, sameSite: 'strict', secure: !development, path: '/' })
  response.json({ authenticated: false })
})

app.use('/media/blog', express.static(blogMediaDirectory, {
  fallthrough: true,
  immutable: true,
  maxAge: '30d',
  index: false,
}))
app.use('/media/blog', (_request, response) => response.status(404).json({ code: 'MEDIA_NOT_FOUND', message: 'Media not found.' }))

if (development) {
  const vite = await createViteServer({
    root: rootDirectory,
    server: { middlewareMode: true },
    appType: 'spa',
  })
  app.use(vite.middlewares)
} else {
  const distDirectory = path.join(rootDirectory, 'dist')
  app.use(express.static(distDirectory, { index: false }))
  app.get('/blog', (_request, response) => response.redirect(302, '/blog/en'))
  app.get('/blog/:locale', async (request, response, next) => {
    try {
      const locale = validLocale(request.params.locale)
      if (!locale) return next()
      const origin = getRequestOrigin(request)
      const profile = await readContent()
      const title = locale === 'ar' ? `مدونة | ${profile.settings.siteTitle}` : `Blog | ${profile.settings.siteTitle}`
      const description = locale === 'ar' ? 'مقالات عن التصميم والتطوير والتجارب الرقمية.' : 'Articles about design, development, and digital experiments.'
      const canonical = `${origin}/blog/${locale}`
      const alternateLinks = BLOG_LOCALES.map((item) => `<link rel="alternate" hreflang="${item}" href="${escapeXml(`${origin}/blog/${item}`)}" />`).join('')
      const metadata = `<meta name="description" content="${escapeXml(description)}" /><link rel="canonical" href="${escapeXml(canonical)}" />${alternateLinks}<meta property="og:type" content="website" /><meta property="og:title" content="${escapeXml(title)}" /><meta property="og:description" content="${escapeXml(description)}" /><meta property="og:url" content="${escapeXml(canonical)}" />`
      const template = await fs.readFile(path.join(distDirectory, 'index.html'), 'utf8')
      response.type('html').send(template.replace('<title>My Profile</title>', `<title>${escapeXml(title)}</title>`).replace(/<meta name="description"[^>]*>/, '').replace('</head>', `${metadata}</head>`))
    } catch (error) {
      next(error)
    }
  })
  app.get('/blog/:locale/:slug', async (request, response, next) => {
    try {
      const locale = validLocale(request.params.locale)
      const found = locale ? findPublicPost(await readBlogStore(), locale, request.params.slug) : null
      if (!found) return next()
      const origin = getRequestOrigin(request)
      const canonical = `${origin}/blog/${locale}/${encodeURIComponent(found.content.slug)}`
      const profile = await readContent()
      const title = found.content.seoTitle || `${found.content.title} | ${profile.settings.siteTitle}`
      const description = found.content.seoDescription || found.content.excerpt
      const image = found.content.cover || ''
      const alternateLinks = BLOG_LOCALES.map((item) => {
        const alternate = found.post.locales[item]
        return alternate && isLocalePublic(alternate) ? `<link rel="alternate" hreflang="${item}" href="${escapeXml(`${origin}/blog/${item}/${encodeURIComponent(alternate.slug)}`)}" />` : ''
      }).join('')
      const jsonLd = JSON.stringify({ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: found.content.title, description, datePublished: found.content.publishedAt, dateModified: found.content.updatedAt, mainEntityOfPage: canonical, image: image || undefined, inLanguage: locale, author: { '@type': 'Person', name: profile.profile.name }, publisher: { '@type': 'Organization', name: profile.settings.siteTitle } }).replace(/</g, '\\u003c')
      const metadata = `<meta name="description" content="${escapeXml(description)}" /><link rel="canonical" href="${escapeXml(canonical)}" />${alternateLinks}<meta property="og:type" content="article" /><meta property="og:locale" content="${locale === 'ar' ? 'ar_AR' : 'en_US'}" /><meta property="og:title" content="${escapeXml(title)}" /><meta property="og:description" content="${escapeXml(description)}" />${image ? `<meta property="og:image" content="${escapeXml(image)}" />` : ''}<meta property="og:url" content="${escapeXml(canonical)}" /><script type="application/ld+json">${jsonLd}</script>`
      const template = await fs.readFile(path.join(distDirectory, 'index.html'), 'utf8')
      response.type('html').send(template.replace('<title>My Profile</title>', `<title>${escapeXml(title)}</title>`).replace(/<meta name="description"[^>]*>/, '').replace('</head>', `${metadata}</head>`))
    } catch (error) {
      next(error)
    }
  })
  app.use((request, response, next) => {
    if (request.method !== 'GET') {
      next()
      return
    }
    response.sendFile(path.join(distDirectory, 'index.html'))
  })
}

app.use((error, _request, response, _next) => {
  console.error(error)
  response.status(error?.type === 'entity.too.large' ? 413 : 500).json({
    code: 'SERVER_ERROR',
    message: 'The server could not complete this request.',
  })
})

const port = Number(cliValue('--port') || environment.PORT || 5173)
const host = cliValue('--host') || environment.HOST || '127.0.0.1'
app.listen(port, host, () => {
  console.log(`My Profile is running at http://${host}:${port}`)
})
