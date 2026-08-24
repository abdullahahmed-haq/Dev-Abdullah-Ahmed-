import { useEffect, useState } from 'react'

const validThemes = new Set(['system', 'light', 'dark'])

function getInitialTheme() {
  const savedTheme = localStorage.getItem('theme')
  return validThemes.has(savedTheme) ? savedTheme : 'light'
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = theme === 'dark' || (theme === 'system' && prefersDark)

    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <fieldset className="theme-switcher">
      <legend className="sr-only">اختر مظهر الصفحة</legend>

      <label className={theme === 'system' ? 'theme-option is-active' : 'theme-option'}>
        <input
          aria-label="استخدام مظهر النظام"
          type="radio"
          name="theme"
          value="system"
          checked={theme === 'system'}
          onChange={() => setTheme('system')}
        />
        <svg aria-hidden="true" viewBox="0 0 16 16">
          <path d="M1 3.25A3.25 3.25 0 0 1 4.25 0h7.5A3.25 3.25 0 0 1 15 3.25V16H1V3.25Zm3.25-1.75A1.75 1.75 0 0 0 2.5 3.25V14.5h11V3.25a1.75 1.75 0 0 0-1.75-1.75h-7.5ZM4 4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6H4V4Zm5 9h3v-1.5H9V13Z" />
        </svg>
        <span className="sr-only">النظام</span>
      </label>

      <label className={theme === 'light' ? 'theme-option is-active' : 'theme-option'}>
        <input
          aria-label="المظهر الفاتح"
          type="radio"
          name="theme"
          value="light"
          checked={theme === 'light'}
          onChange={() => setTheme('light')}
        />
        <svg aria-hidden="true" viewBox="0 0 16 16">
          <path d="M8.75 0v2.75h-1.5V0h1.5ZM13.657 2.343l1.06 1.06-1.944 1.944-1.06-1.06 1.944-1.944ZM8 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0-1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8 3.25v1.5h-2.75v-1.5H16ZM2.75 7.25v1.5H0v-1.5h2.75Zm10.967 3.933 1.06 1.06-1.06 1.06-1.06-1.06 1.06-1.06ZM3.403 2.343l1.944 1.944-1.06 1.06-1.944-1.944 1.06-1.06Zm.884 8.84 1.06 1.06-1.944 1.944-1.06-1.06 1.944-1.944ZM8.75 13.25V16h-1.5v-2.75h1.5Z" />
        </svg>
        <span className="sr-only">فاتح</span>
      </label>

      <label className={theme === 'dark' ? 'theme-option is-active' : 'theme-option'}>
        <input
          aria-label="المظهر الداكن"
          type="radio"
          name="theme"
          value="dark"
          checked={theme === 'dark'}
          onChange={() => setTheme('dark')}
        />
        <svg className="theme-icon--dark" aria-hidden="true" viewBox="0 0 16 16">
          <path transform="translate(0.4 -0.75)" d="M12.5 9.5a5.5 5.5 0 0 1-6-6 5.5 5.5 0 1 0 6 6Z" />
        </svg>
        <span className="sr-only">داكن</span>
      </label>
    </fieldset>
  )
}
