import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { DEFAULT_PROJECT_COLOR } from '../../lib/site-content.js'
import ProjectDetailsHeader from './project-details-header.jsx'
import './project-open-transition.css'

const ease = [0.22, 1, 0.36, 1]

function getSafeOrigin(origin) {
  if (origin?.width > 0 && origin?.height > 0) return origin

  return {
    top: window.innerHeight / 2 - 45,
    left: window.innerWidth / 2 - 50,
    width: 100,
    height: 90,
  }
}

export default function ProjectOpenTransition({ project, origin, language, onLanguageChange, text, showEdit, onComplete }) {
  const reducedMotion = useReducedMotion()
  const completedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  const start = getSafeOrigin(origin)
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const originCenterX = start.left + start.width / 2
  const originCenterY = start.top + start.height / 2
  const coverScale = Math.max(
    (Math.max(originCenterX, viewportWidth - originCenterX) * 2) / Math.max(start.width, 1),
    (Math.max(originCenterY, viewportHeight - originCenterY) * 2) / Math.max(start.height, 1),
  ) * 1.03
  const pageRevealRadius = Math.hypot(
    Math.max(originCenterX, viewportWidth - originCenterX),
    Math.max(originCenterY, viewportHeight - originCenterY),
  ) + 4

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  function finishTransition() {
    if (completedRef.current) return
    completedRef.current = true
    onCompleteRef.current()
  }

  return (
    <div className="project-open-transition" aria-hidden="true">
      <motion.div
        className="project-open-transition-shape"
        style={{
          top: start.top,
          left: start.left,
          width: start.width,
          height: start.height,
          '--project-transition-color': project.color || DEFAULT_PROJECT_COLOR,
        }}
        initial={reducedMotion ? { opacity: 0 } : { scale: 0.92, borderRadius: 14 }}
        animate={reducedMotion ? { opacity: 0 } : { scale: coverScale, borderRadius: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.62, ease }}
      />
      <motion.div
        className="project-open-transition-page-color"
        initial={reducedMotion
          ? { opacity: 0 }
          : { clipPath: `circle(0px at ${originCenterX}px ${originCenterY}px)` }}
        animate={reducedMotion
          ? { opacity: 1 }
          : { clipPath: `circle(${pageRevealRadius}px at ${originCenterX}px ${originCenterY}px)` }}
        transition={{ duration: reducedMotion ? 0.1 : 0.48, delay: reducedMotion ? 0 : 0.34, ease }}
        onAnimationComplete={finishTransition}
      >
        <motion.div
          className="project-open-transition-destination"
          aria-hidden="true"
          inert={true}
          initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0.08 : 0.26, delay: reducedMotion ? 0 : 0.42, ease }}
        >
          <ProjectDetailsHeader
            language={language}
            onLanguageChange={onLanguageChange}
            text={text}
            showEdit={showEdit}
            preview
          />
        </motion.div>
      </motion.div>
    </div>
  )
}
