import { useState } from 'react'
import { BriefcaseBusiness, ChevronLeft, ChevronRight, ContactRound, ExternalLink, LayoutDashboard, Settings2 } from 'lucide-react'
import { getSiteContent, saveSiteContent } from '../../lib/site-content.js'
import { LanguageSwitcher } from '../ui/language-switcher.jsx'

const copy = {
  ar: {
    dashboard: 'لوحة التحكم', overview: 'نظرة عامة', projects: 'المشاريع', profile: 'الملف الشخصي', settings: 'إعدادات الموقع', viewSite: 'عرض الموقع', collapse: 'طي الشريط الجانبي', expand: 'توسيع الشريط الجانبي',
    backToSite: 'العودة للموقع', adminArea: 'مساحة الإدارة', saved: 'تم الحفظ تلقائيًا', welcome: 'مرحبًا عبدالله', welcomeTitle: <>كل عناصر موقعك<br />في مكان واحد.</>, addProject: 'أضف مشروعًا جديدًا', projectCount: 'المشاريع', projectCountNote: 'مشروع منشور أو محفوظ', siteStatus: 'حالة الموقع', available: 'متاح', unavailable: 'غير متاح', statusNote: 'تظهر مباشرة على الموقع', howItWorks: 'كيف تعمل لوحة التحكم؟', howItWorksText: 'أي تعديل هنا يُحفظ تلقائيًا ويصبح مصدر البيانات للموقع. أضف الأقسام الجديدة في ملف تعريف الأقسام لتظهر هنا بصورة منظمة.', newProject: 'مشروع جديد', yourProjects: 'مشاريعك', projectName: 'اسم المشروع', projectNamePlaceholder: 'مثال: Portfolio 2026', category: 'التصنيف', categoryPlaceholder: 'هوية، موقع، تطبيق...', url: 'الرابط', addProjectButton: 'إضافة المشروع', uncategorized: 'بدون تصنيف', delete: 'حذف', noProjects: 'لا توجد مشاريع بعد. أضف أول مشروع من النموذج.', profileDetails: 'بياناتك الشخصية', name: 'الاسم', role: 'المسمى', bio: 'نبذة قصيرة', email: 'البريد الإلكتروني', siteSettings: 'إعدادات الموقع', siteName: 'اسم الموقع', acceptingWork: 'متاح لتعاون جديد', availabilityDescription: 'تظهر حالة التوفر في الموقع',
  },
  en: {
    dashboard: 'Dashboard', overview: 'Overview', projects: 'Projects', profile: 'Profile', settings: 'Site settings', viewSite: 'View site', collapse: 'Collapse sidebar', expand: 'Expand sidebar',
    backToSite: 'Back to site', adminArea: 'Admin area', saved: 'Saved automatically', welcome: 'Welcome, Abdullah', welcomeTitle: <>Everything in your site,<br />in one place.</>, addProject: 'Add a new project', projectCount: 'Projects', projectCountNote: 'Published or saved projects', siteStatus: 'Site status', available: 'Available', unavailable: 'Unavailable', statusNote: 'Shown directly on the site', howItWorks: 'How does it work?', howItWorksText: 'Every change here is saved automatically and becomes the source of truth for your site. Register new sections here to keep them organised.', newProject: 'New project', yourProjects: 'Your projects', projectName: 'Project name', projectNamePlaceholder: 'Example: Portfolio 2026', category: 'Category', categoryPlaceholder: 'Brand, website, app…', url: 'URL', addProjectButton: 'Add project', uncategorized: 'Uncategorised', delete: 'Delete', noProjects: 'No projects yet. Add your first one with this form.', profileDetails: 'Profile details', name: 'Name', role: 'Role', bio: 'Short bio', email: 'Email', siteSettings: 'Site settings', siteName: 'Site name', acceptingWork: 'Available for new work', availabilityDescription: 'Your availability appears on the site',
  },
}

const sectionDefinitions = [
  { id: 'overview', icon: LayoutDashboard },
  { id: 'projects', icon: BriefcaseBusiness },
  { id: 'profile', icon: ContactRound },
  { id: 'settings', icon: Settings2 },
]

function ProjectForm({ onAdd, text, language }) {
  const [form, setForm] = useState({ title: '', type: '', url: '' })

  function submit(event) {
    event.preventDefault()
    if (!form.title.trim()) return
    onAdd({ id: crypto.randomUUID(), ...form, title: form.title.trim() })
    setForm({ title: '', type: '', url: '' })
  }

  return (
    <form className="dashboard-project-form" onSubmit={submit}>
      <label>
        {text.projectName}
        <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={text.projectNamePlaceholder} />
      </label>
      <label>
        {text.category}
        <input value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} placeholder={text.categoryPlaceholder} />
      </label>
      <label>
        {text.url}
        <input dir="ltr" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://" />
      </label>
      <button className="dashboard-primary-button" type="submit">{text.addProjectButton}</button>
    </form>
  )
}

export default function Dashboard({ language = 'ar', onLanguageChange }) {
  const [activeSection, setActiveSection] = useState('overview')
  const [content, setContent] = useState(getSiteContent)
  const [saved, setSaved] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const text = copy[language]
  const sections = sectionDefinitions.map((section) => ({ ...section, label: text[section.id] }))

  function update(nextContent) {
    setContent(nextContent)
    saveSiteContent(nextContent)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  function addProject(project) {
    update({ ...content, projects: [project, ...content.projects] })
  }

  function removeProject(id) {
    update({ ...content, projects: content.projects.filter((project) => project.id !== id) })
  }

  return (
    <main className={sidebarCollapsed ? 'dashboard-page is-sidebar-collapsed' : 'dashboard-page'}>
      <aside className="dashboard-sidebar">
        <a className="dashboard-brand" href="/home" aria-label={text.backToSite}>
          <span>AA</span>
          <strong>{text.dashboard}</strong>
        </a>
        <button className="dashboard-collapse-button" type="button" onClick={() => setSidebarCollapsed((collapsed) => !collapsed)} aria-label={sidebarCollapsed ? text.expand : text.collapse} title={sidebarCollapsed ? text.expand : text.collapse}>
          {sidebarCollapsed ? (language === 'ar' ? <ChevronLeft /> : <ChevronRight />) : (language === 'ar' ? <ChevronRight /> : <ChevronLeft />)}
        </button>
        <nav className="dashboard-nav" aria-label={text.dashboard}>
          {sections.map((section) => (
            <button key={section.id} type="button" title={section.label} className={activeSection === section.id ? 'is-active' : ''} onClick={() => setActiveSection(section.id)}>
              <section.icon aria-hidden="true" /> <span>{section.label}</span>
            </button>
          ))}
        </nav>
        <a className="dashboard-return" href="/home"><span>{text.viewSite}</span><ExternalLink aria-hidden="true" /></a>
      </aside>

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <p>{text.adminArea}</p>
            <h1>{sections.find((section) => section.id === activeSection)?.label}</h1>
          </div>
          <div className="dashboard-header-actions">
            <LanguageSwitcher language={language} onLanguageChange={onLanguageChange} />
            <span className={saved ? 'dashboard-save-status is-visible' : 'dashboard-save-status'}>{text.saved}</span>
          </div>
        </header>

        {activeSection === 'overview' && (
          <div className="dashboard-overview">
            <article className="dashboard-welcome-card">
              <p>{text.welcome}</p>
              <h2>{text.welcomeTitle}</h2>
              <button className="dashboard-primary-button" type="button" onClick={() => setActiveSection('projects')}>{text.addProject}</button>
            </article>
            <article className="dashboard-stat-card"><span>{text.projectCount}</span><strong>{content.projects.length}</strong><small>{text.projectCountNote}</small></article>
            <article className="dashboard-stat-card"><span>{text.siteStatus}</span><strong>{content.settings.availability ? text.available : text.unavailable}</strong><small>{text.statusNote}</small></article>
            <article className="dashboard-info-card">
              <h2>{text.howItWorks}</h2>
              <p>{text.howItWorksText}</p>
            </article>
          </div>
        )}

        {activeSection === 'projects' && (
          <div className="dashboard-panel-grid">
            <article className="dashboard-card"><h2>{text.newProject}</h2><ProjectForm onAdd={addProject} text={text} language={language} /></article>
            <article className="dashboard-card"><h2>{text.yourProjects} <span>{content.projects.length}</span></h2>
              <div className="dashboard-project-list">
                {content.projects.length ? content.projects.map((project) => <div className="dashboard-project" key={project.id}><div><strong>{project.title}</strong><span>{project.type || text.uncategorized}</span></div><button type="button" onClick={() => removeProject(project.id)}>{text.delete}</button></div>) : <p className="dashboard-empty">{text.noProjects}</p>}
              </div>
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
