'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { createSupabaseBrowserClient } from '../../../../lib/supabase/client'

export function PasswordForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(formData: FormData) {
    const password = String(formData.get('password') || '')
    const confirmation = String(formData.get('confirmation') || '')
    if (password !== confirmation) return setError('Passwords do not match.')
    setPending(true)
    setError(null)
    try {
      const { error: updateError } = await createSupabaseBrowserClient().auth.updateUser({ password })
      if (updateError) throw updateError
      router.replace('/admin')
      router.refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update password.')
    } finally {
      setPending(false)
    }
  }

  return <form action={submit} className="admin-form"><label>New password<input name="password" type="password" autoComplete="new-password" minLength={12} required /></label><label>Confirm password<input name="confirmation" type="password" autoComplete="new-password" minLength={12} required /></label>{error ? <p role="alert">{error}</p> : null}<button disabled={pending}>{pending ? 'Updating…' : 'Set password'}</button></form>
}
