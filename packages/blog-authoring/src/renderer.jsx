import React from 'react'

function Inline({ content = [] }) {
  return content.map((item, index) => {
    if (item.type === 'link') return <a key={index} href={item.href} target="_blank" rel="noreferrer">{item.content}</a>
    let node = item.text
    if (item.styles?.code) node = <code>{node}</code>
    if (item.styles?.bold) node = <strong>{node}</strong>
    if (item.styles?.italic) node = <em>{node}</em>
    if (item.styles?.underline) node = <u>{node}</u>
    if (item.styles?.strike) node = <s>{node}</s>
    return <React.Fragment key={index}>{node}</React.Fragment>
  })
}

function DocumentBlock({ block }) {
  const props = block.props || {}
  const children = block.children?.length ? <div className="blog-document-children">{block.children.map((child) => <DocumentBlock key={child.id} block={child} />)}</div> : null
  if (block.type === 'heading') {
    const Heading = `h${Math.max(2, Math.min(4, props.level || 2))}`
    return <><Heading id={block.id}><Inline content={block.content} /></Heading>{children}</>
  }
  if (block.type === 'bulletListItem' || block.type === 'numberedListItem') return <li className={block.type === 'numberedListItem' ? 'is-numbered' : ''}><Inline content={block.content} />{children}</li>
  if (block.type === 'checkListItem') return <div className="blog-document-check"><input type="checkbox" checked={Boolean(props.checked)} readOnly tabIndex={-1} /><span><Inline content={block.content} /></span>{children}</div>
  if (block.type === 'toggleListItem') return <details><summary><Inline content={block.content} /></summary>{children}</details>
  if (block.type === 'quote') return <blockquote><Inline content={block.content} />{children}</blockquote>
  if (block.type === 'callout') return <aside className="blog-callout"><Inline content={block.content} />{children}</aside>
  if (block.type === 'codeBlock') return <figure className="blog-code"><figcaption>{props.filename || props.language || 'text'}</figcaption><pre><code>{block.content}</code></pre></figure>
  if (block.type === 'divider') return <hr />
  if (block.type === 'image') return props.url ? <figure className="blog-media"><img src={props.url} alt={props.alt || ''} loading="lazy" decoding="async" />{props.caption && <figcaption>{props.caption}</figcaption>}</figure> : null
  if (block.type === 'video') return props.url ? <figure className="blog-media"><video controls preload="metadata" src={props.url} />{props.caption && <figcaption>{props.caption}</figcaption>}</figure> : null
  if (block.type === 'audio') return props.url ? <figure className="blog-audio"><audio controls preload="metadata" src={props.url} />{props.caption && <figcaption>{props.caption}</figcaption>}</figure> : null
  if (block.type === 'gallery') return <section className="blog-gallery">{(props.items || []).map((item, index) => <figure key={`${item.url}-${index}`}><img src={item.url} alt={item.alt || ''} loading="lazy" decoding="async" />{item.caption && <figcaption>{item.caption}</figcaption>}</figure>)}</section>
  if (block.type === 'embed') return props.url ? <figure className="blog-embed"><iframe loading="lazy" sandbox="allow-scripts allow-same-origin allow-presentation" referrerPolicy="no-referrer" src={props.url.replace('watch?v=', 'embed/')} title={props.caption || 'Embedded media'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />{props.caption && <figcaption>{props.caption}</figcaption>}</figure> : null
  if (block.type === 'button') return props.url ? <p><a className={`blog-inline-button is-${props.style || 'primary'}`} href={props.url} target="_blank" rel="noreferrer"><Inline content={block.content} /></a></p> : null
  if (block.type === 'table') return <div className="blog-table-wrap"><table><tbody>{(block.content?.rows || []).map((row, rowIndex) => <tr key={rowIndex}>{(row.cells || []).map((cell, cellIndex) => rowIndex === 0 ? <th scope="col" key={cellIndex}><Inline content={cell} /></th> : <td key={cellIndex}><Inline content={cell} /></td>)}</tr>)}</tbody></table></div>
  if (block.type === 'columnList') return <div className="blog-document-columns">{(block.children || []).map((column) => <section key={column.id} style={{ flexBasis: `${column.props?.width || 50}%` }}>{(column.children || []).map((child) => <DocumentBlock key={child.id} block={child} />)}</section>)}</div>
  return <p style={{ textAlign: props.textAlignment }}><Inline content={block.content} />{children}</p>
}

export function BlogDocument({ document = [] }) {
  const blocks = []
  for (let index = 0; index < document.length; index += 1) {
    const block = document[index]
    if (block.type === 'bulletListItem' || block.type === 'numberedListItem') {
      const ordered = block.type === 'numberedListItem'
      const items = []
      while (index < document.length && document[index].type === (ordered ? 'numberedListItem' : 'bulletListItem')) { items.push(document[index]); index += 1 }
      index -= 1
      const List = ordered ? 'ol' : 'ul'
      blocks.push(<List key={block.id}>{items.map((item) => <DocumentBlock key={item.id} block={item} />)}</List>)
    } else blocks.push(<DocumentBlock key={block.id} block={block} />)
  }
  return <div className="blog-blocks blog-document">{blocks}</div>
}
