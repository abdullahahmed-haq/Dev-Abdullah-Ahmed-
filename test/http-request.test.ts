import assert from 'node:assert/strict'
import test from 'node:test'
import { z } from 'zod'

import { PublicHttpError } from '../lib/http/errors'
import { parseFormBody, parseJsonBody } from '../lib/http/request'

test('JSON request parsing validates content type, size, and schema at one seam', async () => {
  const schema = z.object({ name: z.string() }).strict()
  const request = new Request('https://example.com/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Ada' }),
  })
  assert.deepEqual(await parseJsonBody(request, schema), { name: 'Ada' })

  await assert.rejects(
    parseJsonBody(new Request('https://example.com/api', { method: 'POST', body: 'plain text' }), schema),
    (error: unknown) => error instanceof PublicHttpError && error.status === 415,
  )

  await assert.rejects(
    parseJsonBody(new Request('https://example.com/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'long value' }),
    }), schema, 8),
    (error: unknown) => error instanceof PublicHttpError && error.status === 413,
  )
})

test('form request parsing preserves standard form fields while enforcing a byte limit', async () => {
  const request = new Request('https://example.com/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'name=Ada&locale=en',
  })
  const form = await parseFormBody(request, 128)
  assert.equal(form.get('name'), 'Ada')
  assert.equal(form.get('locale'), 'en')
})

test('form request parsing supports bounded multipart submissions', async () => {
  const source = new FormData()
  source.set('name', 'Ada')
  source.set('cf-turnstile-response', 'token')
  const request = new Request('https://example.com/api', { method: 'POST', body: source })
  const form = await parseFormBody(request, 1024)
  assert.equal(form.get('name'), 'Ada')
  assert.equal(form.get('cf-turnstile-response'), 'token')
})
