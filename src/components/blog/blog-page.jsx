import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, FilePlus2, Pencil, Search, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { isAdminSession, refreshAdminSession } from '../../lib/admin-auth.js'
import { deleteBlogPost, getAdminBlogPosts, getBlogPosts } from '../../lib/blog-api.js'
import { getLocalizedPost, getReadingMinutes, isLocalePublic, matchesBlogQuery } from '../../lib/blog-model.js'
import { LanguageSwitcher } from '../ui/language-switcher.jsx'
import { ThemeSwitcher } from '../ui/theme-switcher.jsx'
import './blog-page.css'

const BlogEditor = lazy(() => import('./blog-editor.jsx'))

const copy = {
  ar: { home: 'الرئيسية', eyebrow: 'أفكار وملاحظات', title: 'مدونة', description: 'مساحة للكتابة عن التصميم، التطوير، والتجارب التي أتعلم منها.', search: 'ابحث في المقالات', clearSearch: 'مسح البحث', all: 'الكل', more: 'عرض المزيد', read: 'دقائق للقراءة', emptyTitle: 'لا توجد مقالات هنا بعد', emptyText: 'ستظهر المقالات المنشورة بهذه اللغة هنا.', noResultsTitle: 'لا توجد نتائج مطابقة', noResultsText: 'جرّب كلمات بحث أو تصنيفًا مختلفًا.', loadFailed: 'تعذر تحميل المقالات. تحقق من الاتصال ثم حاول مجددًا.', add: 'إضافة مقال', edit: 'تعديل', delete: 'حذف', deleting: 'جارٍ الحذف…', deleteTitle: 'حذف المقال؟', deleteText: 'سيُحذف هذا المقال نهائيًا ولا يمكن استعادته.', deleteFailed: 'تعذر حذف المقال. أعد تحميل الصفحة ثم حاول مجددًا.', cancel: 'إلغاء', admin: 'وضع الإدارة', published: 'المنشورة', drafts: 'المسودات', scheduled: 'المجدولة', publishedState: 'منشور', draftState: 'مسودة', scheduledState: 'مجدول', untitled: 'مقال بلا عنوان', allAdmin: 'الكل', loading: 'جارٍ تحميل المقالات…', featured: 'مقال مميز', filters: 'تصفية', retry: 'إعادة المحاولة' },
  en: { home: 'Home', eyebrow: 'Thoughts & notes', title: 'Blog', description: 'A place for design, development, and the experiments I learn from.', search: 'Search articles', clearSearch: 'Clear search', all: 'All', more: 'Load more', read: 'min read', emptyTitle: 'No articles here yet', emptyText: 'Published articles in this language will appear here.', noResultsTitle: 'No matching articles', noResultsText: 'Try another search term or category.', loadFailed: 'Articles could not be loaded. Check your connection and try again.', add: 'Add article', edit: 'Edit', delete: 'Delete', deleting: 'Deleting…', deleteTitle: 'Delete article?', deleteText: 'This article will be permanently deleted and cannot be restored.', deleteFailed: 'The article could not be deleted. Reload the page and try again.', cancel: 'Cancel', admin: 'Admin mode', published: 'Published', drafts: 'Drafts', scheduled: 'Scheduled', publishedState: 'Published', draftState: 'Draft', scheduledState: 'Scheduled', untitled: 'Untitled article', allAdmin: 'All', loading: 'Loading articles…', featured: 'Featured article', filters: 'Filter', retry: 'Retry' },
}

function formatDate(value, locale) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function cleanCategory(value) {
  const category = String(value || '').trim()
  return ['undefined', 'null'].includes(category.toLowerCase()) ? '' : category
}

function PostMeta({ post, text, featured = false }) {
  const category = cleanCategory(post.category)
  const state = text[`${post.state}State`] || text.draftState
  return <p className="blog-post-meta">{!post.public && <span className="blog-admin-state">{state}</span>}{featured && post.public && <span>{text.featured}</span>}{featured && post.public && category && <span aria-hidden="true">·</span>}{category ? <span>{category}</span> : post.public && <span>{text.title}</span>}</p>
}

export default function BlogPage({ locale, language, onLanguageChange, navigate, redirectToLocale = false }) {
  const text = copy[locale]
  const [admin, setAdmin] = useState(isAdminSession)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [tag, setTag] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [visibleCount, setVisibleCount] = useState(8)
  const [editor, setEditor] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const BackArrow = locale === 'ar' ? ArrowRight : ArrowLeft

  async function load() {
    setLoading(true); setFailed(false)
    try {
      const authenticated = await refreshAdminSession()
      setAdmin(authenticated)
      if (authenticated) setEntries(await getAdminBlogPosts())
      else {
        const result = await getBlogPosts(locale)
        setEntries(result.posts.map((post) => ({ post: { id: post.id, createdAt: post.createdAt, updatedAt: post.updatedAt, locales: { [locale]: post } }, tag: '' })))
      }
    } catch { setFailed(true) } finally { setLoading(false) }
  }

  useEffect(() => { if (redirectToLocale) navigate(`/blog/${locale}`, { replace: true }) }, [locale, navigate, redirectToLocale])
  useEffect(() => { load() }, [locale])
  useEffect(() => {
    const updateAuth = () => {
      const authenticated = isAdminSession()
      setAdmin(authenticated)
      const request = authenticated ? getAdminBlogPosts() : getBlogPosts(locale).then((result) => result.posts.map((post) => ({ post: { id: post.id, createdAt: post.createdAt, updatedAt: post.updatedAt, locales: { [locale]: post } }, tag: '' })))
      request.then(setEntries).catch(() => setFailed(true))
    }
    window.addEventListener('admin-auth-changed', updateAuth)
    return () => window.removeEventListener('admin-auth-changed', updateAuth)
  }, [locale])

  const posts = useMemo(() => entries.map(({ post, tag: revision }) => {
    const content = getLocalizedPost(post, locale)
    return content ? { ...content, id: post.id, updatedAt: post.updatedAt, createdAt: post.createdAt, revision, public: isLocalePublic(content), readingMinutes: getReadingMinutes(content) } : null
  }).filter(Boolean).filter((post) => (admin || post.public) && (statusFilter === 'all' || post.state === statusFilter)).filter((post) => (!category || post.category === category) && (!tag || post.tags.includes(tag)) && matchesBlogQuery(post, query)).sort((left, right) => Date.parse(right.publishedAt || right.updatedAt) - Date.parse(left.publishedAt || left.updatedAt)), [admin, category, entries, locale, query, statusFilter, tag])

  const categories = [...new Set(posts.map((post) => post.category).filter(Boolean))]
  const tags = [...new Set(posts.flatMap((post) => post.tags))]
  const featured = posts.find((post) => post.featured && (admin || post.public)) || posts.find((post) => post.public)
  const rest = posts.filter((post) => post.id !== featured?.id).slice(0, visibleCount)

  function openEditor(post) {
    const entry = entries.find((item) => item.post.id === post?.id)
    setEditor({ post: entry?.post || null, tag: entry?.tag || '' })
  }

  function handleSaved(savedPost, revision) {
    setEntries((current) => {
      const present = current.some((item) => item.post.id === savedPost.id)
      return present ? current.map((item) => item.post.id === savedPost.id ? { post: savedPost, tag: revision } : item) : [{ post: savedPost, tag: revision }, ...current]
    })
  }

  async function confirmDelete() {
    if (!admin || !deleteTarget || deleting) return
    setDeleting(true); setDeleteError('')
    try {
      await deleteBlogPost(deleteTarget.id, deleteTarget.revision)
      setEntries((current) => current.filter((item) => item.post.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      setDeleteError(text.deleteFailed)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <main className="blog-page blog-loading" aria-live="polite"><span role="status">{text.loading}</span></main>
  if (failed) return <main className="blog-page blog-loading"><span role="alert">{text.loadFailed}</span><button type="button" onClick={load}>{text.retry}</button></main>

  return (
    <main className="blog-page" aria-labelledby="blog-title" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <header className="blog-topbar"><a className="blog-home-link" href="/home"><BackArrow aria-hidden="true" />{text.home}</a><div className="blog-controls switcher-cluster"><ThemeSwitcher /><LanguageSwitcher language={language} onLanguageChange={(next) => { onLanguageChange(next); navigate(`/blog/${next}`) }} /></div></header>
      <section className="blog-intro"><p>{text.eyebrow}</p><h1 id="blog-title">{text.title}</h1><span>{text.description}</span></section>
      {admin && <section className="blog-admin-strip"><span>{text.admin}</span><div><button className="blog-add-button" type="button" onClick={() => openEditor()}><FilePlus2 aria-hidden="true" />{text.add}</button><div className="blog-status-filters">{[['all', text.allAdmin], ['published', text.published], ['draft', text.drafts], ['scheduled', text.scheduled]].map(([state, label]) => <button type="button" key={state} className={statusFilter === state ? 'is-active' : ''} onClick={() => { setStatusFilter(state); setVisibleCount(8) }}>{label}</button>)}</div></div></section>}
      <section className="blog-discovery" aria-label={text.filters}><label className="blog-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(8) }} placeholder={text.search} aria-label={text.search} /><button type="button" aria-label={text.clearSearch} onClick={() => setQuery('')} disabled={!query}><X aria-hidden="true" /></button></label><div className="blog-filter-row"><SlidersHorizontal aria-hidden="true" /><button className={!category ? 'is-active' : ''} type="button" onClick={() => setCategory('')}>{text.all}</button>{categories.map((item) => <button key={item} className={category === item ? 'is-active' : ''} type="button" onClick={() => setCategory(item)}>{item}</button>)}</div>{tags.length > 0 && <div className="blog-tag-row">{tags.map((item) => <button key={item} className={tag === item ? 'is-active' : ''} type="button" onClick={() => setTag(tag === item ? '' : item)}>#{item}</button>)}</div>}</section>
      {featured ? <FeaturedPost post={featured} locale={locale} text={text} admin={admin} onEdit={() => openEditor(featured)} onDelete={() => { setDeleteTarget(featured); setDeleteError('') }} /> : null}
      {rest.length > 0 ? <section className="blog-post-list" aria-label={text.title}>{rest.map((post, index) => <PostRow key={post.id} post={post} index={index + 1} locale={locale} text={text} admin={admin} onEdit={() => openEditor(post)} onDelete={() => { setDeleteTarget(post); setDeleteError('') }} />)}</section> : !featured && <section className="blog-empty"><h2>{query || category || tag ? text.noResultsTitle : text.emptyTitle}</h2><p>{query || category || tag ? text.noResultsText : text.emptyText}</p></section>}
      {posts.length > visibleCount + (featured ? 1 : 0) && <button className="blog-more-button" type="button" onClick={() => setVisibleCount((count) => count + 8)}>{text.more}</button>}
      {editor && <Suspense fallback={<div className="blog-editor-pending" role="status">{text.loading}</div>}><BlogEditor initial={editor.post} initialTag={editor.tag} uiLanguage={language} onClose={() => setEditor(null)} onSaved={handleSaved} onDeleted={(id) => setEntries((current) => current.filter((item) => item.post.id !== id))} /></Suspense>}
      {admin && deleteTarget && <div className="blog-delete-confirm" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="blog-delete-title"><h2 id="blog-delete-title">{text.deleteTitle}</h2><strong>{deleteTarget.title || text.untitled}</strong><p>{text.deleteText}</p>{deleteError && <p className="is-error" role="alert">{deleteError}</p>}<footer><button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}>{text.cancel}</button><button className="is-danger" type="button" onClick={confirmDelete} disabled={deleting}><Trash2 aria-hidden="true" />{deleting ? text.deleting : text.delete}</button></footer></section></div>}
    </main>
  )
}

function FeaturedPost({ post, locale, text, admin, onEdit, onDelete }) {
  const content = <><div>{post.cover ? <img src={post.cover} alt={post.coverAlt} loading="eager" fetchPriority="high" decoding="async" /> : <div className="blog-cover-placeholder" />}</div><section><PostMeta post={post} text={text} featured /><h2>{post.title || text.untitled}</h2><span>{post.excerpt}</span><footer><time>{formatDate(post.publishedAt || post.updatedAt, locale)}</time><small>{post.readingMinutes} {text.read}</small></footer></section></>
  return <article className={`blog-featured${post.public ? '' : ' is-private'}`}>{post.public ? <a className="blog-featured-link" href={`/blog/${locale}/${encodeURIComponent(post.slug)}`}>{content}</a> : <button className="blog-featured-link" type="button" onClick={onEdit} aria-label={`${text.edit}: ${post.title || text.untitled}`}>{content}</button>}{admin && <div className="blog-featured-actions"><button type="button" onClick={onEdit}><Pencil aria-hidden="true" />{text.edit}</button><button className="is-delete" type="button" onClick={onDelete}><Trash2 aria-hidden="true" />{text.delete}</button></div>}</article>
}

function PostRow({ post, index, locale, text, admin, onEdit, onDelete }) {
  const content = <><PostMeta post={post} text={text} /><h2>{post.title || text.untitled}</h2>{post.excerpt && <small>{post.excerpt}</small>}</>
  return <article className={`blog-post-row${post.public ? '' : ' is-private'}`}><span className="blog-post-index">{String(index).padStart(2, '0')}</span>{post.public ? <a className="blog-post-row-main" href={`/blog/${locale}/${encodeURIComponent(post.slug)}`}>{content}</a> : <button className="blog-post-row-main" type="button" onClick={onEdit} aria-label={`${text.edit}: ${post.title || text.untitled}`}>{content}</button>}<footer><time>{formatDate(post.publishedAt || post.updatedAt, locale)}</time><span>{post.readingMinutes} {text.read}</span>{admin && <div className="blog-row-admin-actions"><button type="button" onClick={onEdit}><Pencil aria-hidden="true" />{text.edit}</button><button className="is-delete" type="button" onClick={onDelete}><Trash2 aria-hidden="true" />{text.delete}</button></div>}</footer></article>
}
