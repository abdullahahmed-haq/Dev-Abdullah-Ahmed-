import assert from 'node:assert/strict'
import test from 'node:test'

import { ContactSubmissionService, type ChallengeVerifier, type ContactMessageRepository } from '../lib/contact/submission'
import { PublicHttpError } from '../lib/http/errors'

const validInput = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: '',
  projectType: 'Website',
  message: 'A sufficiently clear project request.',
  locale: 'en',
  turnstileToken: 'challenge-token',
}

test('contact submission verifies the challenge and persists only privacy-safe data', async () => {
  let verifiedToken = ''
  let persisted: { message: Record<string, unknown>; ipHash: string } | undefined
  const verifier: ChallengeVerifier = {
    async verify(token) {
      verifiedToken = token
      return true
    },
  }
  const repository: ContactMessageRepository = {
    async create(message, ipHash) {
      persisted = { message, ipHash }
      return 'created'
    },
  }

  await new ContactSubmissionService(verifier, repository, 'test-salt').submit(validInput, '203.0.113.10')

  assert.equal(verifiedToken, 'challenge-token')
  assert.equal('turnstileToken' in persisted!.message, false)
  assert.match(persisted!.ipHash, /^[0-9a-f]{64}$/)
  assert.equal(persisted!.ipHash.includes('203.0.113.10'), false)
})

test('contact submission rejects invalid input before external calls', async () => {
  let externalCalls = 0
  const service = new ContactSubmissionService(
    { async verify() { externalCalls += 1; return true } },
    { async create() { externalCalls += 1; return 'created' } },
    'test-salt',
  )

  await assert.rejects(
    service.submit({ ...validInput, email: 'not-an-email' }, '203.0.113.10'),
    (error: unknown) => error instanceof PublicHttpError && error.code === 'INVALID_CONTACT' && error.status === 400,
  )
  assert.equal(externalCalls, 0)
})

test('contact submission maps the repository rate limit to a stable public error', async () => {
  const service = new ContactSubmissionService(
    { async verify() { return true } },
    { async create() { return 'rate-limited' } },
    'test-salt',
  )

  await assert.rejects(
    service.submit(validInput, '203.0.113.10'),
    (error: unknown) => error instanceof PublicHttpError && error.code === 'CONTACT_RATE_LIMITED' && error.status === 429,
  )
})
