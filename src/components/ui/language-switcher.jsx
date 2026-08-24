export function LanguageSwitcher({ language, onLanguageChange }) {
  return (
    <div className="language-switcher" role="group" aria-label="Language selector">
      <button
        className={language === 'en' ? 'language-option is-active' : 'language-option'}
        type="button"
        aria-pressed={language === 'en'}
        onClick={() => onLanguageChange('en')}
      >
        EN
      </button>
      <button
        className={language === 'ar' ? 'language-option is-active' : 'language-option'}
        type="button"
        aria-pressed={language === 'ar'}
        onClick={() => onLanguageChange('ar')}
      >
        AR
      </button>
    </div>
  )
}
