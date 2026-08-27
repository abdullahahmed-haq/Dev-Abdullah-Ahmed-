import { apiErrorResponse, jsonResponse } from '../../../../lib/http/response'
import { parseJsonBody } from '../../../../lib/http/request'
import { assertTrustedMutation } from '../../../../lib/http/security'
import { mediaRegistrationInputSchema, registerMediaAsset } from '../../../../lib/media/service'

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request)
    const input = await parseJsonBody(request, mediaRegistrationInputSchema)
    await registerMediaAsset(input)
    return jsonResponse({ ok: true }, 201)
  } catch (error) {
    return apiErrorResponse(error, 'MEDIA_REGISTRATION_FAILED', 'Media registration is temporarily unavailable.')
  }
}
