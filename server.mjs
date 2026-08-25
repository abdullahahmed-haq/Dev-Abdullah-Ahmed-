import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { createServer as createViteServer, loadEnv } from 'vite'
import { DEFAULT_SITE_CONTENT, normalizeSiteContent } from './src/lib/content-model.js'
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
