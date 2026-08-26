import { useEffect, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ContactRound,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Settings2,
  ShieldCheck,
} from 'lucide-react'
import { logoutAdmin, refreshAdminSession } from '../../lib/admin-auth.js'
import { getSiteContent, loadSiteContent, migrateLegacySiteContent, saveSiteContent } from '../../lib/site-content.js'
import { LanguageSwitcher } from '../ui/language-switcher.jsx'
import { ThemeSwitcher } from '../ui/theme-switcher.jsx'
import AdminLogin from './admin-login.jsx'

const copy = {
  ar: {
    dashboard: 'لوحة التحكم', overview: 'نظرة عامة', profile: 'الملف الشخصي', settings: 'إعدادات الموقع', viewSite: 'عرض الموقع', collapse: 'طي الشريط الجانبي', expand: 'توسيع الشريط الجانبي', logout: 'تسجيل الخروج',
    backToSite: 'العودة للموقع', adminArea: 'مساحة الإدارة', saved: 'تم الحفظ مركزيًا', saveFailed: 'تعذر الحفظ', checking: 'جارٍ التحقق من جلسة المدير...', welcome: 'مرحبًا عبدالله', welcomeTitle: <>كل عناصر موقعك<br />في مكان واحد.</>, manageWorks: 'إدارة الأعمال', siteStatus: 'حالة الموقع', available: 'متاح', unavailable: 'غير متاح', statusNote: 'تظهر مباشرة على الموقع', howItWorks: 'كيف تعمل لوحة التحكم؟', howItWorksText: 'يمكنك تعديل بياناتك وإعدادات الموقع هنا، بينما تتم إضافة الأعمال وتعديلها وحذفها مباشرة من صفحة الأعمال بعد تسجيل دخول المدير.', profileDetails: 'بياناتك الشخصية', name: 'الاسم', role: 'المسمى', bio: 'نبذة قصيرة', email: 'البريد الإلكتروني', siteSettings: 'إعدادات الموقع', siteName: 'اسم الموقع', acceptingWork: 'متاح لتعاون جديد', availabilityDescription: 'تظهر حالة التوفر في الموقع',
  },
  en: {
    dashboard: 'Dashboard', overview: 'Overview', profile: 'Profile', settings: 'Site settings', viewSite: 'View site', collapse: 'Collapse sidebar', expand: 'Expand sidebar', logout: 'Sign out',
    backToSite: 'Back to site', adminArea: 'Admin area', saved: 'Saved centrally', saveFailed: 'Could not save', checking: 'Checking the admin session…', welcome: 'Welcome, Abdullah', welcomeTitle: <>Everything in your site,<br />in one place.</>, manageWorks: 'Manage works', siteStatus: 'Site status', available: 'Available', unavailable: 'Unavailable', statusNote: 'Shown directly on the site', howItWorks: 'How does it work?', howItWorksText: 'Edit your profile and site settings here. Add, edit, and delete projects directly from the Works page after signing in as admin.', profileDetails: 'Profile details', name: 'Name', role: 'Role', bio: 'Short bio', email: 'Email', siteSettings: 'Site settings', siteName: 'Site name', acceptingWork: 'Available for new work', availabilityDescription: 'Your availability appears on the site',
  },
}

const sectionDefinitions = [
  { id: 'overview', icon: LayoutDashboard },
  { id: 'profile', icon: ContactRound },
  { id: 'settings', icon: Settings2 },
]

export default function Dashboard({ language = 'ar', onLanguageChange }) {
  const [authenticated, setAuthenticated] = useState(null)
  const [activeSection, setActiveSection] = useState('overview')
  const [content, setContent] = useState(getSiteContent)
  const [saved, setSaved] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const saveRevision = useRef(0)
  const text = copy[language]
  const sections = sectionDefinitions.map((section) => ({ ...section, label: text[section.id] }))

  useEffect(() => {
    let active = true

    refreshAdminSession().then(async (isAuthenticated) => {
      if (isAuthenticated) await migrateLegacySiteContent().catch(() => undefined)
      const latestContent = await loadSiteContent({ force: true }).catch(() => getSiteContent())
      if (!active) return
      setContent(latestContent)
      setAuthenticated(isAuthenticated)
    })

    return () => { active = false }
  }, [])

  if (authenticated === null) {
    return (
      <main className="admin-login-page">
        <section className="admin-login-panel" aria-live="polite">
          <div className="admin-login-icon"><ShieldCheck aria-hidden="true" /></div>
          <h1>{text.checking}</h1>
        </section>
      </main>
    )
  }

  if (!authenticated) {
    return <AdminLogin language={language} onLanguageChange={onLanguageChange} onAuthenticated={async () => {
      await migrateLegacySiteContent().catch(() => undefined)
      setContent(await loadSiteContent({ force: true }).catch(() => getSiteContent()))
      setAuthenticated(true)
    }} />
  }

  function update(nextContent) {
    const revision = ++saveRevision.current
    setContent(nextContent)
    setSaveFailed(false)
    saveSiteContent(nextContent)
      .then((storedContent) => {
        if (revision !== saveRevision.current) return
        setContent(storedContent)
        setSaved(true)
        window.setTimeout(() => setSaved(false), 1800)
      })
      .catch(() => {
        if (revision !== saveRevision.current) return
        setContent(getSiteContent())
        setSaveFailed(true)
      })
  }

  async function signOut() {
    await logoutAdmin()
    setAuthenticated(false)
  }

  return (
    <main className={sidebarCollapsed ? 'dashboard-page is-sidebar-collapsed' : 'dashboard-page'}>
      <aside className="dashboard-sidebar">
        <a className="dashboard-brand" href="/home" aria-label={text.backToSite}>
          <span>AA</span>
          <strong>{text.dashboard}</strong>
        </a>
        <button className="dashboard-collapse-button" type="button" onClick={() => setSidebarCollapsed((collapsed) => !collapsed)} aria-label={sidebarCollapsed ? text.expand : text.collapse} aria-expanded={!sidebarCollapsed} title={sidebarCollapsed ? text.expand : text.collapse}>
          {sidebarCollapsed ? (language === 'ar' ? <ChevronLeft /> : <ChevronRight />) : (language === 'ar' ? <ChevronRight /> : <ChevronLeft />)}
        </button>
        <nav className="dashboard-nav" aria-label={text.dashboard}>
          {sections.map((section) => (
            <button key={section.id} type="button" title={section.label} className={activeSection === section.id ? 'is-active' : ''} onClick={() => setActiveSection(section.id)}>
              <section.icon aria-hidden="true" /> <span>{section.label}</span>
            </button>
          ))}
        </nav>
        <div className="dashboard-sidebar-footer">
          <button className="dashboard-logout" type="button" onClick={signOut} title={text.logout}><span>{text.logout}</span><LogOut aria-hidden="true" /></button>
          <a className="dashboard-return" href="/home"><span>{text.viewSite}</span><ExternalLink aria-hidden="true" /></a>
        </div>
      </aside>

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <p>{text.adminArea}</p>
            <h1>{sections.find((section) => section.id === activeSection)?.label}</h1>
          </div>
          <div className="dashboard-header-actions">
            <div className="dashboard-header-switchers switcher-cluster" dir={language === 'ar' ? 'rtl' : 'ltr'}>
              <ThemeSwitcher />
              <LanguageSwitcher language={language} onLanguageChange={onLanguageChange} />
            </div>
            <span className={saved || saveFailed ? 'dashboard-save-status is-visible' : 'dashboard-save-status'}>{saveFailed ? text.saveFailed : text.saved}</span>
          </div>
        </header>

        {activeSection === 'overview' && (
          <div className="dashboard-overview">
            <article className="dashboard-welcome-card">
              <p>{text.welcome}</p>
              <h2>{text.welcomeTitle}</h2>
              <a className="dashboard-primary-button" href="/works">{text.manageWorks}</a>
            </article>
            <article className="dashboard-stat-card"><span>{text.siteStatus}</span><strong>{content.settings.availability ? text.available : text.unavailable}</strong><small>{text.statusNote}</small></article>
            <article className="dashboard-info-card">
              <h2>{text.howItWorks}</h2>
              <p>{text.howItWorksText}</p>
            </article>
          </div>
        )}

        {activeSection === 'profile' && (
          <article className="dashboard-card dashboard-form-card"><h2>{text.profileDetails}</h2>
            <div className="dashboard-form-grid">
              {Object.entries({ name: text.name, role: text.role, bio: text.bio, email: text.email }).map(([key, label]) => <label key={key}>{label}<input dir={key === 'email' ? 'ltr' : undefined} value={content.profile[key]} onChange={(event) => update({ ...content, profile: { ...content.profile, [key]: event.target.value } })} /></label>)}
            </div>
          </article>
        )}

        {activeSection === 'settings' && (
          <article className="dashboard-card dashboard-form-card"><h2>{text.siteSettings}</h2>
            <div className="dashboard-form-grid">
              <label>{text.siteName}<input value={content.settings.siteTitle} onChange={(event) => update({ ...content, settings: { ...content.settings, siteTitle: event.target.value } })} /></label>
              <label className="dashboard-toggle-row"><span><strong>{text.acceptingWork}</strong><small>{text.availabilityDescription}</small></span><input type="checkbox" checked={content.settings.availability} onChange={(event) => update({ ...content, settings: { ...content.settings, availability: event.target.checked } })} /></label>
            </div>
          </article>
        )}
      </section>
    </main>
  )
}
