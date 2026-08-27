'use client'

import { useMemo, useState } from 'react'
import { BLOG_LOCALES, createEmptyBlogPost, createEmptySnapshot, normalizeStore, slugify } from '@portfolio/blog-authoring/schema'
import { NotionBlogEditor } from './notion-blog-editor'

type Props = {
  blog: Record<string, unknown>
  onChange: (blog: Record<string, unknown>) => void
  onPublish: (blog: Record<string, unknown>) => void
}

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T }

export function BlogAuthoringPanel({ blog, onChange, onPublish }: Props) {
  const store = useMemo(() => normalizeStore(blog), [blog])
  const [selectedId, setSelectedId] = useState(() => store.posts[0]?.id || '')
  const [locale, setLocale] = useState<'en' | 'ar'>('en')
  const post = store.posts.find((item: any) => item.id === selectedId) || store.posts[0]
  const activeLocale = post?.locales?.[locale] || post?.locales?.ar || post?.locales?.en

  function replace(next: typeof store) { onChange(next as unknown as Record<string, unknown>) }
  function create() {
    const next = clone(store)
    const post = createEmptyBlogPost([locale]) as typeof next.posts[number]
    post.id = crypto.randomUUID()
    next.posts.unshift(post)
    setSelectedId(post.id)
    replace(next)
  }
  function updateDraft(patch: Record<string, unknown>) {
    if (!post || !activeLocale) return
    const next = clone(store)
    const item = next.posts.find((candidate: any) => candidate.id === post.id)!
    const target = item.locales[locale] || { locale, draft: createEmptySnapshot(), live: null, scheduled: null }
    item.locales[locale] = { ...target, draft: { ...target.draft, ...patch } }
    item.updatedAt = new Date().toISOString()
    replace(next)
  }
  function switchLocale(nextLocale: 'en' | 'ar') {
    if (post && !post.locales[nextLocale]) {
      const next = clone(store)
      const item = next.posts.find((candidate: any) => candidate.id === post.id)!
      item.locales[nextLocale] = { locale: nextLocale, draft: createEmptySnapshot(), live: null, scheduled: null }
      replace(next)
    }
    setLocale(nextLocale)
  }
  function publish() {
    if (!post || !activeLocale) return
    const next = clone(store)
    const item = next.posts.find((candidate: any) => candidate.id === post.id)!
    const target = item.locales[locale]!
    target.live = { snapshot: clone(target.draft), publishedAt: new Date().toISOString() }
    target.scheduled = null
    item.updatedAt = new Date().toISOString()
    onPublish(next as unknown as Record<string, unknown>)
  }

  if (!post || !activeLocale) return <section className="blog-authoring-panel"><header><h2>Blog</h2><button type="button" onClick={create}>New article</button></header><p>Create your first article to start writing.</p></section>
  const draft = activeLocale.draft
  return <section className="blog-authoring-panel" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <header><div><h2>{locale === 'ar' ? 'المقالات' : 'Articles'}</h2><select value={post.id} onChange={(event) => setSelectedId(event.target.value)}>{store.posts.map((item: any) => <option key={item.id} value={item.id}>{item.locales[locale]?.draft.title || item.locales.en?.draft.title || item.locales.ar?.draft.title || 'Untitled'}</option>)}</select></div><div>{BLOG_LOCALES.map((item: 'en' | 'ar') => <button key={item} className={item === locale ? 'is-active' : ''} type="button" onClick={() => switchLocale(item)}>{item.toUpperCase()}</button>)}<button type="button" onClick={create}>New article</button><button className="is-primary" type="button" onClick={publish}>{locale === 'ar' ? 'نشر هذه اللغة' : 'Publish this language'}</button></div></header>
    <div className="blog-authoring-properties"><label>Title<input value={draft.title} onChange={(event) => updateDraft({ title: event.target.value, slug: draft.slug === slugify(draft.title) || draft.slug === 'untitled' ? slugify(event.target.value) : draft.slug })} /></label><label>Excerpt<textarea value={draft.excerpt} onChange={(event) => updateDraft({ excerpt: event.target.value })} /></label><label>Category<input value={draft.category} onChange={(event) => updateDraft({ category: event.target.value })} /></label><label>Tags<input value={draft.tags.join(', ')} onChange={(event) => updateDraft({ tags: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></label><label>Slug<input value={draft.slug} onChange={(event) => updateDraft({ slug: slugify(event.target.value) })} /></label><label>Cover URL<input value={draft.cover} onChange={(event) => updateDraft({ cover: event.target.value })} /></label><label>SEO title<input value={draft.seoTitle} onChange={(event) => updateDraft({ seoTitle: event.target.value })} /></label><label>SEO description<textarea value={draft.seoDescription} onChange={(event) => updateDraft({ seoDescription: event.target.value })} /></label></div>
    <NotionBlogEditor document={draft.document} locale={locale} onChange={(document: unknown) => updateDraft({ document })} />
  </section>
}
