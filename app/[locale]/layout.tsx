import { notFound } from 'next/navigation'

import { PublicNavigation } from './public-navigation'

export default async function LocaleLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params
  if (locale !== 'en' && locale !== 'ar') notFound()
  return <div lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>{children}<PublicNavigation locale={locale} /></div>
}
