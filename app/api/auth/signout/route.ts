import { apiErrorResponse, redirectNoStore } from '../../../../lib/http/response'
import { assertTrustedMutation } from '../../../../lib/http/security'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request)
    const client = await createSupabaseServerClient()
    const { error } = await client.auth.signOut()
    if (error) throw error
    return redirectNoStore(new URL('/admin/login', request.url))
  } catch (error) {
    return apiErrorResponse(error, 'SIGNOUT_FAILED', 'Sign out failed. Please try again.')
  }
}
