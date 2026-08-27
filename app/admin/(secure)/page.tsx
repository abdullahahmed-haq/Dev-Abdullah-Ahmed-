import { CmsEditor } from './cms-editor'
import { loadAdminWorkspace } from '../../../lib/admin/cms'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Portfolio admin' }

export default async function AdminPage() {
  const { workspace, error } = await loadAdminWorkspace()
  if (!workspace) return <section><h1>Admin unavailable</h1><p>{error || 'The CMS state could not be loaded.'}</p></section>
  return <><h1>Portfolio admin</h1><CmsEditor
    revision={workspace.revision}
    site={workspace.site}
    blog={workspace.blog}
    publishedVersion={workspace.publishedVersion}
    publishedAt={workspace.publishedAt}
    releases={workspace.releases}
  /></>
}
