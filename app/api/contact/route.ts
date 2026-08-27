import { createContactSubmissionService } from '../../../lib/contact/runtime'
import { apiErrorResponse, jsonResponse } from '../../../lib/http/response'
import { parseFormBody } from '../../../lib/http/request'
import { assertTrustedMutation, clientIp } from '../../../lib/http/security'

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request)
    const form = await parseFormBody(request)
    await createContactSubmissionService().submit({
      name: form.get('name'),
      email: form.get('email'),
      company: form.get('company'),
      projectType: form.get('projectType'),
      message: form.get('message'),
      locale: form.get('locale'),
      turnstileToken: form.get('cf-turnstile-response'),
    }, clientIp(request))
    return jsonResponse({ ok: true }, 201)
  } catch (error) {
    return apiErrorResponse(error, 'CONTACT_UNAVAILABLE', 'Contact is temporarily unavailable.')
  }
}
