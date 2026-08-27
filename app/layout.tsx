import type { Metadata } from 'next'

import './styles.css'

export const metadata: Metadata = {
  title: { default: 'Abdullah Ahmed', template: '%s · Abdullah Ahmed' },
  description: 'Portfolio of Abdullah Ahmed, designer and developer.',
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
