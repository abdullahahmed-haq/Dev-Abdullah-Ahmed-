import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)

async function read(relativePath) {
  return readFile(new URL(relativePath, root), 'utf8')
}

function assertOrder(source, selectors) {
  const positions = selectors.map((selector) => source.indexOf(selector))
  positions.forEach((position, index) => assert.notEqual(position, -1, `Missing ${selectors[index]}`))
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b))
}

test('works controls follow the active language direction', async () => {
  const source = await read('src/components/works/works-page.jsx')
  const controls = source.slice(source.indexOf('<div className="works-controls"'), source.indexOf('</div>', source.indexOf('<div className="works-controls"')))

  assert.match(controls, /dir=\{language === 'ar' \? 'rtl' : 'ltr'\}/)
  assertOrder(controls, ['works-dashboard-link', '<ThemeSwitcher />', '<LanguageSwitcher'])
})

test('theme precedes language in the other grouped switchers', async () => {
  for (const relativePath of [
    'src/components/dashboard/dashboard.jsx',
    'src/components/dashboard/admin-login.jsx',
    'src/components/works/project-details-header.jsx',
  ]) {
    const source = await read(relativePath)
    assertOrder(source, ['<ThemeSwitcher />', '<LanguageSwitcher'])
    assert.match(source, /dir=\{language === 'ar' \? 'rtl' : 'ltr'\}/)
  }
})
