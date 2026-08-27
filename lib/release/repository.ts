import { canonicalBytes, decodeJson, sha256 } from './canonical-json'
import type { CompiledRelease, ObjectStore, PublishedContentRepository, PublishedManifest, PublishedPayload, ReleaseIndex, StoredObject } from './types'

const MANIFEST_KEY = 'published/manifest.json'
const encoder = new TextEncoder()
const RELEASE_IO_CONCURRENCY = 8

async function mapConcurrent<T, R>(values: readonly T[], concurrency: number, work: (value: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(values.length)
  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++
      results[index] = await work(values[index])
    }
  }))
  return results
}

function releaseKey(releaseId: string, file: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{6}Z-[0-9A-HJKMNP-TV-Z]{26}$/.test(releaseId)) throw new Error('Invalid release ID.')
  if (!/^(?:[\p{L}\p{N}-]+\/)*[\p{L}\p{N}-]+\.json$/u.test(file)) throw new Error('Invalid release file key.')
  return `releases/${releaseId}/${file}`
}

function manifestBytes(manifest: PublishedManifest): Uint8Array {
  return canonicalBytes(manifest)
}

async function verifyObject(store: ObjectStore, key: string, expected: { sha256: string; bytes: number }) {
  const object = await store.get(key)
  if (!object || object.bytes.byteLength !== expected.bytes || await sha256(object.bytes) !== expected.sha256) {
    throw new Error(`Release verification failed for ${key}.`)
  }
  return object
}

export class R2ReleaseRepository implements PublishedContentRepository {
  constructor(private readonly store: ObjectStore) {}

  async getManifest(): Promise<PublishedManifest | null> {
    const object = await this.store.get(MANIFEST_KEY)
    return object ? decodeJson<PublishedManifest>(object.bytes) : null
  }

  async getPayload<T>(releaseId: string, key: string): Promise<PublishedPayload<T> | null> {
    const object = await this.store.get(releaseKey(releaseId, key))
    if (!object) return null
    const payload = decodeJson<PublishedPayload<T>>(object.bytes)
    if (payload.releaseId !== releaseId || payload.schemaVersion !== 1 || payload.minimumRendererVersion > 1) return null
    return payload
  }

  async getJson<T>(releaseId: string, key: string): Promise<T | null> {
    const object = await this.store.get(releaseKey(releaseId, key))
    return object ? decodeJson<T>(object.bytes) : null
  }

  async publish(release: CompiledRelease, publishedAt = new Date()): Promise<PublishedManifest> {
    await mapConcurrent([...release.files], RELEASE_IO_CONCURRENCY, async ([key, bytes]) => {
      const destination = releaseKey(release.index.releaseId, key)
      const stored = await this.store.put(destination, bytes, { ifNoneMatch: true })
      if (!stored) await verifyObject(this.store, destination, release.index.files[key])
    })

    const releaseIndexKey = releaseKey(release.index.releaseId, 'release.json')
    const storedIndex = await this.store.put(releaseIndexKey, release.indexBytes, { ifNoneMatch: true })
    const expectedIndex = { sha256: await sha256(release.indexBytes), bytes: release.indexBytes.byteLength }
    if (!storedIndex) await verifyObject(this.store, releaseIndexKey, expectedIndex)

    await mapConcurrent(Object.entries(release.index.files), RELEASE_IO_CONCURRENCY, async ([key, expected]) => {
      await verifyObject(this.store, releaseKey(release.index.releaseId, key), expected)
    })

    const current = await this.store.get(MANIFEST_KEY)
    const manifest: PublishedManifest = {
      schemaVersion: 1,
      currentRelease: release.index.releaseId,
      checksum: expectedIndex.sha256,
      publishedAt: publishedAt.toISOString(),
    }
    const updated = await this.store.put(MANIFEST_KEY, manifestBytes(manifest), current ? { ifMatch: current.etag } : { ifNoneMatch: true })
    if (!updated) throw new Error('Publication conflict: the live manifest changed. The release is retained for retry or rollback.')
    return manifest
  }

  async rollback(releaseId: string, publishedAt = new Date()): Promise<PublishedManifest> {
    const releaseIndex = await this.store.get(releaseKey(releaseId, 'release.json'))
    if (!releaseIndex) throw new Error('The selected release does not exist.')
    const index = decodeJson<ReleaseIndex>(releaseIndex.bytes)
    const releaseChecksum = await sha256(releaseIndex.bytes)
    if (index.releaseId !== releaseId || index.minimumRendererVersion > 1) throw new Error('The selected release is incompatible with this renderer.')

    await mapConcurrent(Object.entries(index.files), RELEASE_IO_CONCURRENCY, async ([key, expected]) => {
      await verifyObject(this.store, releaseKey(releaseId, key), expected)
    })

    const current = await this.store.get(MANIFEST_KEY)
    const manifest: PublishedManifest = {
      schemaVersion: 1,
      currentRelease: releaseId,
      checksum: releaseChecksum,
      publishedAt: publishedAt.toISOString(),
    }
    const updated = await this.store.put(MANIFEST_KEY, manifestBytes(manifest), current ? { ifMatch: current.etag } : { ifNoneMatch: true })
    if (!updated) throw new Error('Rollback conflict: the live manifest changed.')
    return manifest
  }

  async listRetainedReleases() {
    const candidates = await this.store.list('releases/')
    const releaseIndexes = candidates
      .filter((object) => /^releases\/\d{4}-\d{2}-\d{2}T\d{6}Z-[0-9A-HJKMNP-TV-Z]{26}\/release\.json$/.test(object.key))
    const releases = await mapConcurrent(releaseIndexes, RELEASE_IO_CONCURRENCY, async (object) => {
        const stored = await this.store.get(object.key)
        if (!stored) return null
        const index = decodeJson<ReleaseIndex>(stored.bytes)
        if (index.minimumRendererVersion > 1) return null
        return {
          releaseId: index.releaseId,
          schemaVersion: index.schemaVersion,
          minimumRendererVersion: index.minimumRendererVersion,
          sourceRevision: index.sourceRevision,
          createdAt: index.createdAt,
        }
      })
    return releases.filter((release): release is NonNullable<typeof release> => Boolean(release))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  }
}

export class InMemoryObjectStore implements ObjectStore {
  private readonly objects = new Map<string, StoredObject>()

  async get(key: string): Promise<StoredObject | null> {
    const object = this.objects.get(key)
    return object ? { bytes: object.bytes.slice(), etag: object.etag } : null
  }

  async put(key: string, bytes: Uint8Array, options: { ifMatch?: string; ifNoneMatch?: boolean } = {}): Promise<StoredObject | null> {
    const current = this.objects.get(key)
    if (options.ifNoneMatch && current) return null
    if (options.ifMatch && current?.etag !== options.ifMatch) return null
    if (options.ifMatch && !current) return null
    const object = { bytes: bytes.slice(), etag: await sha256(bytes) }
    this.objects.set(key, object)
    return { bytes: object.bytes.slice(), etag: object.etag }
  }

  async list(prefix: string) {
    return [...this.objects.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, object]) => ({ key, bytes: object.bytes.byteLength, etag: object.etag }))
      .sort((left, right) => left.key.localeCompare(right.key))
  }

  async putUnchecked(key: string, value: unknown) {
    const bytes = typeof value === 'string' ? encoder.encode(value) : canonicalBytes(value)
    const object = { bytes, etag: await sha256(bytes) }
    this.objects.set(key, object)
  }
}
