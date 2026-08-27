import type { MetadataRoute } from 'next'

import { siteOrigin } from '../lib/config/server'

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin()
  return { rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] }, sitemap: `${origin}/sitemap.xml` }
}
