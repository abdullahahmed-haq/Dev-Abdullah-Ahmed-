import { useCallback, useEffect, useState } from 'react'
import { isAdminSession, refreshAdminSession } from '../../lib/admin-auth.js'
import { getSiteContent, loadSiteContent, saveSiteContent } from '../../lib/site-content.js'
import ProjectDetailsHeader from './project-details-header.jsx'
import WorkEditor from './work-editor.jsx'
import './works-page.css'
import './project-details-page.css'

const copy = {
  ar: {
    pageLabel: 'تفاصيل المشروع', backToWorks: 'العودة إلى الأعمال', editProject: 'تعديل المشروع', missingTitle: 'هذا المشروع غير موجود', missingText: 'ربما تم حذف المشروع أو تغيير رابطه.',
    editorEyebrow: 'إدارة الأعمال', editWork: 'تعديل المشروع', addWork: 'إضافة عمل جديد', closeEditor: 'إغلاق النافذة', projectName: 'اسم المشروع', category: 'التصنيف', url: 'الرابط', folderColor: 'لون المجلد', cancel: 'إلغاء', save: 'حفظ المشروع', saveFailed: 'تعذر حفظ التعديل على الخادم.',
  },
  en: {
    pageLabel: 'Project details', backToWorks: 'Back to works', editProject: 'Edit project', missingTitle: 'Project not found', missingText: 'The project may have been deleted or its link changed.',
    editorEyebrow: 'Works manager', editWork: 'Edit project', addWork: 'Add new work', closeEditor: 'Close dialog', projectName: 'Project name', category: 'Category', url: 'URL', folderColor: 'Folder colour', cancel: 'Cancel', save: 'Save project', saveFailed: 'The change could not be saved on the server.',
  },
}

export default function ProjectDetailsPage({ projectId, language, onLanguageChange, navigate, goBack }) {
  const [content, setContent] = useState(getSiteContent)
  const [admin, setAdmin] = useState(isAdminSession)
  const [editorOpen, setEditorOpen] = useState(false)
  const text = copy[language]
  const project = content.projects.find((item) => item.id === projectId)

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

  useEffect(() => {
    const previousTitle = document.title
    document.title = project?.title ? `${project.title} — ${text.pageLabel}` : text.pageLabel
    return () => { document.title = previousTitle }
  }, [project?.title, text.pageLabel])

  const closeEditor = useCallback(() => setEditorOpen(false), [])

  async function saveProject(updatedProject) {
    if (!admin || !project) return
    const nextContent = {
      ...content,
      projects: content.projects.map((item) => item.id === project.id ? updatedProject : item),
    }
    setContent(nextContent)
    try {
      setContent(await saveSiteContent(nextContent))
      closeEditor()
    } catch {
      setContent(getSiteContent())
      window.alert(text.saveFailed)
    }
  }

  return (
    <main className="project-details-page" aria-label={text.pageLabel}>
      <ProjectDetailsHeader
        language={language}
        onLanguageChange={onLanguageChange}
        text={text}
        showEdit={admin && Boolean(project)}
        onEdit={() => setEditorOpen(true)}
        onBack={() => goBack('/works')}
      />

      {project ? (
        <section className="project-details-canvas" aria-label={project.title}>
          <h1 className="project-details-visually-hidden">{project.title}</h1>
        </section>
      ) : (
        <section className="project-details-missing">
          <h1>{text.missingTitle}</h1>
          <p>{text.missingText}</p>
          <a href="/works" onClick={(event) => { event.preventDefault(); navigate('/works') }}>{text.backToWorks}</a>
        </section>
      )}

      {editorOpen && admin && project && (
        <WorkEditor project={project} text={text} onSave={saveProject} onClose={closeEditor} />
      )}
    </main>
  )
}
