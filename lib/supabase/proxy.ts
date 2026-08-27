import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { optionalPublicSupabaseConfig } from '../config/server'

export async function refreshSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const config = optionalPublicSupabaseConfig()
  if (!config) return response

  const client = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  await client.auth.getClaims()
  return response
}
