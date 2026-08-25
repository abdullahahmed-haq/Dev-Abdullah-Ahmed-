import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, LayoutDashboard, Pencil, Plus, Trash2 } from 'lucide-react'
import { isAdminSession, refreshAdminSession } from '../../lib/admin-auth.js'
import { DEFAULT_PROJECT_COLOR, getSiteContent, loadSiteContent, saveSiteContent } from '../../lib/site-content.js'
import Folder from '../ui/folder.jsx'
import { LanguageSwitcher } from '../ui/language-switcher.jsx'
import { ThemeSwitcher } from '../ui/theme-switcher.jsx'
import ProjectOpenTransition from './project-open-transition.jsx'
import WorkEditor from './work-editor.jsx'
import './works-page.css'

const copy = {
  ar: {
    eyebrow: 'أرشيف مختار', title: 'الأعمال', description: 'كل مجلد يحكي قصة مشروع. اضغط على المجلد لعرض حركته ثم فتح تفاصيله.', emptyTitle: 'لا توجد مشاريع حتى الآن', emptyText: 'سجّل دخول المدير ثم أضف أول عمل من هذه الصفحة.', dashboard: 'لوحة التحكم', home: 'الرئيسية', backToWorks: 'العودة إلى الأعمال', editProject: 'تعديل المشروع', open: 'فتح مجلد', close: 'إغلاق مجلد', uncategorized: 'مشروع', noLink: 'قيد التجهيز',
    addWork: 'إضافة عمل جديد', editWork: 'تعديل', deleteWork: 'حذف', moreActions: 'خيارات المشروع', confirmDelete: 'هل تريد حذف هذا المشروع نهائيًا؟', saveFailed: 'تعذر حفظ التعديل على الخادم.', editorEyebrow: 'إدارة الأعمال', closeEditor: 'إغلاق النافذة', projectName: 'اسم المشروع', category: 'التصنيف', url: 'الرابط', folderColor: 'لون المجلد', cancel: 'إلغاء', save: 'حفظ المشروع',
  },
  en: {
    eyebrow: 'Selected archive', title: 'Works', description: 'Select a folder to play its animation, then open its details page.', emptyTitle: 'No projects yet', emptyText: 'Sign in as admin, then add your first work from this page.', dashboard: 'Dashboard', home: 'Home', backToWorks: 'Back to works', editProject: 'Edit project', open: 'Open folder', close: 'Close folder', uncategorized: 'Project', noLink: 'In progress',
    addWork: 'Add new work', editWork: 'Edit', deleteWork: 'Delete', moreActions: 'Project options', confirmDelete: 'Delete this project permanently?', saveFailed: 'The change could not be saved on the server.', editorEyebrow: 'Works manager', closeEditor: 'Close dialog', projectName: 'Project name', category: 'Category', url: 'URL', folderColor: 'Folder colour', cancel: 'Cancel', save: 'Save project',
  },
}

function getSafeProjectUrl(value) {
  if (!value) return ''
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

function getTextLanguage(value) {
  return /[\u0600-\u06ff]/.test(value || '') ? 'arabic' : 'english'
}

const PROJECT_MENU_HEIGHT = 108
const PROJECT_MENU_GAP = 7

function getProjectMenuPlacement(bounds) {
  const fadeHeight = Math.min(220, Math.max(140, window.innerHeight * 0.2))
  const safeBottom = window.innerHeight - fadeHeight
  const spaceBelow = safeBottom - bounds.bottom - PROJECT_MENU_GAP
  const spaceAbove = bounds.top - PROJECT_MENU_GAP - 12

  if (spaceBelow >= PROJECT_MENU_HEIGHT) return 'below'
  if (spaceAbove >= PROJECT_MENU_HEIGHT) return 'above'
  return spaceAbove > spaceBelow ? 'above' : 'below'
}

function ProjectFolder({ project, index, text, isAdmin, menuOpen, menuPlacement, onOpenDetails, onToggleMenu, onMenuPositionChange, onEdit, onDelete }) {
  const moreButtonRef = useRef(null)
  const reducedMotion = useReducedMotion()
  const type = project.type || text.uncategorized
  const projectUrl = getSafeProjectUrl(project.url)
  const titleLanguage = getTextLanguage(project.title)
  const typeLanguage = getTextLanguage(type)

  useEffect(() => {
    if (!menuOpen) return undefined

    const updatePlacement = () => {
      const bounds = moreButtonRef.current?.getBoundingClientRect()
      if (bounds) onMenuPositionChange(project.id, getProjectMenuPlacement(bounds))
    }

    updatePlacement()
    window.addEventListener('resize', updatePlacement)
    window.addEventListener('scroll', updatePlacement, true)
    return () => {
      window.removeEventListener('resize', updatePlacement)
      window.removeEventListener('scroll', updatePlacement, true)
    }
  }, [menuOpen, onMenuPositionChange, project.id])

  return (
    <article className="work-folder-card">
      <div className="work-folder-visual">
        <Folder
          color={project.color || DEFAULT_PROJECT_COLOR}
          size={1.35}
          openLabel={`${text.open}: ${project.title}`}
          closeLabel={`${text.close}: ${project.title}`}
          onOpen={onOpenDetails}
          items={[
            <span key="type" className={`folder-paper-text is-${typeLanguage}`} dir={typeLanguage === 'arabic' ? 'rtl' : 'ltr'}>{type}</span>,
            <span key="status" className="folder-paper-text is-english" dir="ltr">{projectUrl ? project.url.replace(/^https?:\/\//, '') : text.noLink}</span>,
            <strong key="title" className={`folder-paper-text is-${titleLanguage}`} dir={titleLanguage === 'arabic' ? 'rtl' : 'ltr'}>{project.title}</strong>,
          ]}
        />
      </div>
      <div className="work-folder-copy">
        <span>{String(index + 1).padStart(2, '0')}</span>
        <h2 className={`is-${titleLanguage}`} dir={titleLanguage === 'arabic' ? 'rtl' : 'ltr'}>{project.title}</h2>
        <p className={`is-${typeLanguage}`} dir={typeLanguage === 'arabic' ? 'rtl' : 'ltr'}>{type}</p>
        {projectUrl && <a href={projectUrl} target="_blank" rel="noreferrer">{project.url.replace(/^https?:\/\//, '')}</a>}
        {isAdmin && (
          <div className="work-project-admin">
            <button ref={moreButtonRef} className="work-project-more" type="button" aria-label={`${text.moreActions}: ${project.title}`} aria-expanded={menuOpen} onClick={(event) => onToggleMenu(event.currentTarget.getBoundingClientRect())}>
              <span className="work-project-more-dots" aria-hidden="true"><i /><i /><i /></span>
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  className={menuPlacement === 'above' ? 'work-project-menu is-above' : 'work-project-menu'}
                  role="menu"
                  initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: menuPlacement === 'above' ? 6 : -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: menuPlacement === 'above' ? 5 : -5, scale: 0.98 }}
                  transition={{ duration: reducedMotion ? 0.12 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <button type="button" role="menuitem" onClick={onEdit}><Pencil aria-hidden="true" />{text.editWork}</button>
                  <button className="is-danger" type="button" role="menuitem" onClick={onDelete}><Trash2 aria-hidden="true" />{text.deleteWork}</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </article>
  )
}

export default function WorksPage({ language, onLanguageChange, navigate }) {
  const [content, setContent] = useState(getSiteContent)
  const [admin, setAdmin] = useState(isAdminSession)
  const [activeMenu, setActiveMenu] = useState(null)
  const [editor, setEditor] = useState(null)
  const [openingProject, setOpeningProject] = useState(null)
  const text = copy[language]

  useEffect(() => {
    const refreshContent = () => setContent(getSiteContent())
    const refreshAuth = () => setAdmin(isAdminSession())
    window.addEventListener('site-content-updated', refreshContent)
    window.addEventListener('admin-auth-changed', refreshAuth)
    loadSiteContent({ force: true }).then(setContent).catch(() => undefined)
    refreshAdminSession().then(setAdmin)
    return () => {
      window.removeEventListener('site-content-updated', refreshContent)
      window.removeEventListener('admin-auth-changed', refreshAuth)
    }
  }, [])

  const closeEditor = useCallback(() => setEditor(null), [])

  const updateMenuPlacement = useCallback((projectId, placement) => {
    setActiveMenu((current) => {
      if (!current || current.id !== projectId || current.placement === placement) return current
      return { ...current, placement }
    })
  }, [])

  const toggleProjectMenu = useCallback((projectId, bounds) => {
    setActiveMenu((current) => current?.id === projectId
      ? null
      : { id: projectId, placement: getProjectMenuPlacement(bounds) })
  }, [])

  useEffect(() => {
    if (!activeMenu) return undefined

    const closeOnOutsidePress = (event) => {
      const target = event.target instanceof Element ? event.target : null
      if (!target?.closest('.work-project-admin')) setActiveMenu(null)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setActiveMenu(null)
    }

    document.addEventListener('pointerdown', closeOnOutsidePress)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [activeMenu])

  async function storeProjects(projects) {
    const nextContent = { ...content, projects }
    setContent(nextContent)
    try {
      setContent(await saveSiteContent(nextContent))
      return true
    } catch {
      setContent(getSiteContent())
      window.alert(text.saveFailed)
      return false
    }
  }

  async function saveProject(project) {
    if (!admin || !editor) return

    if (editor.mode === 'edit') {
      if (!await storeProjects(content.projects.map((item) => item.id === project.id ? project : item))) return
    } else {
      const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `project-${Date.now()}`
      if (!await storeProjects([{ ...project, id }, ...content.projects])) return
    }
    setActiveMenu(null)
    closeEditor()
  }

  async function deleteProject(project) {
    if (!admin || !window.confirm(text.confirmDelete)) return
    if (!await storeProjects(content.projects.filter((item) => item.id !== project.id))) return
    setActiveMenu(null)
  }

  const BackArrow = language === 'ar' ? ArrowRight : ArrowLeft

  return (
    <main className="works-page" aria-labelledby="works-title">
      <header className="works-topbar">
        <a className="works-home-link" href="/home"><BackArrow aria-hidden="true" />{text.home}</a>
        <div className="works-controls" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <a className="works-dashboard-link" href="/"><LayoutDashboard aria-hidden="true" /><span>{text.dashboard}</span></a>
          <ThemeSwitcher />
          <LanguageSwitcher language={language} onLanguageChange={onLanguageChange} />
        </div>
      </header>

      <section className="works-intro">
        <p>{text.eyebrow}</p>
        <h1 id="works-title">{text.title}</h1>
        <span>{text.description}</span>
      </section>

      {admin && (
        <div className="works-admin-bar">
          <button type="button" className="works-add-button" onClick={() => setEditor({ mode: 'add' })}><Plus aria-hidden="true" />{text.addWork}</button>
        </div>
      )}

      {content.projects.length > 0 ? (
        <section className="works-grid" aria-label={text.title}>
          {content.projects.map((project, index) => (
            <ProjectFolder
              key={project.id || `${project.title}-${index}`}
              project={project}
              index={index}
              text={text}
              isAdmin={admin}
              menuOpen={activeMenu?.id === project.id}
              menuPlacement={activeMenu?.placement}
              onOpenDetails={(origin) => {
                if (openingProject) return
                setActiveMenu(null)
                setOpeningProject({ project, origin })
              }}
              onToggleMenu={(bounds) => toggleProjectMenu(project.id, bounds)}
              onMenuPositionChange={updateMenuPlacement}
              onEdit={() => { setEditor({ mode: 'edit', project }); setActiveMenu(null) }}
              onDelete={() => deleteProject(project)}
            />
          ))}
        </section>
      ) : (
        <section className="works-empty">
          <Folder color={DEFAULT_PROJECT_COLOR} size={1.25} openLabel={text.open} closeLabel={text.close} />
          <h2>{text.emptyTitle}</h2>
          <p>{text.emptyText}</p>
          {!admin && <a href="/">{text.dashboard}</a>}
        </section>
      )}

      {editor && admin && (
        <WorkEditor project={editor.mode === 'edit' ? editor.project : null} text={text} onSave={saveProject} onClose={closeEditor} />
      )}

      {openingProject && (
        <ProjectOpenTransition
          project={openingProject.project}
          origin={openingProject.origin}
          language={language}
          onLanguageChange={onLanguageChange}
          text={text}
          showEdit={admin}
          onComplete={() => navigate(`/works/${encodeURIComponent(openingProject.project.id)}`)}
        />
      )}
    </main>
  )
}
