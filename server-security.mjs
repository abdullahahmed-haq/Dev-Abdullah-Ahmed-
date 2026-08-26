import crypto from 'node:crypto'

export function parseCookies(header = '') {
  const cookies = {}

  for (const part of header.split(';')) {
    const separator = part.indexOf('=')
    if (separator < 0) continue

    const key = part.slice(0, separator).trim()
    if (!key) continue

    try {
      cookies[key] = decodeURIComponent(part.slice(separator + 1).trim())
    } catch {
      // Ignore malformed values instead of failing the entire request.
    }
  }

  return cookies
}

export function createSessionStore({ idleDuration, absoluteDuration, maxSessions = Number.POSITIVE_INFINITY, now = Date.now }) {
  const sessions = new Map()

  function removeExpired(currentTime) {
    for (const [token, session] of sessions) {
      if (session.idleExpiresAt <= currentTime || session.absoluteExpiresAt <= currentTime) sessions.delete(token)
    }
  }

  return {
    create(token) {
      const createdAt = now()
      removeExpired(createdAt)
      sessions.delete(token)
      sessions.set(token, {
        absoluteExpiresAt: createdAt + absoluteDuration,
        idleExpiresAt: Math.min(createdAt + idleDuration, createdAt + absoluteDuration),
      })
      while (sessions.size > maxSessions) sessions.delete(sessions.keys().next().value)
    },
    get(token) {
      const session = token ? sessions.get(token) : undefined
      const currentTime = now()
      if (!session || session.idleExpiresAt <= currentTime || session.absoluteExpiresAt <= currentTime) {
        if (token) sessions.delete(token)
        return null
      }

      session.idleExpiresAt = Math.min(currentTime + idleDuration, session.absoluteExpiresAt)
      sessions.delete(token)
      sessions.set(token, session)
      return token
    },
    delete(token) {
      sessions.delete(token)
    },
    size() {
      removeExpired(now())
      return sessions.size
    },
  }
}

export function isAllowedOrigin(origin, allowedOrigins) {
  if (!origin) return false

  try {
    const normalizedOrigin = new URL(origin).origin
    return allowedOrigins.some((allowedOrigin) => new URL(allowedOrigin).origin === normalizedOrigin)
  } catch {
    return false
  }
}

export function parseTrustProxy(value) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return 'loopback'
  if (normalized === 'false') return false
  if (normalized === 'true') {
    throw new Error('TRUST_PROXY=true is unsafe; configure trusted hops, addresses, or subnets explicitly.')
  }
  if (/^\d+$/.test(normalized)) return Number(normalized)
  return normalized
}

export function createLoginLimiter({ maxAttempts, blockDuration, maxEntries, now = Date.now }) {
  const attempts = new Map()

  function removeExpired(currentTime) {
    for (const [key, attempt] of attempts) {
      if (attempt.expiresAt <= currentTime) attempts.delete(key)
    }
  }

  function enforceLimit() {
    while (attempts.size > maxEntries) {
      attempts.delete(attempts.keys().next().value)
    }
  }

  return {
    check(key) {
      const currentTime = now()
      const attempt = attempts.get(key)
      if (!attempt || attempt.expiresAt <= currentTime) {
        if (attempt) attempts.delete(key)
        return { allowed: true, retryAfterSeconds: 0 }
      }
      if (attempt.blockedUntil <= currentTime) return { allowed: true, retryAfterSeconds: 0 }
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((attempt.blockedUntil - currentTime) / 1000)),
      }
    },
    recordFailure(key) {
      const currentTime = now()
      removeExpired(currentTime)
      const previous = attempts.get(key)
      const failures = (previous?.failures || 0) + 1
      const blockedUntil = failures >= maxAttempts ? currentTime + blockDuration : 0
      attempts.delete(key)
      attempts.set(key, {
        failures,
        blockedUntil,
        expiresAt: blockedUntil || currentTime + blockDuration,
      })
      enforceLimit()
    },
    clear(key) {
      attempts.delete(key)
    },
    size() {
      removeExpired(now())
      return attempts.size
    },
  }
}

export function createContentTag(content) {
  const digest = crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex')
  return `"${digest}"`
}

export function matchesContentTag(ifMatch, currentTag) {
  if (!ifMatch) return false
  return ifMatch.split(',').some((candidate) => candidate.trim() === currentTag)
}

export function getSecurityHeaders({ development, hsts = false }) {
  const scriptSource = development ? "script-src 'self' 'unsafe-eval'" : "script-src 'self'"
  const connectSource = development ? "connect-src 'self' ws: wss:" : "connect-src 'self'"
  const policy = [
    "default-src 'self'",
    "base-uri 'self'",
    connectSource,
    "font-src 'self' https://fonts.gstatic.com",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
    "img-src 'self' data: https:",
    "object-src 'none'",
    scriptSource,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    ...(!development ? ['upgrade-insecure-requests'] : []),
  ].join('; ')

  return {
    'Content-Security-Policy': policy,
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    ...(hsts ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {}),
  }
}
