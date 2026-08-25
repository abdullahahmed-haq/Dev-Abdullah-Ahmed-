import { useEffect, useRef, useState } from 'react'

const PRESETS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899', '#F43F5E']

function normaliseHex(value) {
  const hex = String(value || '').trim()
  if (/^#[0-9a-f]{3}$/i.test(hex)) return `#${hex.slice(1).split('').map((character) => character + character).join('')}`.toUpperCase()
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex.toUpperCase() : null
}

function hexToHsl(hex) {
  const value = normaliseHex(hex) || '#D5AA21'
  const red = Number.parseInt(value.slice(1, 3), 16) / 255
  const green = Number.parseInt(value.slice(3, 5), 16) / 255
  const blue = Number.parseInt(value.slice(5, 7), 16) / 255
  const maximum = Math.max(red, green, blue)
  const minimum = Math.min(red, green, blue)
  const lightness = (maximum + minimum) / 2
  const delta = maximum - minimum
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1))
  let hue = 0

  if (delta !== 0) {
    if (maximum === red) hue = 60 * (((green - blue) / delta) % 6)
    else if (maximum === green) hue = 60 * ((blue - red) / delta + 2)
    else hue = 60 * ((red - green) / delta + 4)
  }

  return { hue: (hue + 360) % 360, saturation: saturation * 100, lightness: lightness * 100 }
}

function hslToHex(hue, saturation, lightness) {
  const chroma = (1 - Math.abs(2 * lightness / 100 - 1)) * saturation / 100
  const segment = hue / 60
  const secondary = chroma * (1 - Math.abs(segment % 2 - 1))
  const match = lightness / 100 - chroma / 2
  const [red, green, blue] = segment < 1 ? [chroma, secondary, 0]
    : segment < 2 ? [secondary, chroma, 0]
      : segment < 3 ? [0, chroma, secondary]
        : segment < 4 ? [0, secondary, chroma]
          : segment < 5 ? [secondary, 0, chroma]
            : [chroma, 0, secondary]
  return `#${[red, green, blue].map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

export default function ProjectColorPicker({ label, value, onChange }) {
  const rootRef = useRef(null)
  const color = normaliseHex(value) || '#D5AA21'
  const [open, setOpen] = useState(false)
  const [hexInput, setHexInput] = useState(color)
  const { hue, saturation, lightness } = hexToHsl(color)

  useEffect(() => setHexInput(color), [color])

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsidePointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  function setHsl(nextHue, nextSaturation, nextLightness) {
    onChange(hslToHex(Math.round(nextHue), Math.round(nextSaturation), Math.round(nextLightness)))
  }

  function updateFromArea(event) {
    const bounds = event.currentTarget.getBoundingClientRect()
    const nextSaturation = Math.min(100, Math.max(0, (event.clientX - bounds.left) / bounds.width * 100))
    const nextLightness = Math.min(100, Math.max(0, 100 - (event.clientY - bounds.top) / bounds.height * 100))
    setHsl(hue, nextSaturation, nextLightness)
  }

  function commitHex() {
    const next = normaliseHex(hexInput)
    if (next) onChange(next)
    else setHexInput(color)
  }

  return (
    <div className="project-color-picker" ref={rootRef}>
      <button className="project-color-picker-trigger" type="button" onClick={() => setOpen((current) => !current)} aria-label={label} title={label} aria-haspopup="dialog" aria-expanded={open}>
        <span className="project-color-picker-swatch" style={{ background: color }} aria-hidden="true" />
      </button>
      {open && (
        <div className="project-color-picker-popover" role="dialog" aria-label={label}>
          <div
            className="project-color-picker-area"
            role="button"
            tabIndex={0}
            aria-label="Choose saturation and brightness"
            style={{ backgroundColor: `hsl(${hue} 100% 50%)` }}
            onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); updateFromArea(event) }}
            onPointerMove={(event) => event.currentTarget.hasPointerCapture(event.pointerId) && updateFromArea(event)}
            onKeyDown={(event) => {
              const adjustment = event.shiftKey ? 10 : 2
              if (event.key === 'ArrowLeft') { event.preventDefault(); setHsl(hue, saturation - adjustment, lightness) }
              if (event.key === 'ArrowRight') { event.preventDefault(); setHsl(hue, saturation + adjustment, lightness) }
              if (event.key === 'ArrowUp') { event.preventDefault(); setHsl(hue, saturation, lightness + adjustment) }
              if (event.key === 'ArrowDown') { event.preventDefault(); setHsl(hue, saturation, lightness - adjustment) }
            }}
          >
            <span className="project-color-picker-white" />
            <span className="project-color-picker-black" />
            <span className="project-color-picker-thumb" style={{ left: `${saturation}%`, top: `${100 - lightness}%` }} />
          </div>
          <label className="project-color-picker-hue">Hue
            <input type="range" min="0" max="360" value={Math.round(hue)} onChange={(event) => setHsl(Number(event.target.value), saturation, lightness)} />
          </label>
          <div className="project-color-picker-presets" aria-label="Colour presets">
            {PRESETS.map((preset) => <button key={preset} type="button" aria-label={preset} className={preset === color ? 'is-selected' : ''} style={{ background: preset }} onClick={() => onChange(preset)} />)}
          </div>
          <label className="project-color-picker-hex">HEX
            <input value={hexInput} onChange={(event) => setHexInput(event.target.value)} onBlur={commitHex} onKeyDown={(event) => event.key === 'Enter' && commitHex()} maxLength="7" spellCheck="false" />
          </label>
        </div>
      )}
    </div>
  )
}
