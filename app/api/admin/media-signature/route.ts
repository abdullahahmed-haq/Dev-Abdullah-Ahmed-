import { apiErrorResponse, jsonResponse } from '../../../../lib/http/response'
import { parseJsonBody } from '../../../../lib/http/request'
import { assertTrustedMutation } from '../../../../lib/http/security'
import { mediaSignatureInputSchema, signMediaUpload } from '../../../../lib/media/service'

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request)
    const input = await parseJsonBody(request, mediaSignatureInputSchema)
    return jsonResponse(await signMediaUpload(input))
  } catch (error) {
    return apiErrorResponse(error, 'MEDIA_SIGNING_FAILED', 'Media signing is temporarily unavailable.')
  }
}
