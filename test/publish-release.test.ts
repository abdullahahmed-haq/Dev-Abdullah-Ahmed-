import assert from 'node:assert/strict'
import test from 'node:test'

import { R2ReleaseRepository, InMemoryObjectStore } from '../lib/release/repository'
import { ReleasePublisher, type PublicationSource } from '../lib/publishing/publish-release'

const source = {
  revision: 7,
  site: {
    profile: { name: 'Abdullah', role: { en: 'Designer', ar: 'مصمم' }, bio: { en: 'Bio', ar: 'نبذة' }, email: 'hello@example.com' },
    settings: { siteTitle: { en: 'Abdullah', ar: 'عبدالله' }, availability: true },
    projects: [],
  },
  blog: { posts: [] },
}

test('publisher makes the R2 manifest authoritative even when Supabase reconciliation fails', async () => {
  const publicationSource: PublicationSource = {
    export: async (expectedRevision) => {
      assert.equal(expectedRevision, 7)
      return source
    },
    recordPublished: async () => { throw new Error('temporary Supabase failure') },
  }
  const repository = new R2ReleaseRepository(new InMemoryObjectStore())
  const publisher = new ReleasePublisher(publicationSource, repository, 'https://portfolio.example')

  const result = await publisher.publish(7, new Date('2026-08-26T14:32:05.000Z'))
  assert.equal(result.reconciled, false)
  assert.equal((await repository.getManifest())?.currentRelease, result.releaseId)
})

test('publisher rejects a stale source revision before changing the manifest', async () => {
  const publicationSource: PublicationSource = {
    export: async () => ({ ...source, revision: 8 }),
    recordPublished: async () => undefined,
  }
  const repository = new R2ReleaseRepository(new InMemoryObjectStore())
  const publisher = new ReleasePublisher(publicationSource, repository, 'https://portfolio.example')

  await assert.rejects(() => publisher.publish(7), /revision conflict/)
  assert.equal(await repository.getManifest(), null)
})
