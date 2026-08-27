import { asPublicHttpError } from './errors'

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
} as const

export function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(body, { status, headers: { ...NO_STORE_HEADERS, ...headers } })
}

export function apiErrorResponse(error: unknown, fallbackCode: string, fallbackMessage: string): Response {
  const publicError = asPublicHttpError(error, fallbackCode, fallbackMessage)
  if (publicError.status >= 500) {
    console.error(JSON.stringify({
      level: 'error',
      code: publicError.code,
      error: publicError.cause instanceof Error ? publicError.cause.name : 'UnknownError',
    }))
  }
  return jsonResponse({ code: publicError.code, message: publicError.publicMessage }, publicError.status)
}

export function redirectNoStore(location: URL | string, status = 303): Response {
  return new Response(null, { status, headers: { ...NO_STORE_HEADERS, Location: String(location) } })
}
