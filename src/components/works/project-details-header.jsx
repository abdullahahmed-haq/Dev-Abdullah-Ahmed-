import { ArrowLeft, ArrowRight, Pencil } from 'lucide-react'
import { LanguageSwitcher } from '../ui/language-switcher.jsx'
import { ThemeSwitcher } from '../ui/theme-switcher.jsx'

export default function ProjectDetailsHeader({ language, onLanguageChange, text, showEdit, onBack, preview = false }) {
  const BackArrow = language === 'ar' ? ArrowRight : ArrowLeft
  const backContent = <><BackArrow aria-hidden="true" />{text.backToWorks}</>

  return (
    <header className={`project-details-topbar is-${language}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {preview ? (
        <span className="project-details-back">{backContent}</span>
      ) : (
        <a className="project-details-back" href="/works" onClick={(event) => {
          if (!onBack) return
          event.preventDefault()
          onBack()
        }}>{backContent}</a>
      )}
      <div className="project-details-actions switcher-cluster" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <ThemeSwitcher />
        <LanguageSwitcher language={language} onLanguageChange={onLanguageChange} />
      </div>
      {showEdit && (
        <button className="project-details-edit" type="button"><Pencil aria-hidden="true" />{text.editProject}</button>
      )}
    </header>
  )
}
