import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { createLegacyImportPlan } from '../lib/import/legacy'
import { createSupabaseServiceClient } from '../lib/supabase/server'

const execute = process.argv.includes('--execute')
const force = process.argv.includes('--force')
const root = process.cwd()

async function readJson(path: string) {
  return JSON.parse(await readFile(path, 'utf8')) as unknown
}

async function main() {
  const [site, blog] = await Promise.all([
    readJson(resolve(root, 'data/site-content.json')),
    readJson(resolve(root, 'data/blog-posts.json')),
  ])
  const client = execute ? createSupabaseServiceClient() : null
  const { data: current, error: currentError } = client
    ? await client.from('cms_state').select('draft_revision').eq('singleton', true).single()
    : { data: { draft_revision: 0 }, error: null }
  if (currentError || !current) throw new Error(currentError?.message || 'CMS state is unavailable.')
  const currentRevision = Number(current.draft_revision)
  if (currentRevision !== 0 && !force) throw new Error('CMS state already contains a draft. Review it or pass --force after creating a backup.')

  const plan = await createLegacyImportPlan(site, blog, currentRevision + 1)
  if (!execute) {
    console.log(JSON.stringify({ dryRun: true, revision: plan.source.revision, siteChecksum: plan.siteChecksum, blogChecksum: plan.blogChecksum }, null, 2))
    return
  }

  const { error: updateError } = await client!.from('cms_state').update({
    site: plan.source.site,
    blog: plan.source.blog,
    draft_revision: plan.source.revision,
    updated_at: new Date().toISOString(),
  }).eq('singleton', true)
  if (updateError) throw new Error(updateError.message)

  const { error: auditError } = await client!.from('cms_import_audits').insert({
    source_revision: plan.source.revision,
    site_checksum: plan.siteChecksum,
    blog_checksum: plan.blogChecksum,
  })
  if (auditError) throw new Error(auditError.message)
  console.log(JSON.stringify({ imported: true, revision: plan.source.revision, siteChecksum: plan.siteChecksum, blogChecksum: plan.blogChecksum }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
