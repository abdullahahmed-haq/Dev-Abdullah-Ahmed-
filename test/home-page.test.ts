import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('the home route intentionally renders an empty screen', async () => {
  const source = await readFile(new URL('../app/[locale]/page.tsx', import.meta.url), 'utf8')
  assert.match(source, /return <EmptyPublicPage \/>/)
  assert.doesNotMatch(source, /<PageShell/)
  assert.doesNotMatch(source, /<section className="hero"/)
})
