'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { createSupabaseBrowserClient } from '../../../lib/supabase/client'

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(formData: FormData) {
    setPending(true)
    setError(null)
    try {
      const client = createSupabaseBrowserClient()
      const { error: signInError } = await client.auth.signInWithPassword({
        email: String(formData.get('email') || ''),
        password: String(formData.get('password') || ''),
      })
      if (signInError) throw signInError
      router.replace('/admin')
      router.refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign in.')
    } finally {
      setPending(false)
    }
  }

  return <form action={submit} className="admin-form">
    <label>Email<input name="email" type="email" autoComplete="email" required /></label>
    <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
    {error ? <p role="alert">{error}</p> : null}
    <button disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
  </form>
}
