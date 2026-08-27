import { NextResponse } from 'next/server'

import { ReleaseUnavailableError, getLiveJson } from '../../../../lib/content/live-release'
import { absoluteUrl, escapeXml } from '../../../../lib/content/xml'

interface RssRelease {
  feeds: Record<string, { title: string; path: string; items: Array<{ title: string; description: string; path: string; publishedAt: string }> }>
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (locale !== 'en' && locale !== 'ar') return new NextResponse('Not found', { status: 404 })
  try {
    const rss = await getLiveJson<RssRelease>('rss.json')
    const feed = rss?.feeds[locale]
    if (!feed) return new NextResponse('Not found', { status: 404 })
    const items = feed.items.map((item) => `<item><title>${escapeXml(item.title)}</title><link>${escapeXml(absoluteUrl(item.path))}</link><guid>${escapeXml(absoluteUrl(item.path))}</guid><description>${escapeXml(item.description)}</description><pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate></item>`).join('')
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXml(feed.title)}</title><link>${escapeXml(absoluteUrl(feed.path.replace('/rss.xml', '')))}</link>${items}</channel></rss>`, {
      headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400' },
    })
  } catch (error) {
    if (error instanceof ReleaseUnavailableError) return new NextResponse('Not found', { status: 404 })
    throw error
  }
}
