import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')

test('the floating menu remains outside the routed page content', () => {
  const routeEnd = appSource.indexOf('</motion.div>')
  const fade = appSource.lastIndexOf('floating-menu-fade')
  const menu = appSource.lastIndexOf('<LiquidMorphFloatingMenu')

  assert.ok(routeEnd >= 0)
  assert.ok(fade > routeEnd)
  assert.ok(menu > routeEnd)
  assert.ok(menu > fade)
  assert.match(appSource, /\{isPublicPath\(pathname\) && \(/)
})

test('the floating menu labels each route and navigates to every public page', () => {
  assert.match(appSource, /pathname === '\/home'\) return text\.menuLabel/)
  assert.match(appSource, /pathname\.startsWith\('\/works'\)\) return text\.items\[1\]/)
  assert.match(appSource, /pathname\.startsWith\('\/blog'\)\) return text\.items\[2\]/)
  assert.match(appSource, /pathname === '\/contact'\) return text\.items\[3\]/)

  for (const destination of ['/home', '/works', '/contact']) {
    assert.match(appSource, new RegExp(`navigate\\('${destination}'\\)`))
  }
  assert.match(appSource, /navigate\(`\/blog\/\$\{language\}`\)/)
})
