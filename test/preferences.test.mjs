import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyLanguagePreference,
  createPreferenceCookie,
  getLanguagePreference,
  getThemePreference,
  resolveTheme,
} from '../src/lib/preferences.js'

test('first visit defaults to English and the system theme', () => {
  assert.equal(getLanguagePreference(''), 'en')
  assert.equal(getThemePreference(''), 'system')
  assert.equal(resolveTheme('system', true), 'dark')
  assert.equal(resolveTheme('system', false), 'light')
})

test('valid site preferences are restored from cookies', () => {
  const cookies = 'session=abc; site_language=ar; site_theme=dark'

  assert.equal(getLanguagePreference(cookies), 'ar')
  assert.equal(getThemePreference(cookies), 'dark')
})

test('the saved language updates the document language and direction', () => {
  const root = {}

  applyLanguagePreference('ar', root)
  assert.deepEqual(root, { lang: 'ar', dir: 'rtl' })

  applyLanguagePreference('en', root)
  assert.deepEqual(root, { lang: 'en', dir: 'ltr' })
})

test('invalid cookie preferences fall back safely', () => {
  const cookies = 'site_language=fr; site_theme=purple'

  assert.equal(getLanguagePreference(cookies), 'en')
  assert.equal(getThemePreference(cookies), 'system')
})

test('preference cookies cover the whole site and persist for future visits', () => {
  const cookie = createPreferenceCookie('site_theme', 'dark', { secure: true })

  assert.match(cookie, /^site_theme=dark;/)
  assert.match(cookie, /Path=\//)
  assert.match(cookie, /Max-Age=31536000/)
  assert.match(cookie, /SameSite=Lax/)
  assert.match(cookie, /Secure/)
})
