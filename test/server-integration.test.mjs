import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const rootDirectory = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

async function availablePort() {
  const server = net.createServer()
  await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject))
  const { port } = server.address()
  await new Promise((resolve) => server.close(resolve))
  return port
}

async function startServer(t) {
  const port = await availablePort()
  const server = spawn(process.execPath, ['server.mjs', '--port', String(port)], {
    cwd: rootDirectory,
    env: {
      ...process.env,
      ADMIN_PASSWORD: 'integration-test-password',
      ADMIN_USERNAME: 'integration-admin',
      NODE_ENV: 'production',
      TRUST_PROXY: 'loopback',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let errors = ''
  server.stderr.on('data', (chunk) => { errors += chunk })
  t.after(() => server.kill())

  let startupTimer
  try {
    await Promise.race([
      new Promise((resolve, reject) => {
        server.stdout.on('data', (chunk) => {
          if (String(chunk).includes('My Profile is running')) resolve()
        })
        server.once('exit', (code) => reject(new Error(`Server exited with ${code}: ${errors}`)))
      }),
      new Promise((_, reject) => {
        startupTimer = setTimeout(() => reject(new Error(`Server startup timed out: ${errors}`)), 5_000)
      }),
    ])
  } finally {
    clearTimeout(startupTimer)
  }

  return `http://127.0.0.1:${port}`
}

test('server security boundaries', async (t) => {
  const baseUrl = await startServer(t)

  await t.test('serves public blog articles by locale without exposing unavailable languages', async () => {
    const arabic = await fetch(`${baseUrl}/api/blog/ar/posts`)
    const english = await fetch(`${baseUrl}/api/blog/en/posts`)
    const arabicBody = await arabic.json()
    const englishBody = await english.json()

    assert.equal(arabic.status, 200)
    assert.equal(english.status, 200)
    assert.equal(arabicBody.posts.some((post) => post.id === 'quiet-interfaces'), false)
    assert.equal(englishBody.posts.some((post) => post.id === 'digital-archive-notes'), false)
    assert.equal((await fetch(`${baseUrl}/api/blog/ar/posts/missing`)).status, 404)
    assert.match(await (await fetch(`${baseUrl}/blog/ar/rss.xml`)).text(), /<rss version="2\.0">/)
    assert.match(await (await fetch(`${baseUrl}/sitemap.xml`)).text(), /blog\/ar/)
    const articleHtml = await (await fetch(`${baseUrl}/blog/en/${encodeURIComponent(englishBody.posts[0].slug)}`)).text()
    assert.match(articleHtml, /property="og:title"/)
    assert.match(articleHtml, new RegExp(englishBody.posts[0].title))
  })

  await t.test('sets browser security headers', async () => {
    const response = await fetch(baseUrl)
    assert.equal(response.headers.get('x-frame-options'), 'DENY')
    assert.match(response.headers.get('content-security-policy') || '', /frame-ancestors 'none'/)
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  })

  await t.test('treats malformed cookies as an unauthenticated session', async () => {
    const response = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { Cookie: 'my_profile_admin=%' },
    })
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { authenticated: false })
  })

  await t.test('rejects unsafe requests without an Origin header', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'wrong', password: 'wrong' }),
    })
    assert.equal(response.status, 403)
  })

  await t.test('isolates login limits by trusted forwarded client address', async () => {
    const request = (address) => fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: baseUrl,
        'X-Forwarded-For': address,
      },
      body: JSON.stringify({ username: 'wrong', password: 'wrong' }),
    })

    for (let attempt = 0; attempt < 5; attempt += 1) {
      assert.equal((await request('203.0.113.10')).status, 401)
    }
    assert.equal((await request('203.0.113.20')).status, 401)
    assert.equal((await request('203.0.113.10')).status, 429)
  })
})
