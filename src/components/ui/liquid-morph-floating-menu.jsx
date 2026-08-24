import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

const ease = [0.22, 1, 0.36, 1]

function MenuItem({ label, index, isOpen, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const isArabic = /[\u0600-\u06ff]/.test(label)

  return (
    <motion.button
      className={isArabic ? 'liquid-menu-item liquid-menu-item--arabic' : 'liquid-menu-item'}
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      animate={{ opacity: isOpen ? 1 : 0 }}
      transition={{ duration: 0.4, delay: isOpen ? 0.4 + index * 0.08 : 0, ease }}
    >
      {isArabic ? (
        <span className="liquid-menu-item-arabic" lang="ar">{label}</span>
      ) : (
        <span className="liquid-menu-item-letters" aria-label={label}>
          {label.split('').map((character, characterIndex) => (
            <span className="liquid-menu-letter" key={`${character}-${characterIndex}`}>
              <span
                className="liquid-menu-letter-track"
                style={{
                  transform: hovered ? 'translateY(-50%)' : 'translateY(0)',
                  transitionDelay: hovered ? `${characterIndex * 30}ms` : '0ms',
                }}
              >
                <span>{character}</span>
                <span aria-hidden="true">{character}</span>
              </span>
            </span>
          ))}
        </span>
      )}
    </motion.button>
  )
}

export default function LiquidMorphFloatingMenu({ items, menuLabel, openLabel, closeLabel }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined

    function closeOnOutsideClick(event) {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [isOpen])

  return (
    <div className="floating-menu-position" ref={containerRef}>
      <motion.div
        className="liquid-menu-surface"
        onClick={() => !isOpen && setIsOpen(true)}
        animate={{
          width: isOpen ? 280 : 150,
          height: isOpen ? 260 : 48,
          borderRadius: isOpen ? 32 : 72,
        }}
        whileHover={isOpen ? undefined : { scale: 1.04 }}
        transition={{
          duration: 0.8,
          ease,
          height: { duration: isOpen ? 0.8 : 0.15 },
          scale: { duration: 0.25, ease },
        }}
      >
        <motion.div className="liquid-menu-yellow-layer" />
        <motion.div
          className="liquid-menu-dark-circle"
          animate={{ bottom: isOpen ? '-20%' : '-200%' }}
          transition={{ duration: 0.8, ease, delay: isOpen ? 0.1 : 0 }}
        />

        <div className={isOpen ? 'liquid-menu-items is-open' : 'liquid-menu-items'}>
          {items.map((label, index) => (
            <MenuItem
              key={label}
              label={label}
              index={index}
              isOpen={isOpen}
              onSelect={() => setIsOpen(false)}
            />
          ))}
        </div>

        <button
          className="liquid-menu-toggle"
          type="button"
          aria-label={isOpen ? closeLabel : openLabel}
          aria-expanded={isOpen}
          onClick={(event) => {
            event.stopPropagation()
            setIsOpen((open) => !open)
          }}
        >
          <motion.span
            className="liquid-menu-label"
            animate={{ color: isOpen ? '#f7f1ed' : '#242424' }}
            transition={{ duration: 0.3, ease }}
          >
            {menuLabel}
          </motion.span>
          <span className="liquid-menu-hamburger" aria-hidden="true">
            <motion.i
              animate={{ rotate: isOpen ? 45 : 0, y: isOpen ? 0 : -3, backgroundColor: isOpen ? '#f7f1ed' : '#242424' }}
              transition={{ duration: 0.4, ease }}
            />
            <motion.i
              animate={{ rotate: isOpen ? -45 : 0, y: isOpen ? 0 : 3, backgroundColor: isOpen ? '#f7f1ed' : '#242424' }}
              transition={{ duration: 0.4, ease }}
            />
          </span>
        </button>
      </motion.div>
    </div>
  )
}
