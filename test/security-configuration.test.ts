import assert from 'node:assert/strict'
import test from 'node:test'

import nextConfig from '../next.config'

test('every route receives the application security header baseline', async () => {
  assert.equal(typeof nextConfig.headers, 'function')
  const rules = await nextConfig.headers!()
  const allRoutes = rules.find((rule) => rule.source === '/:path*')
  assert.ok(allRoutes)
  const headers = new Map(allRoutes.headers.map((header) => [header.key.toLowerCase(), header.value]))
  const policy = headers.get('content-security-policy') ?? ''
  assert.match(policy, /frame-ancestors 'none'/)
  assert.match(policy, /script-src[^;]*'unsafe-eval'/, 'development CSP must support React/Turbopack debugging')
  assert.equal(headers.get('x-content-type-options'), 'nosniff')
  assert.equal(headers.get('x-frame-options'), 'DENY')
  assert.equal(headers.get('referrer-policy'), 'strict-origin-when-cross-origin')
  assert.match(headers.get('permissions-policy') ?? '', /camera=\(\)/)
})
