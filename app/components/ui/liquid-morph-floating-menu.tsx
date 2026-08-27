'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

import styles from './liquid-morph-floating-menu.module.css'

const ease = [0.22, 1, 0.36, 1] as const

export interface FloatingMenuItem {
  label: string
  onClick: () => void
  animateCharacters?: boolean
}

interface FloatingMenuProps {
  items: FloatingMenuItem[]
  menuLabel: string
  openLabel: string
  closeLabel: string
}

function MenuButton({ item, isOpen, index }: Readonly<{ item: FloatingMenuItem; isOpen: boolean; index: number }>) {
  const [hovered, setHovered] = useState(false)
  const animatingRef = useRef(false)
  const pendingLeaveRef = useRef(false)
  const animateCharacters = item.animateCharacters ?? true
  const characters = animateCharacters ? item.label.split('') : []
  const lockDuration = 30 * characters.length + 300

  const handleEnter = useCallback(() => {
    pendingLeaveRef.current = false
    if (hovered) return
    setHovered(true)
    animatingRef.current = true
    window.setTimeout(() => {
      animatingRef.current = false
      if (pendingLeaveRef.current) {
        pendingLeaveRef.current = false
        setHovered(false)
      }
    }, lockDuration)
  }, [hovered, lockDuration])

  const handleLeave = useCallback(() => {
    if (animatingRef.current) pendingLeaveRef.current = true
    else setHovered(false)
  }, [])

  return <motion.button
    className={`${styles.menuItem}${animateCharacters ? ` ${styles.menuItemAnimated}` : ''}`}
    type="button"
    onClick={item.onClick}
    onMouseEnter={handleEnter}
    onMouseLeave={handleLeave}
    animate={{ opacity: isOpen ? 1 : 0 }}
    transition={{ duration: .4, delay: isOpen ? .4 + .08 * index : 0, ease }}
  >
    {animateCharacters ? <span className={styles.characters}>
      {characters.map((character, characterIndex) => <span className={styles.characterMask} key={`${character}-${characterIndex}`}>
        <span
          className={styles.characterTrack}
          style={{
            transitionDuration: hovered ? '800ms' : '0ms',
            transitionDelay: hovered ? `${30 * characterIndex}ms` : '0ms',
            transform: hovered ? 'translateY(-50%)' : 'translateY(0)',
          }}
        >
          <span>{character}</span>
          <span aria-hidden>{character}</span>
        </span>
      </span>)}
    </span> : <span className={styles.wholeLabel}>{item.label}</span>}
  </motion.button>
}

export default function LiquidMorphFloatingMenu({ items, menuLabel, openLabel, closeLabel }: Readonly<FloatingMenuProps>) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  function navigate(item: FloatingMenuItem) {
    setIsOpen(false)
    item.onClick()
  }

  return <motion.div
    className={styles.container}
    ref={containerRef}
    style={{ x: '-50%' }}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: .4, ease }}
  >
    <motion.div
      className={`${styles.menu}${isOpen ? ` ${styles.open}` : ''}`}
      animate={{ width: isOpen ? 280 : 150, height: isOpen ? 260 : 48, borderRadius: isOpen ? 32 : 72 }}
      whileHover={isOpen ? undefined : { scale: 1.05 }}
      transition={{ duration: .8, ease, height: { duration: isOpen ? .8 : .15 } }}
    >
      <motion.span className={styles.background} />
      <motion.span
        className={styles.darkCircle}
        animate={{ bottom: isOpen ? '-20%' : '-200%' }}
        transition={{ duration: .8, ease, delay: isOpen ? .1 : 0 }}
      />
      <div className={styles.items} aria-hidden={!isOpen}>
        {items.map((item, index) => <MenuButton key={item.label} item={{ ...item, onClick: () => navigate(item) }} isOpen={isOpen} index={index} />)}
      </div>
      <motion.button
        className={styles.toggle}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-label={isOpen ? closeLabel : openLabel}
        animate={{ paddingInline: isOpen ? 24 : 20, paddingBottom: isOpen ? 24 : 0 }}
        transition={{ duration: .8, ease }}
      >
        <motion.span animate={{ color: isOpen ? '#f7f1ed' : '#242424' }} transition={{ duration: .3, ease }}>{menuLabel}</motion.span>
        <span className={styles.icon} aria-hidden="true">
          <motion.span animate={{ rotate: isOpen ? 45 : 0, y: isOpen ? 0 : -3, backgroundColor: isOpen ? '#f7f1ed' : '#242424' }} transition={{ duration: .4, ease }} />
          <motion.span animate={{ rotate: isOpen ? -45 : 0, y: isOpen ? 0 : 3, backgroundColor: isOpen ? '#f7f1ed' : '#242424' }} transition={{ duration: .4, ease }} />
        </span>
      </motion.button>
    </motion.div>
  </motion.div>
}
