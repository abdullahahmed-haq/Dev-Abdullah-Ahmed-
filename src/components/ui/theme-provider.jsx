import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { applyThemePreference, getThemePreference, saveThemePreference } from '../../lib/preferences.js'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getThemePreference)

  const changeTheme = useCallback((nextTheme) => {
    setTheme(saveThemePreference(nextTheme))
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => applyThemePreference(theme, mediaQuery.matches)

    saveThemePreference(theme)
    applyTheme()
    if (theme === 'system') mediaQuery.addEventListener('change', applyTheme)

    return () => mediaQuery.removeEventListener('change', applyTheme)
  }, [theme])

  return <ThemeContext.Provider value={{ theme, setTheme: changeTheme }}>{children}</ThemeContext.Provider>
}

export function useThemePreference() {
  const preference = useContext(ThemeContext)
  if (!preference) throw new Error('useThemePreference must be used within ThemeProvider')
  return preference
}
