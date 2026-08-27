'use client'

import { useState } from 'react'

import { createSupabaseBrowserClient } from '../../../lib/supabase/client'

export function RecoveryForm() {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(formData: FormData) {
    setPending(true)
    setError(null)
    setMessage(null)
    try {
      const origin = window.location.origin
      const { error: resetError } = await createSupabaseBrowserClient().auth.resetPasswordForEmail(String(formData.get('email') || ''), {
        redirectTo: `${origin}/auth/callback?next=/admin/recovery/complete`,
      })
      if (resetError) throw resetError
      setMessage('If that address is allowlisted, a recovery email has been sent.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to request recovery.')
    } finally {
      setPending(false)
    }
  }

  return <form action={submit} className="admin-form"><label>Email<input name="email" type="email" autoComplete="email" required /></label>{error ? <p role="alert">{error}</p> : null}{message ? <p role="status">{message}</p> : null}<button disabled={pending}>{pending ? 'Sending…' : 'Send recovery email'}</button></form>
}
