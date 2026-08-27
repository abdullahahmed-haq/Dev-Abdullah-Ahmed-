import { NextResponse } from 'next/server'

import { ReleaseUnavailableError, getLiveJson } from '../../lib/content/live-release'
import { absoluteUrl, escapeXml } from '../../lib/content/xml'

interface SitemapRelease { urls: Array<{ loc: string; lastModified?: string }> }

export async function GET() {
  try {
    const sitemap = await getLiveJson<SitemapRelease>('sitemap.json')
    if (!sitemap) return new NextResponse('Not found', { status: 404 })
    const urls = sitemap.urls.map((entry) => `<url><loc>${escapeXml(absoluteUrl(entry.loc))}</loc>${entry.lastModified ? `<lastmod>${escapeXml(entry.lastModified.slice(0, 10))}</lastmod>` : ''}</url>`).join('')
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400' },
    })
  } catch (error) {
    if (error instanceof ReleaseUnavailableError) return new NextResponse('Not found', { status: 404 })
    throw error
  }
}
