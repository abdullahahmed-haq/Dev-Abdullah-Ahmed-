import { DEFAULT_PROJECT_COLOR, DEFAULT_SITE_CONTENT, normalizeSiteContent } from './content-model.js'

export { DEFAULT_PROJECT_COLOR }

const LEGACY_STORAGE_KEY = 'my-profile-site-content'
let cachedContent = normalizeSiteContent(DEFAULT_SITE_CONTENT)
let loadRequest = null
let saveQueue = Promise.resolve()
let contentRevision = 0
let contentTag = null

function notifyContentChange() {
  window.dispatchEvent(new Event('site-content-updated'))
}

async function readResponse(response) {
  const body = await response.json().catch(() => ({}))
  const tag = response.headers.get('etag')
  if (!response.ok) {
    const error = new Error(body.message || 'Unable to update the site content.')
    error.code = body.code
    error.status = response.status
    error.tag = tag
    throw error
  }
  return { body, tag }
}

export function getSiteContent() {
  return cachedContent
}

export function loadSiteContent({ force = false } = {}) {
  if (loadRequest && !force) return loadRequest

  loadRequest = fetch('/api/content', { credentials: 'same-origin' })
    .then(readResponse)
    .then(({ body, tag }) => {
      contentTag = tag
      cachedContent = normalizeSiteContent(body.content)
      notifyContentChange()
      return cachedContent
    })
    .finally(() => {
      loadRequest = null
    })

  return loadRequest
}

export function saveSiteContent(content) {
  const nextContent = normalizeSiteContent(content)
  const previousContent = cachedContent
  const revision = ++contentRevision
  cachedContent = nextContent
  notifyContentChange()

  const request = saveQueue
    .catch(() => undefined)
    .then(async () => {
      if (!contentTag) await loadSiteContent({ force: true })
      const response = await fetch('/api/content', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': contentTag,
        },
        body: JSON.stringify(nextContent),
      })
      const { body, tag } = await readResponse(response)
      contentTag = tag
      const storedContent = normalizeSiteContent(body.content)
      if (revision === contentRevision) {
        cachedContent = storedContent
        notifyContentChange()
      }
      return storedContent
    })
    .catch(async (error) => {
      if (error.status === 412 || error.status === 428) {
        await loadSiteContent({ force: true }).catch(() => undefined)
      } else if (revision === contentRevision) {
        cachedContent = previousContent
        notifyContentChange()
      }
      throw error
    })

  saveQueue = request
  return request
}

export async function migrateLegacySiteContent() {
  const stored = localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!stored) return false

  try {
    const legacyContent = normalizeSiteContent(JSON.parse(stored))
    const centralContent = await loadSiteContent({ force: true })
    const defaultContent = normalizeSiteContent(DEFAULT_SITE_CONTENT)
    const centralIsEmpty = JSON.stringify(centralContent) === JSON.stringify(defaultContent)
    const legacyHasContent = JSON.stringify(legacyContent) !== JSON.stringify(defaultContent)

    if (centralIsEmpty && legacyHasContent) {
      await saveSiteContent(legacyContent)
    }
  } finally {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  }

  return true
}
