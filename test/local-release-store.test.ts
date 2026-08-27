import assert from 'node:assert/strict'
import test from 'node:test'

import { getReleaseStore } from '../lib/platform/release-store.stub'
import { R2ReleaseRepository } from '../lib/release/repository'

test('Next development seeds a readable public release from local content', async () => {
  const environment = process.env as unknown as Record<string, string | undefined>
  const previousEnvironment = environment.NODE_ENV
  environment.NODE_ENV = 'development'
  globalThis.__portfolioReleaseStore = undefined

  try {
    const store = getReleaseStore()
    assert.ok(store)

    const repository = new R2ReleaseRepository(store)
    const manifest = await repository.getManifest()
    assert.ok(manifest)

    const works = await repository.getPayload<{ projects: unknown[] }>(manifest.currentRelease, 'works/ar-index.json')
    assert.equal(works?.kind, 'works-index')
    assert.ok(Array.isArray(works?.data.projects))
  } finally {
    globalThis.__portfolioReleaseStore = undefined
    if (previousEnvironment === undefined) delete environment.NODE_ENV
    else environment.NODE_ENV = previousEnvironment
  }
})
