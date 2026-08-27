import Link from 'next/link'

import { requireAdmin } from '../../../lib/admin/authorization'

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin()
  return <main className="admin-shell"><header><Link href="/admin">Portfolio admin</Link><form action="/api/auth/signout" method="post"><button>Sign out</button></form></header>{children}</main>
}
