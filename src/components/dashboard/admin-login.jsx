import { useState } from 'react'
import { ArrowLeft, ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react'
import { loginAdmin } from '../../lib/admin-auth.js'
import { LanguageSwitcher } from '../ui/language-switcher.jsx'
import { ThemeSwitcher } from '../ui/theme-switcher.jsx'
import './admin-login.css'

const copy = {
  ar: {
    back: 'العودة للموقع', eyebrow: 'منطقة خاصة', loginTitle: 'تسجيل دخول المدير', loginText: 'حساب مدير واحد فقط لإدارة محتوى الموقع المركزي.', username: 'اسم المستخدم', password: 'كلمة المرور', loginAction: 'تسجيل الدخول', invalid: 'اسم المستخدم أو كلمة المرور غير صحيحة.', short: 'أدخل اسم المستخدم وكلمة المرور.', notConfigured: 'يجب ضبط حساب المدير في إعدادات الخادم أولًا.', tooMany: 'محاولات كثيرة. حاول مرة أخرى بعد عدة دقائق.', working: 'جارٍ التحقق...',
  },
  en: {
    back: 'Back to site', eyebrow: 'Private area', loginTitle: 'Admin sign in', loginText: 'One admin account manages the site’s central content.', username: 'Username', password: 'Password', loginAction: 'Sign in', invalid: 'Incorrect username or password.', short: 'Enter your username and password.', notConfigured: 'Configure the admin account on the server first.', tooMany: 'Too many attempts. Try again in a few minutes.', working: 'Checking…',
  },
}

export default function AdminLogin({ language, onLanguageChange, onAuthenticated }) {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const text = copy[language]
  const BackArrow = language === 'ar' ? ArrowRight : ArrowLeft

  async function submit(event) {
    event.preventDefault()
    setError('')

    if (!form.username.trim() || !form.password) {
      setError(text.short)
      return
    }

    setLoading(true)
    try {
      const authenticated = await loginAdmin(form.username, form.password)
      if (authenticated) onAuthenticated()
      else setError(text.invalid)
    } catch (requestError) {
      if (requestError.code === 'ADMIN_NOT_CONFIGURED') setError(text.notConfigured)
      else if (requestError.code === 'TOO_MANY_ATTEMPTS') setError(text.tooMany)
      else setError(text.invalid)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="admin-login-page">
      <header className="admin-login-topbar">
        <a href="/home"><BackArrow aria-hidden="true" />{text.back}</a>
        <div className="admin-login-switchers">
          <LanguageSwitcher language={language} onLanguageChange={onLanguageChange} />
          <ThemeSwitcher />
        </div>
      </header>
      <section className="admin-login-panel" aria-labelledby="admin-login-title">
        <div className="admin-login-icon"><ShieldCheck aria-hidden="true" /></div>
        <p>{text.eyebrow}</p>
        <h1 id="admin-login-title">{text.loginTitle}</h1>
        <span>{text.loginText}</span>
        <form onSubmit={submit}>
          <label>{text.username}<input autoComplete="username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>
          <label>{text.password}<input type="password" autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
          {error && <div className="admin-login-error" role="alert">{error}</div>}
          <button type="submit" disabled={loading}><LockKeyhole aria-hidden="true" />{loading ? text.working : text.loginAction}</button>
        </form>
      </section>
    </main>
  )
}
