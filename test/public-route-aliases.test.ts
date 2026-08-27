import assert from 'node:assert/strict'
import test from 'node:test'

import { NextRequest } from 'next/server'

import { proxy } from '../proxy'

const aliases = [
  ['/home', '/en'],
  ['/works', '/en/works'],
  ['/works/project-one', '/en/works/project-one'],
  ['/blog', '/en/blog'],
  ['/blog/article-one', '/en/blog/article-one'],
  ['/contact', '/en/contact'],
] as const

test('locale-free public routes redirect to the default English route', async () => {
  for (const [source, destination] of aliases) {
    const response = await proxy(new NextRequest(`http://localhost:3000${source}`))
    assert.equal(response.status, 308, source)
    assert.equal(response.headers.get('location'), `http://localhost:3000${destination}`, source)
  }
})

test('public alias redirects preserve normalized pagination', async () => {
  const response = await proxy(new NextRequest('http://localhost:3000/works?page=2&unused=value'))
  assert.equal(response.status, 308)
  assert.equal(response.headers.get('location'), 'http://localhost:3000/en/works?page=2')
})

test('already localized public routes continue without redirecting', async () => {
  const response = await proxy(new NextRequest('http://localhost:3000/ar/works'))
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('location'), null)
})
