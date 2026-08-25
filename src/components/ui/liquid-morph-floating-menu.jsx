import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const ease = [0.22, 1, 0.36, 1]

function MenuItem({ label, index, isOpen, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const isArabic = /[\u0600-\u06ff]/.test(label)

  return (
    <motion.button
      className={isArabic ? 'liquid-menu-item liquid-menu-item--arabic' : 'liquid-menu-item'}
      initial={false}
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      animate={{ opacity: isOpen ? 1 : 0, y: isOpen ? 0 : 8 }}
      transition={{ duration: isOpen ? 0.3 : 0.14, delay: isOpen ? 0.4 + index * 0.06 : 0, ease }}
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

export default function LiquidMorphFloatingMenu({ items, menuLabel, openLabel, closeLabel, onItemSelect }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const reducedMotion = useReducedMotion()

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
        className="liquid-menu-entry"
        initial={reducedMotion ? false : { opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.72, delay: 0.08, ease }}
      >
        <motion.div
          className="liquid-menu-surface"
          initial={false}
          onClick={() => !isOpen && setIsOpen(true)}
          animate={{
            width: isOpen ? 280 : 150,
            height: isOpen ? 260 : 48,
            borderRadius: isOpen ? 32 : 72,
          }}
          whileHover={isOpen ? undefined : { scale: 1.04 }}
          transition={reducedMotion ? { duration: 0 } : {
            width: { duration: isOpen ? 0.62 : 0.44, ease },
            height: { duration: isOpen ? 0.62 : 0.44, ease },
            borderRadius: { duration: isOpen ? 0.5 : 0.34, ease },
            scale: { duration: 0.22, ease },
          }}
        >
          <div className="liquid-menu-yellow-layer" />
          <motion.div
            className="liquid-menu-dark-circle"
            initial={false}
            animate={{ scale: isOpen ? 1.06 : 0 }}
            transition={reducedMotion ? { duration: 0 } : {
              duration: isOpen ? 0.72 : 0.36,
              ease: isOpen ? [0.4, 0, 0.2, 1] : ease,
              delay: isOpen ? 0.04 : 0,
            }}
          />

          <div className={isOpen ? 'liquid-menu-items is-open' : 'liquid-menu-items'}>
            {items.map((label, index) => (
              <MenuItem
                key={label}
                label={label}
                index={index}
                isOpen={isOpen}
                onSelect={() => {
                  setIsOpen(false)
                  onItemSelect?.(index)
                }}
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
              initial={false}
              animate={{ color: isOpen ? '#f7f1ed' : '#242424' }}
              transition={{ duration: 0.3, ease }}
            >
              {menuLabel}
            </motion.span>
            <span className="liquid-menu-hamburger" aria-hidden="true">
              <motion.i
                initial={false}
                animate={{ rotate: isOpen ? 45 : 0, y: isOpen ? 0 : -3, backgroundColor: isOpen ? '#f7f1ed' : '#242424' }}
                transition={{ duration: 0.4, ease }}
              />
              <motion.i
                initial={false}
                animate={{ rotate: isOpen ? -45 : 0, y: isOpen ? 0 : 3, backgroundColor: isOpen ? '#f7f1ed' : '#242424' }}
                transition={{ duration: 0.4, ease }}
              />
            </span>
          </button>
        </motion.div>
      </motion.div>
    </div>
  )
}
