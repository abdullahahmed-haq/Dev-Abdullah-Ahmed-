import { z } from 'zod'

import { PublicHttpError } from './errors'

const JSON_CONTENT_TYPE = /^application\/(?:[\w.+-]+\+)?json(?:\s*;|$)/i
const FORM_CONTENT_TYPE = /^(?:multipart\/form-data|application\/x-www-form-urlencoded)(?:\s*;|$)/i

async function readLimitedBody(request: Request, maximumBytes: number): Promise<Uint8Array> {
  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new PublicHttpError(413, 'PAYLOAD_TOO_LARGE', 'The request payload is too large.')
  }

  if (!request.body) return new Uint8Array()
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let bytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > maximumBytes) {
        await reader.cancel()
        throw new PublicHttpError(413, 'PAYLOAD_TOO_LARGE', 'The request payload is too large.')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const body = new Uint8Array(bytes)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

function contentType(request: Request): string {
  return request.headers.get('content-type')?.trim() ?? ''
}

export async function parseJsonBody<T>(request: Request, schema: z.ZodType<T>, maximumBytes = 32 * 1024): Promise<T> {
  const type = contentType(request)
  if (!JSON_CONTENT_TYPE.test(type)) {
    throw new PublicHttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'A JSON request body is required.')
  }

  try {
    const body = await readLimitedBody(request, maximumBytes)
    return schema.parse(JSON.parse(new TextDecoder().decode(body)))
  } catch (error) {
    if (error instanceof PublicHttpError) throw error
    throw new PublicHttpError(400, 'INVALID_REQUEST', 'The request body is invalid.', { cause: error })
  }
}

export async function parseFormBody(request: Request, maximumBytes = 64 * 1024): Promise<FormData> {
  const type = contentType(request)
  if (!FORM_CONTENT_TYPE.test(type)) {
    throw new PublicHttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'A form request body is required.')
  }

  try {
    const body = await readLimitedBody(request, maximumBytes)
    return await new Response(Uint8Array.from(body).buffer, { headers: { 'Content-Type': type } }).formData()
  } catch (error) {
    if (error instanceof PublicHttpError) throw error
    throw new PublicHttpError(400, 'INVALID_REQUEST', 'The request body is invalid.', { cause: error })
  }
}
