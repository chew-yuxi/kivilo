import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kivilo: check-in / check-out',
  description: 'Condition reports that write themselves from a walkthrough.',
  appleWebApp: { capable: true, title: 'Kivilo', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  themeColor: '#ec4899',
  // Inspectors work one-handed on a phone; let them zoom into a serial number.
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

/// Deliberately bare. The inspector-facing chrome (header, upload queue, service
/// worker) lives in the `(app)` group, so a shared report opens as a clean document
/// with none of it. A landlord following a link is not a user of this app.
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  )
}
