declare module '@portfolio/blog-authoring/schema' {
  export const BLOG_LOCALES: Array<'ar' | 'en'>
  export function createEmptyBlogPost(locales?: string[]): any
  export function createEmptySnapshot(): any
  export function normalizeStore(value: unknown): any
  export function slugify(value: unknown): string
}

declare module '@portfolio/blog-authoring/editor' {
  import type { ComponentType } from 'react'
  export const NotionBlogEditor: ComponentType<any>
}

declare module '@portfolio/blog-authoring/renderer' {
  import type { ComponentType } from 'react'
  export const BlogDocument: ComponentType<{ document: Array<Record<string, unknown>> }>
}
