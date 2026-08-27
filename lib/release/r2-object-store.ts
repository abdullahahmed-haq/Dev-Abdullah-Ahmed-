import type { ObjectStore, StoredObject } from './types'

/** Minimal structural type so the release core stays adapter-neutral. */
interface R2ObjectBodyLike {
  etag: string
  arrayBuffer(): Promise<ArrayBuffer>
}

interface R2BucketLike {
  get(key: string): Promise<R2ObjectBodyLike | null>
  put(key: string, value: Uint8Array, options?: { onlyIf?: Headers }): Promise<{ etag: string } | null>
  list(options: { prefix: string; cursor?: string }): Promise<{
    objects: Array<{ key: string; size: number; etag: string }>
    truncated?: boolean
    cursor?: string
  }>
}

export class CloudflareR2ObjectStore implements ObjectStore {
  constructor(private readonly bucket: R2BucketLike) {}

  async get(key: string): Promise<StoredObject | null> {
    const object = await this.bucket.get(key)
    return object ? { bytes: new Uint8Array(await object.arrayBuffer()), etag: object.etag } : null
  }

  async put(key: string, bytes: Uint8Array, options: { ifMatch?: string; ifNoneMatch?: boolean } = {}): Promise<StoredObject | null> {
    const headers = new Headers()
    if (options.ifMatch) headers.set('If-Match', options.ifMatch)
    if (options.ifNoneMatch) headers.set('If-None-Match', '*')
    const result = await this.bucket.put(key, bytes, { onlyIf: headers })
    return result ? { bytes: bytes.slice(), etag: result.etag } : null
  }

  async list(prefix: string) {
    const objects: Array<{ key: string; bytes: number; etag: string }> = []
    let cursor: string | undefined
    do {
      const result = await this.bucket.list({ prefix, ...(cursor ? { cursor } : {}) })
      objects.push(...result.objects.map((object) => ({ key: object.key, bytes: object.size, etag: object.etag })))
      cursor = result.truncated ? result.cursor : undefined
      if (result.truncated && !cursor) throw new Error('R2 returned a truncated listing without a cursor.')
    } while (cursor)
    return objects
  }
}
