import { Check, Copy, ExternalLink } from 'lucide-react'
import { useState } from 'react'

function InlineText({ value }) {
  const parts = String(value || '').split(/(\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g)
  return parts.map((part, index) => {
    if (/^\*\*.*\*\*$/.test(part)) return <strong key={index}>{part.slice(2, -2)}</strong>
    if (/^\*.*\*$/.test(part)) return <em key={index}>{part.slice(1, -1)}</em>
    if (/^~~.*~~$/.test(part)) return <s key={index}>{part.slice(2, -2)}</s>
    if (/^`.*`$/.test(part)) return <code key={index}>{part.slice(1, -1)}</code>
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/)
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noreferrer">{link[1]}<ExternalLink aria-hidden="true" /></a>
    return part
  })
}

export function BlogBlocks({ blocks = [], locale = 'ar' }) {
  const [copiedCodeId, setCopiedCodeId] = useState('')

  async function copyCode(code, blockId) {
    try {
      if (!navigator.clipboard?.writeText) return
      await navigator.clipboard.writeText(code)
      setCopiedCodeId(blockId)
      window.setTimeout(() => setCopiedCodeId((current) => current === blockId ? '' : current), 1600)
    } catch {
      // Clipboard access can be unavailable outside a secure browser context.
    }
  }

  return (
    <div className="blog-blocks">
      {blocks.map((block) => {
        if (block.type === 'heading') {
          const Heading = block.level === 3 ? 'h3' : 'h2'
          return <Heading key={block.id} id={block.id}><InlineText value={block.text} /></Heading>
        }
        if (block.type === 'quote') return <blockquote key={block.id}><InlineText value={block.text} /></blockquote>
        if (block.type === 'callout') return <aside key={block.id} className="blog-callout"><InlineText value={block.text} /></aside>
        if (block.type === 'list') {
          const List = block.ordered ? 'ol' : 'ul'
          return <List key={block.id}>{block.items.map((item, index) => <li key={index}><InlineText value={item} /></li>)}</List>
        }
        if (block.type === 'code') {
          const copied = copiedCodeId === block.id
          const copyLabel = locale === 'ar' ? (copied ? 'تم النسخ' : 'نسخ') : (copied ? 'Copied' : 'Copy')
          const CopyIcon = copied ? Check : Copy
          return <figure key={block.id} className="blog-code"><figcaption><span>{block.filename || block.language}</span><button className="blog-code-copy" type="button" onClick={() => copyCode(block.code, block.id)} aria-label={locale === 'ar' ? 'نسخ الكود' : 'Copy code'}>{locale === 'ar' ? <><span>{copyLabel}</span><CopyIcon aria-hidden="true" /></> : <><CopyIcon aria-hidden="true" /><span>{copyLabel}</span></>}</button></figcaption><pre><code>{block.code}</code></pre></figure>
        }
        if (block.type === 'image') return block.url && <figure key={block.id} className="blog-media"><img src={block.url} alt={block.alt} loading="lazy" decoding="async" />{block.caption && <figcaption>{block.caption}</figcaption>}</figure>
        if (block.type === 'gallery') return <section key={block.id} className="blog-gallery">{block.items.map((item, index) => <figure key={`${item.url}-${index}`}><img src={item.url} alt={item.alt} loading="lazy" decoding="async" />{item.caption && <figcaption>{item.caption}</figcaption>}</figure>)}</section>
        if (block.type === 'video') return block.url && <figure key={block.id} className="blog-media"><video controls preload="metadata" src={block.url} />{block.caption && <figcaption>{block.caption}</figcaption>}</figure>
        if (block.type === 'audio') return block.url && <figure key={block.id} className="blog-audio"><audio controls preload="metadata" src={block.url} />{block.caption && <figcaption>{block.caption}</figcaption>}</figure>
        if (block.type === 'embed') return block.url && <figure key={block.id} className="blog-embed"><iframe loading="lazy" sandbox="allow-scripts allow-same-origin allow-presentation" referrerPolicy="no-referrer" src={block.url.replace('watch?v=', 'embed/')} title={block.caption || (locale === 'ar' ? 'وسائط مضمنة' : 'Embedded media')} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />{block.caption && <figcaption>{block.caption}</figcaption>}</figure>
        if (block.type === 'table') return <div key={block.id} className="blog-table-wrap"><table><tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => rowIndex === 0 ? <th key={cellIndex} scope="col">{cell}</th> : <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>
        if (block.type === 'button') return block.url && <p key={block.id}><a className={`blog-inline-button is-${block.style || 'primary'}`} href={block.url} target="_blank" rel="noreferrer">{block.text || block.url}<ExternalLink aria-hidden="true" /></a></p>
        if (block.type === 'divider') return <hr key={block.id} />
        return <p key={block.id}><InlineText value={block.text} /></p>
      })}
    </div>
  )
}
