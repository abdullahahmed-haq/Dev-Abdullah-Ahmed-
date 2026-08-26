import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { findPublicPost, listPublicPosts, normalizeBlogStore, slugify } from '../src/lib/blog-model.js'

const root = new URL('../', import.meta.url)

async function sampleStore() {
  return normalizeBlogStore(JSON.parse(await readFile(new URL('data/blog-posts.json', root), 'utf8')))
}

test('blog keeps independent public article lists for Arabic and English', async () => {
  const store = await sampleStore()
  const arabic = listPublicPosts(store, 'ar')
  const english = listPublicPosts(store, 'en')

  assert.equal(arabic.length, 3)
  assert.equal(english.length, 3)
  assert.equal(arabic.some((post) => post.id === 'quiet-interfaces'), false)
  assert.equal(english.some((post) => post.id === 'digital-archive-notes'), false)
})

test('blog search normalizes Arabic letters and searches article content', async () => {
  const store = await sampleStore()
  const results = listPublicPosts(store, 'ar', { query: 'ارشيف' })

  assert.equal(results.length, 1)
  assert.equal(results[0].id, 'digital-archive-notes')
  assert.equal(slugify('من الفكرة إلى واجهة!'), 'من-الفكرة-الي-واجهة')
})

test('scheduled locales stay private until their publish time', async () => {
  const store = await sampleStore()
  const post = structuredClone(store.posts[0])
  post.locales.en.state = 'scheduled'
  post.locales.en.scheduledAt = '2030-01-01T00:00:00.000Z'
  store.posts = [post]

  assert.equal(listPublicPosts(store, 'en', {}, Date.parse('2029-12-31T23:59:59.000Z')).length, 0)
  assert.equal(findPublicPost(store, 'en', post.locales.en.slug, Date.parse('2030-01-01T00:00:00.000Z'))?.content.id, post.id)
})
