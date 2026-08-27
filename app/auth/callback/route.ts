import { redirectNoStore } from '../../../lib/http/response'
import { createSupabaseServerClient } from '../../../lib/supabase/server'

function safeNext(value: string | null) {
  return value && /^\/admin(?:\/|$)/.test(value) ? value : '/admin'
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  if (!code) return redirectNoStore(new URL('/admin/login?error=missing_code', request.url))

  const client = await createSupabaseServerClient()
  const { error } = await client.auth.exchangeCodeForSession(code)
  if (error) return redirectNoStore(new URL('/admin/login?error=callback_failed', request.url))
  return redirectNoStore(new URL(safeNext(url.searchParams.get('next')), request.url))
}
