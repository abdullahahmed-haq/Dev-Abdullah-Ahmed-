import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Clipboard, Pencil, Share2 } from 'lucide-react'
import { isAdminSession, refreshAdminSession } from '../../lib/admin-auth.js'
import { getAdminBlogPosts, getBlogPost } from '../../lib/blog-api.js'
import { getReadingMinutes } from '../../lib/blog-model.js'
import { BlogBlocks } from './blog-blocks.jsx'
import { LanguageSwitcher } from '../ui/language-switcher.jsx'
import { ThemeSwitcher } from '../ui/theme-switcher.jsx'
import './blog-article-page.css'

const copy = {
  ar: { back: 'العودة إلى المدونة', read: 'دقائق للقراءة', contents: 'في هذا المقال', share: 'مشاركة', copied: 'تم النسخ', related: 'اقرأ أيضًا', unavailable: 'المقال غير متاح', unavailableText: 'ربما لم يُنشر بهذه اللغة أو تغيّر رابطه.', allPosts: 'كل المقالات', edit: 'تعديل' },
  en: { back: 'Back to blog', read: 'min read', contents: 'In this article', share: 'Share', copied: 'Copied', related: 'Read next', unavailable: 'This article is unavailable', unavailableText: 'It may not be published in this language or its link has changed.', allPosts: 'All posts', edit: 'Edit' },
}

const BlogEditor = lazy(() => import('./blog-editor.jsx'))

function formatDate(value, locale) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value))
}

export default function BlogArticlePage({ locale, slug, language, onLanguageChange, navigate }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeHeadingId, setActiveHeadingId] = useState('')
  const [admin, setAdmin] = useState(isAdminSession)
  const [editor, setEditor] = useState(null)
  const text = copy[locale]

  useEffect(() => {
    let alive = true
    setData(null); setError(false)
    getBlogPost(locale, slug).then((result) => { if (alive) setData(result.body) }).catch(() => { if (alive) setError(true) })
    return () => { alive = false }
  }, [locale, slug])

  useEffect(() => {
    let alive = true
    const updateAdmin = () => { if (alive) setAdmin(isAdminSession()) }
    refreshAdminSession().then((authenticated) => { if (alive) setAdmin(authenticated) })
    window.addEventListener('admin-auth-changed', updateAdmin)
    return () => { alive = false; window.removeEventListener('admin-auth-changed', updateAdmin) }
  }, [])

  useEffect(() => {
    if (!data?.post) return undefined
    const previousTitle = document.title
    const previousDescription = document.querySelector('meta[name="description"]')?.content
    document.title = data.post.seoTitle || data.post.title
    const description = document.querySelector('meta[name="description"]')
    if (description) description.content = data.post.seoDescription || data.post.excerpt
    return () => { document.title = previousTitle; if (description && previousDescription != null) description.content = previousDescription }
  }, [data])

  const headings = useMemo(() => (data?.post?.blocks || []).filter((block) => block.type === 'heading' && block.text), [data])
  const BackArrow = locale === 'ar' ? ArrowRight : ArrowLeft

  useEffect(() => {
    if (headings.length === 0) {
      setActiveHeadingId('')
      return undefined
    }
    const targets = headings.map((heading) => document.getElementById(heading.id)).filter(Boolean)
    const updateActiveHeading = () => {
      const readingLine = window.innerHeight * 0.28
      const current = targets.filter((target) => target.getBoundingClientRect().top <= readingLine).at(-1) || targets[0]
      setActiveHeadingId(current?.id || '')
    }
    updateActiveHeading()
    window.addEventListener('scroll', updateActiveHeading, { passive: true })
    window.addEventListener('resize', updateActiveHeading)
    return () => {
      window.removeEventListener('scroll', updateActiveHeading)
      window.removeEventListener('resize', updateActiveHeading)
    }
  }, [headings])

  function changeLanguage(nextLanguage) {
    onLanguageChange(nextLanguage)
    const alternate = data?.alternates?.[nextLanguage]
    navigate(alternate ? `/blog/${nextLanguage}/${encodeURIComponent(alternate.slug)}` : `/blog/${nextLanguage}`)
  }

  async function share() {
    const shareData = { title: data.post.title, text: data.post.excerpt, url: window.location.href }
    if (navigator.share) await navigator.share(shareData).catch(() => undefined)
    else {
      await navigator.clipboard?.writeText(window.location.href).catch(() => undefined)
      setCopied(true); window.setTimeout(() => setCopied(false), 1600)
    }
  }

  async function openEditor() {
    if (!admin || !data?.post) return
    try {
      const entry = (await getAdminBlogPosts()).find((item) => item.post.id === data.post.id)
      if (entry) setEditor(entry)
    } catch {
      setAdmin(false)
    }
  }

  function handleSaved(savedPost) {
    const updatedLocale = savedPost.locales?.[locale]
    if (!updatedLocale) return
    setData((current) => current ? { ...current, post: { ...current.post, ...updatedLocale, readingMinutes: getReadingMinutes(updatedLocale) } } : current)
  }

  if (error) return <main className="blog-article-page blog-article-missing" dir={locale === 'ar' ? 'rtl' : 'ltr'}><a href={`/blog/${locale}`}>{text.allPosts}</a><h1>{text.unavailable}</h1><p>{text.unavailableText}</p></main>
  if (!data) return <main className="blog-article-page blog-article-loading" aria-live="polite" />
  const { post, related } = data

  return (
    <main className="blog-article-page" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <header className="blog-article-topbar">
        <a href={`/blog/${locale}`}><BackArrow aria-hidden="true" />{text.back}</a>
        <div className="blog-article-controls switcher-cluster"><ThemeSwitcher /><LanguageSwitcher language={language} onLanguageChange={changeLanguage} />{admin && <button className="blog-article-edit" type="button" onClick={openEditor}><Pencil aria-hidden="true" />{text.edit}</button>}</div>
      </header>
      <article>
        <header className="blog-article-hero">
          <div className="blog-article-meta"><span>{post.category}</span><span>{formatDate(post.publishedAt, locale)}</span><span>{post.readingMinutes} {text.read}</span></div>
          <h1>{post.title}</h1>
          {post.excerpt && <p>{post.excerpt}</p>}
          {post.cover && <figure><img src={post.cover} alt={post.coverAlt} loading="eager" fetchPriority="high" decoding="async" /></figure>}
        </header>
        <div className={`blog-article-layout${headings.length > 0 ? ' has-toc' : ' no-toc'}`}>
          {headings.length > 0 && <nav className="blog-article-toc" aria-label={text.contents}><p>{text.contents}</p>{headings.map((heading) => <a key={heading.id} className={`blog-toc-link is-level-${heading.level}${activeHeadingId === heading.id ? ' is-active' : ''}`} href={`#${heading.id}`} aria-current={activeHeadingId === heading.id ? 'location' : undefined}>{heading.text}</a>)}</nav>}
          <div className="blog-article-content"><BlogBlocks blocks={post.blocks} locale={locale} /><footer className="blog-article-footer"><div>{post.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div><button type="button" onClick={share}>{copied ? <Clipboard aria-hidden="true" /> : <Share2 aria-hidden="true" />}{copied ? text.copied : text.share}</button></footer></div>
        </div>
      </article>
      {related.length > 0 && <section className="blog-related"><p>{text.related}</p><div>{related.map((item) => <a key={item.id} href={`/blog/${locale}/${encodeURIComponent(item.slug)}`}><span>{item.category}</span><h2>{item.title}</h2><small>{item.readingMinutes} {text.read}</small></a>)}</div></section>}
      {editor && <Suspense fallback={null}><BlogEditor initial={editor.post} initialTag={editor.tag} uiLanguage={language} onClose={() => setEditor(null)} onSaved={handleSaved} onDeleted={() => navigate(`/blog/${locale}`)} /></Suspense>}
    </main>
  )
}
