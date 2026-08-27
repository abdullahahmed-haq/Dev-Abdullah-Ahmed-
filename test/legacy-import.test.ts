import assert from 'node:assert/strict'
import test from 'node:test'

import { createLegacyImportPlan } from '../lib/import/legacy'

test('legacy import preserves schema versions and unknown forward-compatible fields', async () => {
  const site = {
    schemaVersion: 7,
    profile: { name: { en: 'Name', ar: 'الاسم' }, role: { en: 'Role', ar: 'دور' }, bio: { en: 'Bio', ar: 'نبذة' } },
    projects: [],
    futureSiteField: { nested: ['retained'] },
  }
  const blog = { schemaVersion: 8, posts: [], futureBlogField: { enabled: true } }
  const plan = await createLegacyImportPlan(site, blog, 1)

  assert.equal(plan.source.site.schemaVersion, 7)
  assert.deepEqual(plan.source.site.futureSiteField, { nested: ['retained'] })
  assert.equal(plan.source.blog.schemaVersion, 8)
  assert.deepEqual(plan.source.blog.futureBlogField, { enabled: true })
  assert.match(plan.siteChecksum, /^[0-9a-f]{64}$/)
})
