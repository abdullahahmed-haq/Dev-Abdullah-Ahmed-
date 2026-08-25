import { useCallback, useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ThemeSwitcher } from './components/ui/theme-switcher.jsx'
import LiquidMorphFloatingMenu from './components/ui/liquid-morph-floating-menu.jsx'
import { LanguageSwitcher } from './components/ui/language-switcher.jsx'
import GradualBlur from './components/ui/gradual-blur.jsx'
import Dashboard from './components/dashboard/dashboard.jsx'
import WorksPage from './components/works/works-page.jsx'
import ProjectDetailsPage from './components/works/project-details-page.jsx'
import { loadSiteContent } from './lib/site-content.js'
import { applyLanguagePreference, getLanguagePreference, saveLanguagePreference } from './lib/preferences.js'

const copy = {
  ar: {
    pageLabel: 'الصفحة الرئيسية',
    menuLabel: 'القائمة',
    openLabel: 'فتح القائمة',
    closeLabel: 'إغلاق القائمة',
    items: ['الرئيسية', 'الأعمال', 'تواصل'],
  },
  en: {
    pageLabel: 'Home page',
    menuLabel: 'Menu',
    openLabel: 'Open menu',
    closeLabel: 'Close menu',
    items: ['Home', 'Works', 'Contact'],
  },
}

function getInitialLanguage() {
  return getLanguagePreference()
}

function normalizePathname(pathname) {
  return pathname.replace(/\/+$/, '') || '/'
}

export default function App() {
  const [language, setLanguage] = useState(getInitialLanguage)
  const [pathname, setPathname] = useState(() => normalizePathname(window.location.pathname))
  const reducedMotion = useReducedMotion()
  const text = copy[language]

  useEffect(() => {
    applyLanguagePreference(language)
    saveLanguagePreference(language)
  }, [language])

  useEffect(() => {
    loadSiteContent().catch(() => undefined)
  }, [])

  const navigate = useCallback((destination, options = {}) => {
    const url = new URL(destination, window.location.origin)
    if (url.origin !== window.location.origin) {
      window.location.href = url.href
      return
    }

    const nextLocation = `${url.pathname}${url.search}${url.hash}`
    const currentLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`
    if (nextLocation === currentLocation) return

    const currentIndex = Number(window.history.state?.siteIndex || 0)
    window.history.replaceState(
      { ...window.history.state, siteIndex: currentIndex, scrollY: window.scrollY },
      '',
      currentLocation,
    )

    const nextState = {
      siteIndex: options.replace ? currentIndex : currentIndex + 1,
      scrollY: 0,
    }
    window.history[options.replace ? 'replaceState' : 'pushState'](nextState, '', nextLocation)
    setPathname(normalizePathname(url.pathname))
    window.requestAnimationFrame(() => window.scrollTo(0, 0))
  }, [])

  const goBack = useCallback((fallback = '/works') => {
    if (Number(window.history.state?.siteIndex || 0) > 0) {
      window.history.back()
      return
    }
    navigate(fallback, { replace: true })
  }, [navigate])

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    if (window.history.state?.siteIndex == null) {
      window.history.replaceState({ ...window.history.state, siteIndex: 0, scrollY: window.scrollY }, '')
    }

    function handlePopState(event) {
      setPathname(normalizePathname(window.location.pathname))
      window.requestAnimationFrame(() => window.scrollTo(0, Number(event.state?.scrollY || 0)))
    }

    function handleInternalLink(event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const target = event.target instanceof Element ? event.target : event.target?.parentElement
      const anchor = target?.closest('a[href]')
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return

      const url = new URL(anchor.href, window.location.origin)
      if (url.origin !== window.location.origin) return
      event.preventDefault()
      navigate(`${url.pathname}${url.search}${url.hash}`)
    }

    window.addEventListener('popstate', handlePopState)
    document.addEventListener('click', handleInternalLink)
    return () => {
      window.history.scrollRestoration = previousScrollRestoration
      window.removeEventListener('popstate', handlePopState)
      document.removeEventListener('click', handleInternalLink)
    }
  }, [navigate])

  let pageContent

  if (pathname.startsWith('/works/')) {
    const encodedProjectId = pathname.slice('/works/'.length)
    let projectId = encodedProjectId

    try {
      projectId = decodeURIComponent(encodedProjectId)
    } catch {
      projectId = ''
    }

    pageContent = <ProjectDetailsPage projectId={projectId} language={language} onLanguageChange={setLanguage} navigate={navigate} goBack={goBack} />
  } else if (pathname === '/works') {
    pageContent = <WorksPage language={language} onLanguageChange={setLanguage} navigate={navigate} />
  } else if (pathname !== '/home') {
    pageContent = <Dashboard language={language} onLanguageChange={setLanguage} />
  } else {
    pageContent = (
      <main className="page" aria-label={text.pageLabel}>
        <div className="language-switcher-position">
          <LanguageSwitcher language={language} onLanguageChange={setLanguage} />
        </div>
        <div className="theme-switcher-position">
          <ThemeSwitcher />
        </div>
        <GradualBlur
          target="page"
          position="bottom"
          height="12rem"
          strength={1.5}
          divCount={6}
          curve="bezier"
          exponential
          opacity={0.9}
          zIndex={-50}
        />
        <LiquidMorphFloatingMenu
          items={text.items}
          menuLabel={text.menuLabel}
          openLabel={text.openLabel}
          closeLabel={text.closeLabel}
          onItemSelect={(index) => {
            if (index === 1) navigate('/works')
          }}
        />
      </main>
    )
  }

  return (
    <motion.div
      className="app-route"
      key={pathname}
      initial={{ opacity: reducedMotion ? 1 : 0.96 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.14, ease: [0.22, 1, 0.36, 1] }}
    >
      {pageContent}
    </motion.div>
  )
}
