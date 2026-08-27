import { z } from 'zod'

import { compileRelease, createReleaseId, type PublishableSource } from '../release/compiler'
import type { PublishedContentRepository, PublishedManifest } from '../release/types'

export interface PublicationSource {
  export(expectedRevision: number): Promise<PublishableSource>
  recordPublished(manifest: PublishedManifest): Promise<void>
}

export interface PublicationResult {
  manifest: PublishedManifest
  sourceRevision: number
  releaseId: string
  reconciled: boolean
}

export class ReleasePublisher {
  constructor(
    private readonly source: PublicationSource,
    private readonly repository: PublishedContentRepository,
    private readonly canonicalOrigin: string,
  ) {}

  async publish(expectedRevision: number, now = new Date()): Promise<PublicationResult> {
    const source = await this.source.export(expectedRevision)
    if (source.revision !== expectedRevision) throw new Error('Publication source revision conflict.')

    const releaseId = createReleaseId(now)
    const release = await compileRelease(source, { releaseId, createdAt: now, canonicalOrigin: this.canonicalOrigin })
    const manifest = await this.repository.publish(release, now)

    try {
      await this.source.recordPublished(manifest)
      return { manifest, sourceRevision: source.revision, releaseId, reconciled: true }
    } catch {
      // The manifest is already authoritative. Admin load reconciles this value.
      return { manifest, sourceRevision: source.revision, releaseId, reconciled: false }
    }
  }
}

const exportSchema = z.object({
  revision: z.number().int().nonnegative(),
  site: z.record(z.string(), z.unknown()),
  blog: z.object({ posts: z.array(z.record(z.string(), z.unknown())).optional() }),
})

interface RpcClient {
  rpc(functionName: string, parameters: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }>
}

/** A user-scoped Supabase client; never pass the service-role client here. */
export function createSupabasePublicationSource(client: RpcClient): PublicationSource {
  return {
    async export(expectedRevision) {
      const { data, error } = await client.rpc('export_publishable_content', { expected_revision: expectedRevision })
      if (error) throw new Error(error.message)
      return exportSchema.parse(data)
    },
    async recordPublished(manifest) {
      const { error } = await client.rpc('record_published_release', {
        release_id: manifest.currentRelease,
        published_at_value: manifest.publishedAt,
      })
      if (error) throw new Error(error.message)
    },
  }
}
