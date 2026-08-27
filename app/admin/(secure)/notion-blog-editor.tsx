'use client'

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'

type EditorProps = {
  document: unknown[]
  locale?: 'ar' | 'en'
  onChange?: (document: unknown[]) => void
  onEditorReady?: (editor: { undo: () => void; redo: () => void }) => void
}

// BlockNote creates DOM-backed editor state. Keeping this boundary client-only
// avoids a server/hydration mismatch when a newly-created article mounts it.
const ClientOnlyNotionBlogEditor = dynamic<EditorProps>(
  () => import('@portfolio/blog-authoring/editor').then((module) => module.NotionBlogEditor as ComponentType<EditorProps>),
  { ssr: false, loading: () => <div className="blog-editor-loading" role="status">Loading editor…</div> },
)

export function NotionBlogEditor(props: EditorProps) {
  return <ClientOnlyNotionBlogEditor {...props} />
}
