import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createContentTag,
  createLoginLimiter,
  createSessionStore,
  getSecurityHeaders,
  isAllowedOrigin,
  matchesContentTag,
  parseCookies,
  parseTrustProxy,
} from '../server-security.mjs'

test('malformed cookie values are ignored without discarding valid cookies', () => {
  assert.deepEqual(parseCookies('session=valid; malformed=%; name=Abdullah%20Ahmed'), {
    session: 'valid',
    name: 'Abdullah Ahmed',
  })
})

test('sessions expire at an absolute deadline despite continued activity', () => {
  let now = 0
  const sessions = createSessionStore({
    idleDuration: 5_000,
    absoluteDuration: 10_000,
    now: () => now,
  })

  sessions.create('token')
  now = 4_000
  assert.equal(sessions.get('token'), 'token')
  now = 8_000
  assert.equal(sessions.get('token'), 'token')
  now = 10_000
  assert.equal(sessions.get('token'), null)
})

test('session storage removes expired records and remains bounded', () => {
  let now = 0
  const sessions = createSessionStore({
    idleDuration: 5_000,
    absoluteDuration: 10_000,
    maxSessions: 2,
    now: () => now,
  })

  sessions.create('first')
  sessions.create('second')
  sessions.create('third')
  assert.equal(sessions.size(), 2)
  assert.equal(sessions.get('first'), null)

  now = 10_001
  assert.equal(sessions.size(), 0)
})

test('origin validation requires an exact configured origin', () => {
  const allowed = ['https://profile.example.com']

  assert.equal(isAllowedOrigin('https://profile.example.com', allowed), true)
  assert.equal(isAllowedOrigin('http://profile.example.com', allowed), false)
  assert.equal(isAllowedOrigin('https://admin.profile.example.com', allowed), false)
  assert.equal(isAllowedOrigin(undefined, allowed), false)
  assert.equal(isAllowedOrigin('not a url', allowed), false)
})

test('proxy trust defaults to loopback and rejects trust-all configuration', () => {
  assert.equal(parseTrustProxy(undefined), 'loopback')
  assert.equal(parseTrustProxy('false'), false)
  assert.equal(parseTrustProxy('2'), 2)
  assert.throws(() => parseTrustProxy('true'), /TRUST_PROXY/)
})

test('login limiting is isolated by key, expires, and remains bounded', () => {
  let now = 0
  const limiter = createLoginLimiter({
    maxAttempts: 2,
    blockDuration: 1_000,
    maxEntries: 2,
    now: () => now,
  })

  limiter.recordFailure('client-a')
  limiter.recordFailure('client-a')
  assert.deepEqual(limiter.check('client-a'), { allowed: false, retryAfterSeconds: 1 })
  assert.deepEqual(limiter.check('client-b'), { allowed: true, retryAfterSeconds: 0 })

  limiter.recordFailure('client-b')
  limiter.recordFailure('client-c')
  assert.equal(limiter.size(), 2)

  now = 1_001
  assert.deepEqual(limiter.check('client-a'), { allowed: true, retryAfterSeconds: 0 })
})

test('content tags are stable and change when content changes', () => {
  const first = createContentTag({ title: 'First' })

  assert.match(first, /^"[a-f0-9]{64}"$/)
  assert.equal(first, createContentTag({ title: 'First' }))
  assert.notEqual(first, createContentTag({ title: 'Second' }))
  assert.equal(matchesContentTag(first, first), true)
  assert.equal(matchesContentTag(`"stale", ${first}`, first), true)
  assert.equal(matchesContentTag(undefined, first), false)
})

test('production security headers prevent framing and narrow browser capabilities', () => {
  const headers = getSecurityHeaders({ development: false })

  assert.equal(headers['X-Frame-Options'], 'DENY')
  assert.equal(headers['X-Content-Type-Options'], 'nosniff')
  assert.match(headers['Content-Security-Policy'], /frame-ancestors 'none'/)
  assert.match(headers['Permissions-Policy'], /camera=\(\)/)
})
