import { siteOrigin } from '../config/server'
import { PublicHttpError } from './errors'

export function clientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip')?.trim()
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || ''
}

export function assertTrustedMutation(request: Request): void {
  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite === 'cross-site') {
    throw new PublicHttpError(403, 'CROSS_SITE_REQUEST', 'Cross-site requests are not allowed.')
  }

  const origin = request.headers.get('origin')
  if (!origin) return

  let requestOrigin: string
  try {
    requestOrigin = new URL(request.url).origin
  } catch {
    throw new PublicHttpError(400, 'INVALID_REQUEST_URL', 'The request URL is invalid.')
  }

  const allowedOrigins = new Set([requestOrigin, siteOrigin({ fallback: requestOrigin })])
  let suppliedOrigin: string
  try {
    suppliedOrigin = new URL(origin).origin
  } catch {
    throw new PublicHttpError(403, 'UNTRUSTED_ORIGIN', 'The request origin is not allowed.')
  }
  if (!allowedOrigins.has(suppliedOrigin)) {
    throw new PublicHttpError(403, 'UNTRUSTED_ORIGIN', 'The request origin is not allowed.')
  }
}
