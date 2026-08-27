import { NextResponse, type NextRequest } from 'next/server'

import { refreshSupabaseSession } from './lib/supabase/proxy'

const PUBLIC_ROUTE = /^\/(en|ar)(?:\/(?:works(?:\/[^/]+)?|blog(?:\/[^/]+)?|contact))?\/?$/
const SUPABASE_AUTH_COOKIE = /^sb-[A-Za-z0-9_-]+-auth-token(?:\.\d+)?$/

function publicAliasPath(pathname: string): string | null {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  if (normalized === '/home') return '/en'
  if (normalized === '/works' || /^\/works\/[^/]+$/.test(normalized)) return `/en${normalized}`
  if (normalized === '/contact') return '/en/contact'

  const legacyLocalizedBlog = normalized.match(/^\/blog\/(en|ar)(\/[^/]+)?$/)
  if (legacyLocalizedBlog) return `/${legacyLocalizedBlog[1]}/blog${legacyLocalizedBlog[2] || ''}`
  if (normalized === '/blog' || /^\/blog\/[^/]+$/.test(normalized)) return `/en${normalized}`
  return null
}

function normalizedPublicUrl(request: NextRequest): URL {
  const url = new URL(request.url)
  const page = url.searchParams.get('page')
  const normalizedPage = page && /^[1-9]\d{0,5}$/.test(page) ? Number(page) : 1
  url.search = normalizedPage > 1 ? `?page=${normalizedPage}` : ''
  return url
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()
  const { pathname } = request.nextUrl
  const hasAuthCookie = request.cookies.getAll().some((cookie) => SUPABASE_AUTH_COOKIE.test(cookie.name))

  if (request.method === 'GET' || request.method === 'HEAD') {
    const alias = publicAliasPath(pathname)
    if (alias) {
      const canonicalUrl = normalizedPublicUrl(request)
      canonicalUrl.pathname = alias
      const redirect = NextResponse.redirect(canonicalUrl, 308)
      redirect.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400, stale-if-error=86400')
      return redirect
    }
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const authResponse = await refreshSupabaseSession(request)
    authResponse.headers.set('Cache-Control', 'private, no-store')
    return authResponse
  }

  if ((request.method === 'GET' || request.method === 'HEAD') && PUBLIC_ROUTE.test(pathname) && !hasAuthCookie) {
    const canonicalUrl = normalizedPublicUrl(request)
    if (canonicalUrl.href !== request.url) {
      const redirect = NextResponse.redirect(canonicalUrl, 308)
      redirect.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400, stale-if-error=86400')
      return redirect
    }
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400, stale-if-error=86400')
  } else {
    response.headers.set('Cache-Control', 'private, no-store')
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
