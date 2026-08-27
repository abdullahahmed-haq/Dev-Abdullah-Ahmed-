import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('the localized layout supplies the floating menu on every public route', async () => {
  const source = await readFile(new URL('../app/[locale]/layout.tsx', import.meta.url), 'utf8')
  assert.match(source, /<PublicNavigation locale=\{locale\} \/>/)
})

test('the liquid floating menu is the only remaining public UI', async () => {
  const pages = [
    '../app/[locale]/page.tsx',
    '../app/[locale]/works/page.tsx',
    '../app/[locale]/works/[slug]/page.tsx',
    '../app/[locale]/blog/page.tsx',
    '../app/[locale]/blog/[slug]/page.tsx',
    '../app/[locale]/contact/page.tsx',
  ]
  for (const page of pages) {
    const source = await readFile(new URL(page, import.meta.url), 'utf8')
    assert.match(source, /return <EmptyPublicPage \/>/)
    assert.doesNotMatch(source, /PageShell|BlogDocument|ContactForm|Folder/)
  }

  const menu = await readFile(new URL('../app/components/ui/liquid-morph-floating-menu.tsx', import.meta.url), 'utf8')
  assert.match(menu, /from 'framer-motion'/)
  assert.match(menu, /aria-expanded=\{isOpen\}/)

  const styles = await readFile(new URL('../app/components/ui/liquid-morph-floating-menu.module.css', import.meta.url), 'utf8')
  assert.match(styles, /position:fixed/)
  assert.match(styles, /\.menuItemAnimated \{ letter-spacing:1px; \}/)
})
