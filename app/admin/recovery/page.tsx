import Link from 'next/link'

import { RecoveryForm } from './recovery-form'

export const metadata = { robots: { index: false, follow: false }, title: 'Password recovery' }

export default function RecoveryPage() {
  return <main className="admin-auth"><h1>Reset password</h1><RecoveryForm /><p><Link href="/admin/login">Back to sign in</Link></p></main>
}
