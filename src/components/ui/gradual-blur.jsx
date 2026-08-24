import { memo, useEffect, useMemo, useRef, useState } from 'react'
import './gradual-blur.css'

const defaults = {
  position: 'bottom',
  strength: 2,
  height: '6rem',
  divCount: 5,
  exponential: false,
  zIndex: 1000,
  animated: false,
  duration: '0.3s',
  easing: 'ease-out',
  opacity: 1,
  curve: 'linear',
  responsive: false,
  target: 'parent',
  className: '',
  style: {},
}

const curves = {
  linear: (progress) => progress,
  bezier: (progress) => progress * progress * (3 - 2 * progress),
  'ease-in': (progress) => progress * progress,
  'ease-out': (progress) => 1 - (1 - progress) ** 2,
}

function GradualBlur({
  position = defaults.position,
  strength = defaults.strength,
  height = defaults.height,
  width,
  divCount = defaults.divCount,
  exponential = defaults.exponential,
  zIndex = defaults.zIndex,
  animated = defaults.animated,
  duration = defaults.duration,
  easing = defaults.easing,
  opacity = defaults.opacity,
  curve = defaults.curve,
  target = defaults.target,
  className = defaults.className,
  style = defaults.style,
}) {
  const containerRef = useRef(null)
  const [isVisible, setIsVisible] = useState(animated !== 'scroll')
  const isVertical = position === 'top' || position === 'bottom'

  useEffect(() => {
    if (animated !== 'scroll' || !containerRef.current) return undefined

    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), {
      threshold: 0.1,
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [animated])

  const layers = useMemo(() => {
    const increment = 100 / divCount
    const curveFunction = curves[curve] ?? curves.linear
    const direction = { top: 'to top', bottom: 'to bottom', left: 'to left', right: 'to right' }[position]

    return Array.from({ length: divCount }, (_, index) => {
      const layer = index + 1
      const progress = curveFunction(layer / divCount)
      const blur = exponential
        ? 2 ** (progress * 4) * 0.0625 * strength
        : 0.0625 * (progress * divCount + 1) * strength
      const start = Math.round((increment * layer - increment) * 10) / 10
      const solidEnd = Math.round(increment * layer * 10) / 10
      const fadeEnd = Math.round((increment * layer + increment) * 10) / 10
      const transparentEnd = Math.round((increment * layer + increment * 2) * 10) / 10
      let gradient = `transparent ${start}%, black ${solidEnd}%`
      if (fadeEnd <= 100) gradient += `, black ${fadeEnd}%`
      if (transparentEnd <= 100) gradient += `, transparent ${transparentEnd}%`

      return (
        <div
          key={layer}
          style={{
            maskImage: `linear-gradient(${direction}, ${gradient})`,
            WebkitMaskImage: `linear-gradient(${direction}, ${gradient})`,
            backdropFilter: `blur(${blur.toFixed(3)}rem)`,
            WebkitBackdropFilter: `blur(${blur.toFixed(3)}rem)`,
            opacity,
          }}
        />
      )
    })
  }, [curve, divCount, exponential, opacity, position, strength])

  const containerStyle = {
    position: target === 'page' ? 'fixed' : 'absolute',
    zIndex: target === 'page' ? zIndex + 100 : zIndex,
    pointerEvents: 'none',
    opacity: isVisible ? 1 : 0,
    transition: animated ? `opacity ${duration} ${easing}` : undefined,
    ...(isVertical
      ? { height, width: width || '100%', [position]: 0, left: 0, right: 0 }
      : { width: width || height, height: '100%', [position]: 0, top: 0, bottom: 0 }),
    ...style,
  }

  return (
    <div
      ref={containerRef}
      className={`gradual-blur gradual-blur-${target} ${className}`}
      style={containerStyle}
      aria-hidden="true"
    >
      <div className="gradual-blur-inner">{layers}</div>
    </div>
  )
}

export default memo(GradualBlur)
