import { useEffect, useState } from 'react'
import { ThemeSwitcher } from './components/ui/theme-switcher.jsx'
import LiquidMorphFloatingMenu from './components/ui/liquid-morph-floating-menu.jsx'
import { LanguageSwitcher } from './components/ui/language-switcher.jsx'
import GradualBlur from './components/ui/gradual-blur.jsx'
import Dashboard from './components/dashboard/dashboard.jsx'

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
  return localStorage.getItem('language') === 'en' ? 'en' : 'ar'
}

export default function App() {
  const [language, setLanguage] = useState(getInitialLanguage)
  const text = copy[language]

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    localStorage.setItem('language', language)
  }, [language])

  if (window.location.pathname !== '/home') {
    return <Dashboard language={language} onLanguageChange={setLanguage} />
  }

  return (
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
      />
    </main>
  )
}
