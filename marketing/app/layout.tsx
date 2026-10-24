import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://kivilo.app'),
  applicationName: 'Kivilo',
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
}

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
