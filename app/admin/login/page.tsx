import Link from 'next/link'

import { LoginForm } from './login-form'

export const metadata = { robots: { index: false, follow: false }, title: 'Admin sign in' }

export default function AdminLoginPage() {
  return <main className="admin-auth"><h1>Portfolio admin</h1><LoginForm /><p><Link href="/admin/recovery">Reset password</Link></p></main>
}
