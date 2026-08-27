export const LOCALES = ['en', 'ar'] as const

export type Locale = (typeof LOCALES)[number]
export type ReleaseFileKind =
  | 'site'
  | 'page'
  | 'works-index'
  | 'project'
  | 'blog-index'
  | 'article'
  | 'sitemap'
  | 'rss'

export interface ReleaseFile {
  sha256: string
  bytes: number
  kind: ReleaseFileKind
}

export interface ReleaseIndex {
  schemaVersion: number
  minimumRendererVersion: number
  releaseId: string
  sourceRevision: number
  createdAt: string
  files: Record<string, ReleaseFile>
}

export interface PublishedManifest {
  schemaVersion: number
  currentRelease: string
  checksum: string
  publishedAt: string
}

export interface PublishedSeo {
  title: string
  description: string
  canonicalPath: string
}

export interface PublishedPageChrome {
  brand: string
  navigation: Array<{ href: string; label: string }>
  contactLabel: string
}

export interface PublishedPayload<T> {
  schemaVersion: number
  minimumRendererVersion: number
  releaseId: string
  locale: Locale
  kind: string
  seo: PublishedSeo
  chrome: PublishedPageChrome
  data: T
}

export interface CompiledRelease {
  index: ReleaseIndex
  indexBytes: Uint8Array
  files: Map<string, Uint8Array>
}

export interface StoredObject {
  bytes: Uint8Array
  etag: string
}

export interface StoredObjectInfo {
  key: string
  bytes: number
  etag: string
}

export interface ObjectStore {
  get(key: string): Promise<StoredObject | null>
  put(key: string, bytes: Uint8Array, options?: { ifMatch?: string; ifNoneMatch?: boolean }): Promise<StoredObject | null>
  list(prefix: string): Promise<StoredObjectInfo[]>
}

export interface PublishedContentRepository {
  getManifest(): Promise<PublishedManifest | null>
  getPayload<T>(releaseId: string, key: string): Promise<PublishedPayload<T> | null>
  publish(release: CompiledRelease, publishedAt?: Date): Promise<PublishedManifest>
  rollback(releaseId: string, publishedAt?: Date): Promise<PublishedManifest>
  listRetainedReleases(): Promise<Array<Pick<ReleaseIndex, 'releaseId' | 'schemaVersion' | 'minimumRendererVersion' | 'sourceRevision' | 'createdAt'>>>
}
