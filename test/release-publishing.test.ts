import assert from 'node:assert/strict'
import test from 'node:test'

import { canonicalBytes, decodeJson } from '../lib/release/canonical-json'
import { compileRelease, type PublishableSource } from '../lib/release/compiler'
import { InMemoryObjectStore, R2ReleaseRepository } from '../lib/release/repository'
import type { PublishedPayload } from '../lib/release/types'

const releaseId = '2026-08-26T143205Z-00000000000000000000000000'

function source(revision = 1): PublishableSource {
  return {
    revision,
    site: {
      profile: {
        name: 'Abdullah Ahmed',
        role: { en: 'Designer and developer', ar: 'مصمم ومطور' },
        bio: { en: 'Calm digital experiences.', ar: 'تجارب رقمية هادئة.' },
        email: 'hello@example.com',
      },
      settings: { siteTitle: { en: 'Abdullah Ahmed', ar: 'عبدالله أحمد' }, availability: true },
      projects: [{
        id: 'project-a',
        color: '#d5aa21',
        document: {
          title: { en: 'Project A', ar: 'المشروع أ' },
          category: { en: 'Identity', ar: 'هوية' },
          summary: { en: 'A focused case study.', ar: 'دراسة حالة مركزة.' },
          sections: [{ type: 'rich-text', value: 'Detail only' }],
        },
      }],
    },
    blog: {
      posts: [{
        id: 'article-a',
        updatedAt: '2026-08-26T00:00:00.000Z',
        locales: {
          en: { state: 'published', publishedAt: '2026-08-25T00:00:00.000Z', slug: 'article-a', title: 'Article A', excerpt: 'A concise article.', blocks: [{ type: 'paragraph', text: 'Detail only' }] },
          ar: { state: 'published', publishedAt: '2026-08-25T00:00:00.000Z', slug: 'المقال-أ', title: 'المقال أ', excerpt: 'مقال موجز.', blocks: [{ type: 'paragraph', text: 'تفاصيل' }] },
        },
      }],
    },
  }
}

test('compiler creates small, route-specific immutable release files', async () => {
  const release = await compileRelease(source(), { releaseId, createdAt: new Date('2026-08-26T14:32:05.000Z') })

  assert.ok(release.files.has('pages/en-home.json'))
  assert.ok(release.files.has('works/projects/project-a-en.json'))
  assert.ok(release.files.has('blog/articles/article-a-en.json'))
  assert.ok(release.index.files['release.json'] === undefined)

  const workIndex = decodeJson<PublishedPayload<{ projects: Array<Record<string, unknown>> }>>(release.files.get('works/en-index.json')!)
  assert.equal(workIndex.data.projects[0].sections, undefined)

  const project = decodeJson<PublishedPayload<{ sections: unknown[] }>>(release.files.get('works/projects/project-a-en.json')!)
  assert.deepEqual(project.data.sections, [{ type: 'rich-text', value: 'Detail only' }])
})

test('compiler shards an oversized listing into deterministic URL-addressable page payloads', async () => {
  const oversized = source()
  ;(oversized.site as { projects: Array<Record<string, unknown>> }).projects = Array.from({ length: 550 }, (_, index) => ({
    id: `project-${index}`,
    document: {
      title: { en: `Project ${index}`, ar: `المشروع ${index}` },
      summary: { en: 'x'.repeat(600), ar: 'ص'.repeat(600) },
    },
  }))
  const release = await compileRelease(oversized, { releaseId, createdAt: new Date('2026-08-26T14:32:05.000Z') })
  const first = decodeJson<PublishedPayload<{ projects: Array<Record<string, unknown>>; pagination: { page: number; pageCount: number } }>>(release.files.get('works/en-index.json')!)

  assert.ok(first.data.pagination.pageCount > 1)
  assert.ok(release.files.has('works/en-index-p2.json'))
  assert.ok(Object.entries(release.index.files)
    .filter(([key]) => key.startsWith('works/en-index'))
    .every(([, file]) => file.bytes <= 256 * 1024))
})

test('manifest switch makes a fully verified release live and rollback only changes the manifest', async () => {
  const store = new InMemoryObjectStore()
  const repository = new R2ReleaseRepository(store)
  const first = await compileRelease(source(1), { releaseId, createdAt: new Date('2026-08-26T14:32:05.000Z') })
  const manifest = await repository.publish(first, new Date('2026-08-26T14:33:00.000Z'))

  assert.equal(manifest.currentRelease, releaseId)
  const liveProject = await repository.getPayload<{ title: string }>(manifest.currentRelease, 'works/projects/project-a-en.json')
  assert.equal(liveProject?.data.title, 'Project A')

  const secondId = '2026-08-27T143205Z-00000000000000000000000001'
  const second = await compileRelease(source(2), { releaseId: secondId, createdAt: new Date('2026-08-27T14:32:05.000Z') })
  const secondManifest = await repository.publish(second, new Date('2026-08-27T14:33:00.000Z'))
  assert.equal(secondManifest.currentRelease, secondId)

  const rollback = await repository.rollback(releaseId, new Date('2026-08-27T14:34:00.000Z'))
  assert.equal(rollback.currentRelease, releaseId)
  assert.equal((await repository.getManifest())?.currentRelease, releaseId)
})

test('canonical JSON normalizes equivalent unicode before checksumming', () => {
  assert.deepEqual(canonicalBytes({ title: 'é' }), canonicalBytes({ title: 'e\u0301' }))
})
