import assert from 'node:assert/strict'
import test from 'node:test'

import { ConfigurationError, siteOrigin } from '../lib/config/server'

test('server origin validation permits loopback HTTP but requires HTTPS for public hosts', () => {
  const previousOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN
  try {
    process.env.NEXT_PUBLIC_SITE_ORIGIN = 'http://localhost:3000'
    assert.equal(siteOrigin({ required: true }), 'http://localhost:3000')

    process.env.NEXT_PUBLIC_SITE_ORIGIN = 'http://example.com'
    assert.throws(() => siteOrigin({ required: true }), ConfigurationError)

    process.env.NEXT_PUBLIC_SITE_ORIGIN = 'https://portfolio.example/path'
    assert.equal(siteOrigin({ required: true }), 'https://portfolio.example')
  } finally {
    if (previousOrigin === undefined) delete process.env.NEXT_PUBLIC_SITE_ORIGIN
    else process.env.NEXT_PUBLIC_SITE_ORIGIN = previousOrigin
  }
})
