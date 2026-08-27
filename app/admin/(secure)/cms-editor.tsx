'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'

import { publishAction, rollbackAction, saveDraftAction, type AdminActionState } from './actions'
import { BlogAuthoringPanel } from './blog-authoring-panel'

const recoveryKey = 'portfolio-admin-cms-recovery-v1'

interface CmsEditorProps {
  revision: number
  site: Record<string, unknown>
  blog: Record<string, unknown>
  publishedVersion: string | null
  publishedAt: string | null
  releases: Array<{ releaseId: string; sourceRevision: number; createdAt: string }>
}

const initialState: AdminActionState | null = null

export function CmsEditor({ revision, site, blog, publishedVersion, publishedAt, releases }: CmsEditorProps) {
  const initialSite = useMemo(() => JSON.stringify(site, null, 2), [site])
  const initialBlog = useMemo(() => JSON.stringify(blog, null, 2), [blog])
  const [siteValue, setSiteValue] = useState(initialSite)
  const [blogValue, setBlogValue] = useState(initialBlog)
  const [savedRevision, setSavedRevision] = useState(revision)
  const [autosaveMessage, setAutosaveMessage] = useState('')
  const autosaveRef = useRef(initialBlog)
  const [saveState, saveFormAction, saving] = useActionState(saveDraftAction, initialState)
  const [publishState, publishFormAction, publishing] = useActionState(publishAction, initialState)
  const [rollbackState, rollbackFormAction, rollingBack] = useActionState(rollbackAction, initialState)

  useEffect(() => {
    const recovery = localStorage.getItem(recoveryKey)
    if (!recovery) return
    try {
      const parsed = JSON.parse(recovery) as { revision: number; site: string; blog: string }
      if (parsed.revision >= revision) {
        setSiteValue(parsed.site)
        setBlogValue(parsed.blog)
      }
    } catch {
      localStorage.removeItem(recoveryKey)
    }
  }, [revision])

  useEffect(() => {
    localStorage.setItem(recoveryKey, JSON.stringify({ revision: savedRevision, savedAt: new Date().toISOString(), site: siteValue, blog: blogValue }))
  }, [blogValue, savedRevision, siteValue])

  useEffect(() => {
    if (blogValue === autosaveRef.current) return
    const timer = window.setTimeout(async () => {
      const formData = new FormData()
      formData.set('revision', String(savedRevision))
      formData.set('site', siteValue)
      formData.set('blog', blogValue)
      const result = await saveDraftAction(null, formData)
      setAutosaveMessage(result.message)
      if (result.ok && result.revision !== undefined) {
        autosaveRef.current = blogValue
        setSavedRevision(result.revision)
        localStorage.removeItem(recoveryKey)
      }
    }, 650)
    return () => window.clearTimeout(timer)
  }, [blogValue, savedRevision, siteValue])

  useEffect(() => {
    if (saveState?.ok && saveState.revision !== undefined) {
      setSavedRevision(saveState.revision)
      localStorage.removeItem(recoveryKey)
    }
  }, [saveState])

  let parsedBlog: Record<string, unknown> = blog
  try { parsedBlog = JSON.parse(blogValue) as Record<string, unknown> } catch {}

  async function publishLocale(nextBlog: Record<string, unknown>) {
    const serialized = JSON.stringify(nextBlog)
    setBlogValue(serialized)
    const saveForm = new FormData()
    saveForm.set('revision', String(savedRevision))
    saveForm.set('site', siteValue)
    saveForm.set('blog', serialized)
    const saved = await saveDraftAction(null, saveForm)
    setAutosaveMessage(saved.message)
    if (!saved.ok || saved.revision === undefined) return
    autosaveRef.current = serialized
    setSavedRevision(saved.revision)
    const publishForm = new FormData()
    publishForm.set('revision', String(saved.revision))
    const published = await publishAction(null, publishForm)
    setAutosaveMessage(published.message)
  }

  return <section className="cms-editor">
    <header><p>Draft revision {savedRevision}</p><p>Live: {publishedVersion || 'none'}{publishedAt ? ` · ${new Date(publishedAt).toLocaleString()}` : ''}</p></header>
    <form action={saveFormAction}>
      <input type="hidden" name="revision" value={savedRevision} />
      <label>Site content JSON<textarea name="site" value={siteValue} onChange={(event) => setSiteValue(event.target.value)} rows={20} spellCheck={false} /></label>
      <input type="hidden" name="blog" value={blogValue} />
      <BlogAuthoringPanel blog={parsedBlog} onChange={(next) => setBlogValue(JSON.stringify(next))} onPublish={publishLocale} />
      {saveState ? <p role="status">{saveState.message}</p> : null}
      {autosaveMessage ? <p role="status">{autosaveMessage}</p> : null}
      {saveState?.conflict ? <button type="button" onClick={() => window.location.reload()}>Reload current draft</button> : null}
      <button disabled={saving}>{saving ? 'Saving…' : 'Save draft'}</button>
    </form>
    <form action={publishFormAction}>
      <input type="hidden" name="revision" value={savedRevision} />
      {publishState ? <p role="status">{publishState.message}</p> : null}
      <button disabled={publishing || saving}>{publishing ? 'Publishing…' : 'Publish this revision'}</button>
    </form>
    <section aria-labelledby="retained-releases"><h2 id="retained-releases">Retained releases</h2>
      {rollbackState ? <p role="status">{rollbackState.message}</p> : null}
      {releases.length ? <ul>{releases.map((release) => <li key={release.releaseId}><code>{release.releaseId}</code> · draft {release.sourceRevision} · {new Date(release.createdAt).toLocaleString()}{release.releaseId === publishedVersion ? ' · live' : ''}
        {release.releaseId !== publishedVersion ? <form action={rollbackFormAction}><input type="hidden" name="releaseId" value={release.releaseId} /><button disabled={rollingBack}>Rollback</button></form> : null}
      </li>)}</ul> : <p>No R2 releases are available in this environment.</p>}
    </section>
  </section>
}
