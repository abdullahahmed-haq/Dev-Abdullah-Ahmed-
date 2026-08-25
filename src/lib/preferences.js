const COOKIE_MAX_AGE = 31_536_000
const LANGUAGE_COOKIE = 'site_language'
const THEME_COOKIE = 'site_theme'
const VALID_LANGUAGES = new Set(['en', 'ar'])
const VALID_THEMES = new Set(['system', 'light', 'dark'])

function currentCookies() {
  return typeof document === 'undefined' ? '' : document.cookie
}

function readCookie(name, cookieString) {
  for (const entry of cookieString.split(';')) {
    const separator = entry.indexOf('=')
    if (separator < 0 || entry.slice(0, separator).trim() !== name) continue

    try {
      return decodeURIComponent(entry.slice(separator + 1).trim())
    } catch {
      return ''
    }
  }

  return ''
}

export function createPreferenceCookie(name, value, { secure = false } = {}) {
  const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${COOKIE_MAX_AGE}`,
    'SameSite=Lax',
  ]

  if (secure) attributes.push('Secure')
  return attributes.join('; ')
}

function writeCookie(name, value) {
  if (typeof document === 'undefined') return
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:'
  document.cookie = createPreferenceCookie(name, value, { secure })
}

export function getLanguagePreference(cookieString = currentCookies()) {
  const language = readCookie(LANGUAGE_COOKIE, cookieString)
  return VALID_LANGUAGES.has(language) ? language : 'en'
}

export function saveLanguagePreference(value) {
  const language = VALID_LANGUAGES.has(value) ? value : 'en'
  writeCookie(LANGUAGE_COOKIE, language)
  return language
}

export function applyLanguagePreference(language, root = document.documentElement) {
  const resolvedLanguage = VALID_LANGUAGES.has(language) ? language : 'en'
  root.lang = resolvedLanguage
  root.dir = resolvedLanguage === 'ar' ? 'rtl' : 'ltr'
  return resolvedLanguage
}

export function getThemePreference(cookieString = currentCookies()) {
  const theme = readCookie(THEME_COOKIE, cookieString)
  return VALID_THEMES.has(theme) ? theme : 'system'
}

export function saveThemePreference(value) {
  const theme = VALID_THEMES.has(value) ? value : 'system'
  writeCookie(THEME_COOKIE, theme)
  return theme
}

export function resolveTheme(theme, prefersDark) {
  if (theme === 'dark') return 'dark'
  if (theme === 'light') return 'light'
  return prefersDark ? 'dark' : 'light'
}

export function applyThemePreference(theme, prefersDark, root = document.documentElement) {
  const resolvedTheme = resolveTheme(theme, prefersDark)
  const isDark = resolvedTheme === 'dark'

  root.classList.toggle('dark', isDark)
  root.style.colorScheme = resolvedTheme

  const themeColor = document.querySelector('meta[name="theme-color"]')
  if (themeColor) themeColor.content = isDark ? '#262018' : '#f7ecdc'
}
