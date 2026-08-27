import 'server-only'

import { redirect } from 'next/navigation'
import { cache } from 'react'

import { createSupabaseServerClient } from '../supabase/server'

export const getAdmin = cache(async function getAdmin() {
  const client = await createSupabaseServerClient()
  const { data: claims, error: claimsError } = await client.auth.getClaims()
  const userId = claims?.claims?.sub
  if (claimsError || !userId) return null

  const { data, error } = await client.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle()
  if (error || !data) return null
  return { client, userId }
})

export async function requireAdmin() {
  const admin = await getAdmin()
  if (!admin) redirect('/admin/login')
  return admin
}
