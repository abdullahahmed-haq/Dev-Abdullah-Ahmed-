'use client'

import { useRouter } from 'next/navigation'

import LiquidMorphFloatingMenu from '../components/ui/liquid-morph-floating-menu'
import type { Locale } from '../../lib/release/types'

export function PublicNavigation({ locale }: Readonly<{ locale: Locale }>) {
  const router = useRouter()
  const items = locale === 'ar'
    ? [
        { label: 'الرئيسية', href: `/${locale}` },
        { label: 'الأعمال', href: `/${locale}/works` },
        { label: 'المدونة', href: `/${locale}/blog` },
        { label: 'تواصل', href: `/${locale}/contact` },
      ]
    : [
        { label: 'Home', href: `/${locale}` },
        { label: 'Works', href: `/${locale}/works` },
        { label: 'Blog', href: `/${locale}/blog` },
        { label: 'Contact', href: `/${locale}/contact` },
      ]

  return <LiquidMorphFloatingMenu
    items={items.map((item) => ({ label: item.label, onClick: () => router.push(item.href), animateCharacters: locale !== 'ar' }))}
    menuLabel={locale === 'ar' ? 'القائمة' : 'Menu'}
    openLabel={locale === 'ar' ? 'فتح القائمة' : 'Open menu'}
    closeLabel={locale === 'ar' ? 'إغلاق القائمة' : 'Close menu'}
  />
}
