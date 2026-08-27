'use client'

import { createBrowserClient } from '@supabase/ssr'

function browserCredentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !publishableKey) throw new Error('Supabase browser credentials are not configured.')
  return { url, publishableKey }
}

export function createSupabaseBrowserClient() {
  const { url, publishableKey } = browserCredentials()
  return createBrowserClient(url, publishableKey)
}
