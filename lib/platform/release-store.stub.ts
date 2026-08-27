import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { compileRelease, createReleaseId } from '../release/compiler'
import { InMemoryObjectStore, R2ReleaseRepository } from '../release/repository'
import type { ObjectStore } from '../release/types'

declare global {
  var __portfolioReleaseStore: ObjectStore | undefined
}

class DevelopmentReleaseStore implements ObjectStore {
  readonly developmentSeedVersion = 1
  private readonly store = new InMemoryObjectStore()
  private readonly ready = this.seed()

  private async seed() {
    const dataDirectory = resolve(process.cwd(), 'data')
    const [site, blog] = await Promise.all([
      readFile(resolve(dataDirectory, 'site-content.json'), 'utf8').then(JSON.parse),
      readFile(resolve(dataDirectory, 'blog-posts.json'), 'utf8').then(JSON.parse),
    ])
    const createdAt = new Date()
    const release = await compileRelease(
      { revision: 1, site, blog },
      {
        releaseId: createReleaseId(createdAt),
        createdAt,
        now: createdAt,
        canonicalOrigin: process.env.NEXT_PUBLIC_SITE_ORIGIN || 'http://localhost:3000',
      },
    )
    await new R2ReleaseRepository(this.store).publish(release, createdAt)
  }

  async get(key: string) {
    await this.ready
    return this.store.get(key)
  }

  async put(key: string, bytes: Uint8Array, options?: { ifMatch?: string; ifNoneMatch?: boolean }) {
    await this.ready
    return this.store.put(key, bytes, options)
  }

  async list(prefix: string) {
    await this.ready
    return this.store.list(prefix)
  }
}

/**
 * Node/Next.js build stub. Vinext aliases this module to the Cloudflare binding
 * implementation, while unit tests can inject an in-memory store here.
 */
export function getReleaseStore(): ObjectStore | undefined {
  const current = globalThis.__portfolioReleaseStore as (ObjectStore & { developmentSeedVersion?: number }) | undefined
  if (process.env.NODE_ENV === 'development' && current?.developmentSeedVersion !== 1) {
    globalThis.__portfolioReleaseStore = new DevelopmentReleaseStore()
  }
  return globalThis.__portfolioReleaseStore
}
