import { ArrowLeft, ArrowRight } from 'lucide-react'
import { LanguageSwitcher } from '../ui/language-switcher.jsx'
import { ThemeSwitcher } from '../ui/theme-switcher.jsx'
import './blog-page.css'

const copy = {
  ar: {
    home: 'الرئيسية',
    eyebrow: 'أفكار وملاحظات',
    title: 'مدونة',
    description: 'مساحة للكتابة عن التصميم، التطوير، والتجارب التي أتعلم منها.',
    emptyTitle: 'قريبًا',
    emptyText: 'أعمل على أول تدوينة. عد للقراءة لاحقًا.',
  },
  en: {
    home: 'Home',
    eyebrow: 'Thoughts & notes',
    title: 'Blog',
    description: 'A space for writing about design, development, and the lessons I learn along the way.',
    emptyTitle: 'Coming soon',
    emptyText: 'I am working on the first post. Check back later for something new.',
  },
}

export default function BlogPage({ language, onLanguageChange }) {
  const text = copy[language]
  const BackArrow = language === 'ar' ? ArrowRight : ArrowLeft

  return (
    <main className="blog-page" aria-labelledby="blog-title">
      <header className="blog-topbar">
        <a className="blog-home-link" href="/home"><BackArrow aria-hidden="true" />{text.home}</a>
        <div className="blog-controls" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <ThemeSwitcher />
          <LanguageSwitcher language={language} onLanguageChange={onLanguageChange} />
        </div>
      </header>

      <section className="blog-intro">
        <p>{text.eyebrow}</p>
        <h1 id="blog-title">{text.title}</h1>
        <span>{text.description}</span>
      </section>

      <section className="blog-empty" aria-label={text.emptyTitle}>
        <span aria-hidden="true">01</span>
        <div>
          <h2>{text.emptyTitle}</h2>
          <p>{text.emptyText}</p>
        </div>
      </section>
    </main>
  )
}
