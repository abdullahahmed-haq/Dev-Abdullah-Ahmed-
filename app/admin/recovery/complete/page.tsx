import { PasswordForm } from './password-form'

export const metadata = { robots: { index: false, follow: false }, title: 'Set admin password' }

export default function RecoveryCompletePage() {
  return <main className="admin-auth"><h1>Set a new password</h1><PasswordForm /></main>
}
