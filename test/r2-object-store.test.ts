import assert from 'node:assert/strict'
import test from 'node:test'

import { CloudflareR2ObjectStore } from '../lib/release/r2-object-store'

test('Cloudflare R2 listings follow every pagination cursor', async () => {
  const cursors: Array<string | undefined> = []
  const bucket = {
    async get() { return null },
    async put() { return null },
    async list(options: { prefix: string; cursor?: string }) {
      cursors.push(options.cursor)
      if (!options.cursor) {
        return { objects: [{ key: 'releases/a', size: 1, etag: 'one' }], truncated: true, cursor: 'page-2' }
      }
      return { objects: [{ key: 'releases/b', size: 2, etag: 'two' }], truncated: false }
    },
  }

  const result = await new CloudflareR2ObjectStore(bucket).list('releases/')
  assert.deepEqual(cursors, [undefined, 'page-2'])
  assert.deepEqual(result.map((object) => object.key), ['releases/a', 'releases/b'])
})

test('Cloudflare R2 rejects an unusable truncated response', async () => {
  const bucket = {
    async get() { return null },
    async put() { return null },
    async list() { return { objects: [], truncated: true } },
  }
  await assert.rejects(new CloudflareR2ObjectStore(bucket).list('releases/'), /without a cursor/)
})
