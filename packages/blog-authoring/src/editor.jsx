import { useEffect, useMemo, useRef } from 'react'
import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core'
import { ar, en } from '@blocknote/core/locales'
import { BlockNoteView } from '@blocknote/mantine'
import { createReactBlockSpec, getDefaultReactSlashMenuItems, SuggestionMenuController, useCreateBlockNote } from '@blocknote/react'
import { filterSuggestionItems } from '@blocknote/core'
import './styles.css'

const Callout = createReactBlockSpec({
  type: 'callout',
  propSchema: { textAlignment: { default: 'left', values: ['left', 'center', 'right', 'justify'] } },
  content: 'inline',
}, { render: (props) => <aside className="bn-portfolio-callout"><span aria-hidden="true">✦</span><div ref={props.contentRef} /></aside> })

const schema = BlockNoteSchema.create({ blockSpecs: { ...defaultBlockSpecs, callout: Callout() } })

function editorDocument(document) {
  return (document || []).map((block) => block.type === 'quote' ? { ...block, type: 'paragraph', props: { ...block.props, backgroundColor: 'gray' } } : block.type === 'divider' ? { ...block, type: 'paragraph', content: '—' } : ['gallery', 'embed', 'button', 'columnList', 'column'].includes(block.type) ? { id: block.id, type: 'paragraph', props: { textAlignment: 'left' }, content: [{ type: 'text', text: `[${block.type}]`, styles: { italic: true } }], children: [] } : block)
}

export function NotionBlogEditor({ document, locale = 'en', onChange, onEditorReady }) {
  const latestChange = useRef(onChange)
  latestChange.current = onChange
  const initialContent = useMemo(() => editorDocument(document), [])
  const editor = useCreateBlockNote({ schema, initialContent, dictionary: locale === 'ar' ? ar : en, tables: { headers: true, cellBackgroundColor: true, cellTextColor: true } }, [locale])

  useEffect(() => { onEditorReady?.(editor) }, [editor, onEditorReady])

  useEffect(() => {
    const current = JSON.stringify(editor.document)
    const incoming = JSON.stringify(editorDocument(document))
    if (current !== incoming) editor.replaceBlocks(editor.document, editorDocument(document))
  }, [document, editor])

  return <div className={`portfolio-notion-editor is-${locale}`} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <BlockNoteView editor={editor} theme="light" onChange={() => latestChange.current?.(editor.document)} slashMenu={false}>
      <SuggestionMenuController triggerCharacter="/" getItems={async (query) => filterSuggestionItems(getDefaultReactSlashMenuItems(editor), query)} />
    </BlockNoteView>
  </div>
}
