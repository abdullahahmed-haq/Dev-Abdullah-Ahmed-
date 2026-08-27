import 'server-only'

import { getReleaseStore } from '@platform-release-store'

import { siteOrigin } from '../config/server'
import { ReleasePublisher, createSupabasePublicationSource } from '../publishing/publish-release'
import { R2ReleaseRepository } from '../release/repository'
import type { ReleaseIndex } from '../release/types'
import { requireAdmin } from './authorization'

export interface AdminWorkspace {
  revision: number
  site: Record<string, unknown>
  blog: Record<string, unknown>
  publishedVersion: string | null
  publishedAt: string | null
  releases: Array<Pick<ReleaseIndex, 'releaseId' | 'schemaVersion' | 'minimumRendererVersion' | 'sourceRevision' | 'createdAt'>>
}

export class AdminCmsError extends Error {
  constructor(readonly publicMessage: string, readonly conflict = false, options?: ErrorOptions) {
    super(publicMessage, options)
    this.name = 'AdminCmsError'
  }
}

function repository(): R2ReleaseRepository {
  const store = getReleaseStore()
  if (!store) throw new AdminCmsError('The release store is unavailable in this environment.')
  return new R2ReleaseRepository(store)
}

export async function loadAdminWorkspace(): Promise<{ workspace: AdminWorkspace | null; error: string | null }> {
  const { client } = await requireAdmin()
  const { data, error } = await client
    .from('cms_state')
    .select('draft_revision, site, blog, published_version, published_at')
    .eq('singleton', true)
    .single()

  if (error || !data) {
    return { workspace: null, error: error?.message || 'The CMS state could not be loaded.' }
  }

  const store = getReleaseStore()
  const releases = store ? await new R2ReleaseRepository(store).listRetainedReleases().catch(() => []) : []
  return {
    error: null,
    workspace: {
      revision: Number(data.draft_revision),
      site: data.site as Record<string, unknown>,
      blog: data.blog as Record<string, unknown>,
      publishedVersion: data.published_version,
      publishedAt: data.published_at,
      releases,
    },
  }
}

export async function saveAdminDraft(expectedRevision: number, site: object, blog: object): Promise<number | undefined> {
  const { client } = await requireAdmin()
  const { data, error } = await client.rpc('update_cms_draft', {
    expected_revision: expectedRevision,
    next_site: site,
    next_blog: blog,
  })
  if (error) {
    const conflict = /conflict|40001/i.test(`${error.code ?? ''} ${error.message}`)
    throw new AdminCmsError(
      conflict ? 'This draft changed elsewhere. Reload or compare your local recovery copy.' : 'The draft could not be saved.',
      conflict,
      { cause: error },
    )
  }
  return typeof data === 'object' && data && 'revision' in data ? Number(data.revision) : undefined
}

export async function publishAdminRevision(expectedRevision: number) {
  const { client } = await requireAdmin()
  try {
    return await new ReleasePublisher(
      createSupabasePublicationSource(client),
      repository(),
      siteOrigin({ required: true }),
    ).publish(expectedRevision)
  } catch (error) {
    if (error instanceof AdminCmsError) throw error
    throw new AdminCmsError('Publication failed. The current live release was not replaced.', false, { cause: error })
  }
}

export async function rollbackAdminRelease(releaseId: string) {
  const { client } = await requireAdmin()
  try {
    const manifest = await repository().rollback(releaseId)
    let reconciled = true
    try {
      await createSupabasePublicationSource(client).recordPublished(manifest)
    } catch {
      reconciled = false
    }
    return { manifest, reconciled }
  } catch (error) {
    if (error instanceof AdminCmsError) throw error
    throw new AdminCmsError('Rollback failed. The current live release was not changed.', false, { cause: error })
  }
}
