import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import { publicSupabaseConfig, serviceSupabaseConfig } from '../config/server'

/** Request-scoped user client. Session refresh is persisted by proxy.ts. */
export async function createSupabaseServerClient() {
  const { url, publishableKey } = publicSupabaseConfig()
  const cookieStore = await cookies()
  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Components cannot write cookies. proxy.ts performs refreshes.
        }
      },
    },
  })
}

export function createSupabaseServiceClient() {
  const { url, secretKey } = serviceSupabaseConfig()
  return createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } })
}
