import { useEffect, useRef, useState } from 'react'
import './folder.css'

const FOLDER_REVEAL_DURATION = 280

function darkenColor(hex, percent) {
  let color = hex.startsWith('#') ? hex.slice(1) : hex
  if (color.length === 3) color = color.split('').map((character) => character + character).join('')

  const number = Number.parseInt(color.slice(0, 6), 16)
  const channel = (shift) => Math.max(0, Math.min(255, Math.floor(((number >> shift) & 0xff) * (1 - percent))))
  const result = (1 << 24) + (channel(16) << 16) + (channel(8) << 8) + channel(0)
  return `#${result.toString(16).slice(1).toUpperCase()}`
}

export default function Folder({ color = '#d5aa21', size = 1, items = [], className = '', openLabel = 'Open folder', closeLabel = 'Close folder', onOpen }) {
  const papers = [...items.slice(0, 3)]
  while (papers.length < 3) papers.push(null)

  const [open, setOpen] = useState(false)
  const [paperOffsets, setPaperOffsets] = useState(Array.from({ length: 3 }, () => ({ x: 0, y: 0 })))
  const openTimerRef = useRef(null)
  const folderRef = useRef(null)

  useEffect(() => () => window.clearTimeout(openTimerRef.current), [])

  function toggleFolder() {
    setOpen((current) => !current)
    if (open) setPaperOffsets(Array.from({ length: 3 }, () => ({ x: 0, y: 0 })))
  }

  function activateFolder() {
    if (!onOpen) {
      toggleFolder()
      return
    }

    if (openTimerRef.current) return

    setOpen(true)
    const rect = folderRef.current?.getBoundingClientRect()
    const origin = rect ? {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    } : null
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = null
      onOpen(origin)
    }, reducedMotion ? 40 : FOLDER_REVEAL_DURATION)
  }

  function movePaper(event, index) {
    if (!open) return
    const rect = event.currentTarget.getBoundingClientRect()
    const offset = {
      x: (event.clientX - (rect.left + rect.width / 2)) * 0.15,
      y: (event.clientY - (rect.top + rect.height / 2)) * 0.15,
    }
    setPaperOffsets((current) => current.map((value, itemIndex) => itemIndex === index ? offset : value))
  }

  function resetPaper(index) {
    setPaperOffsets((current) => current.map((value, itemIndex) => itemIndex === index ? { x: 0, y: 0 } : value))
  }

  return (
    <div className={`folder-scale ${className}`.trim()} style={{ '--folder-scale': size }}>
      <div
        ref={folderRef}
        className={`folder${open ? ' open' : ''}`}
        style={{
          '--folder-color': color,
          '--folder-back-color': darkenColor(color, 0.12),
          '--paper-1': '#e6e1da',
          '--paper-2': '#f3eee8',
          '--paper-3': '#fffaf3',
        }}
        onClick={activateFolder}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            activateFolder()
          }
        }}
        tabIndex={0}
        role="button"
        aria-expanded={open}
        aria-label={open ? closeLabel : openLabel}
      >
        <div className="folder__back">
          {papers.map((item, index) => (
            <div
              key={index}
              className={`paper paper-${index + 1}`}
              onMouseMove={(event) => movePaper(event, index)}
              onMouseLeave={() => resetPaper(index)}
              style={open ? {
                '--magnet-x': `${paperOffsets[index].x}px`,
                '--magnet-y': `${paperOffsets[index].y}px`,
              } : undefined}
            >
              {item}
            </div>
          ))}
          <div className="folder__front" />
          <div className="folder__front right" />
        </div>
      </div>
    </div>
  )
}
