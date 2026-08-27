import { canonicalBytes, sha256 } from '../release/canonical-json'
import { compileRelease, createReleaseId, type PublishableSource } from '../release/compiler'

export interface LegacyImportPlan {
  source: PublishableSource
  siteChecksum: string
  blogChecksum: string
}

function copyJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be a JSON object.`)
  return copyJson(value as Record<string, unknown>)
}

export async function createLegacyImportPlan(siteInput: unknown, blogInput: unknown, revision: number): Promise<LegacyImportPlan> {
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('A non-negative import revision is required.')
  const site = record(siteInput, 'Legacy site content')
  const blog = record(blogInput, 'Legacy blog content') as Record<string, unknown> & { posts?: Array<Record<string, unknown>> }
  if (blog.posts !== undefined && !Array.isArray(blog.posts)) throw new Error('Legacy blog posts must be an array.')

  // Compile once before any write: incomplete translated content, malformed slugs,
  // or unsupported values must fail the import before the draft state is changed.
  await compileRelease({ revision, site, blog }, { releaseId: createReleaseId() })
  return {
    source: { revision, site, blog },
    siteChecksum: await sha256(canonicalBytes(site)),
    blogChecksum: await sha256(canonicalBytes(blog)),
  }
}
