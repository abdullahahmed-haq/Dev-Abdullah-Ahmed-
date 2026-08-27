import { R2ReleaseRepository } from '../release/repository'
import type { PublishedPayload } from '../release/types'
import { getReleaseStore } from '@platform-release-store'

export class ReleaseUnavailableError extends Error {
  constructor() {
    super('The published release store is not available.')
  }
}

function repository() {
  const store = getReleaseStore()
  if (!store) throw new ReleaseUnavailableError()
  return new R2ReleaseRepository(store)
}

export async function getLivePayload<T>(key: string): Promise<PublishedPayload<T> | null> {
  const releaseRepository = repository()
  const manifest = await releaseRepository.getManifest()
  return manifest ? releaseRepository.getPayload<T>(manifest.currentRelease, key) : null
}

export async function getLiveJson<T>(key: string): Promise<T | null> {
  const releaseRepository = repository()
  const manifest = await releaseRepository.getManifest()
  return manifest ? releaseRepository.getJson<T>(manifest.currentRelease, key) : null
}

export function routeKey(locale: 'en' | 'ar', route: 'home' | 'contact' | 'works' | 'blog' | 'project' | 'article', slug?: string, page = 1) {
  if (route === 'home' || route === 'contact') return `pages/${locale}-${route}.json`
  if (route === 'works' || route === 'blog') {
    if (!Number.isSafeInteger(page) || page < 1 || page > 100_000) return null
    return page === 1 ? `${route}/${locale}-index.json` : `${route}/${locale}-index-p${page}.json`
  }
  if (!slug || !/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(slug)) return null
  return route === 'project'
    ? `works/projects/${slug}-${locale}.json`
    : `blog/articles/${slug}-${locale}.json`
}
