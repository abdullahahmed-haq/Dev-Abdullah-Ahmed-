import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.jsx'
import { ThemeProvider } from './components/ui/theme-provider.jsx'
import { applyLanguagePreference, applyThemePreference, getLanguagePreference, getThemePreference } from './lib/preferences.js'

const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
applyLanguagePreference(getLanguagePreference())
applyThemePreference(getThemePreference(), systemTheme.matches)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
