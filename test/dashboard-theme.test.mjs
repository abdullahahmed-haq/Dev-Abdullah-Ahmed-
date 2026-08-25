import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)

async function read(relativePath) {
  return readFile(new URL(relativePath, root), 'utf8')
}

function cssBlock(source, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = source.match(new RegExp(`${escapedSelector}\\s*\\{([^}]+)\\}`))
  assert.ok(match, `Missing CSS block for ${selector}`)
  return match[1]
}

test('the dashboard exposes the shared theme switcher', async () => {
  const source = await read('src/components/dashboard/dashboard.jsx')

  assert.match(source, /import\s+\{\s*ThemeSwitcher\s*\}/)
  assert.match(source, /<ThemeSwitcher\s*\/>/)
})

test('dashboard surfaces consume tokens with distinct light and dark values', async () => {
  const source = await read('src/styles.css')
  const lightRoot = cssBlock(source, ':root')
  const darkRoot = cssBlock(source, ':root.dark')
  const dashboard = cssBlock(source, '.dashboard-page')
  const cards = cssBlock(source, '.dashboard-stat-card, .dashboard-card, .dashboard-info-card')
  const inputs = cssBlock(source, ".dashboard-project-form input, .dashboard-form-grid input")

  for (const token of [
    '--dashboard-background',
    '--dashboard-text',
    '--dashboard-surface',
    '--dashboard-surface-border',
    '--dashboard-input-background',
    '--dashboard-input-border',
  ]) {
    const lightValue = lightRoot.match(new RegExp(`${token}:\\s*([^;]+)`))?.[1].trim()
    const darkValue = darkRoot.match(new RegExp(`${token}:\\s*([^;]+)`))?.[1].trim()

    assert.ok(lightValue, `Missing light value for ${token}`)
    assert.ok(darkValue, `Missing dark value for ${token}`)
    assert.notEqual(lightValue, darkValue, `${token} must change between themes`)
  }

  assert.match(dashboard, /background:\s*var\(--dashboard-background\)/)
  assert.match(dashboard, /color:\s*var\(--dashboard-text\)/)
  assert.match(cards, /background:\s*var\(--dashboard-surface\)/)
  assert.match(cards, /border:\s*1px solid var\(--dashboard-surface-border\)/)
  assert.match(inputs, /background:\s*var\(--dashboard-input-background\)/)
  assert.match(inputs, /border:\s*1px solid var\(--dashboard-input-border\)/)
})
