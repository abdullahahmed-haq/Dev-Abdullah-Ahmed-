import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Arabic floating-menu labels are not split into individual character nodes', async () => {
  const source = await readFile(new URL('../app/components/ui/liquid-morph-floating-menu.tsx', import.meta.url), 'utf8')
  assert.match(source, /const animateCharacters = item\.animateCharacters \?\? true/)
  assert.match(source, /const characters = animateCharacters \? item\.label\.split\(''\) : \[\]/)
  assert.match(source, /: <span className=\{styles\.wholeLabel\}>\{item\.label\}<\/span>/)

  const navigation = await readFile(new URL('../app/[locale]/public-navigation.tsx', import.meta.url), 'utf8')
  assert.match(navigation, /animateCharacters: locale !== 'ar'/)
})
