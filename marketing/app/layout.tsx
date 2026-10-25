import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { AcquisitionCapture } from '../components/acquisition-capture'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://kivilo.app'),
  applicationName: 'Kivilo',
  verification: { google: 'Rul02u5-UDcj6UrcNvtW6CE-gGqcFgDA-zyp451-N6Y' },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
}

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <html lang="en-SG"><head><link rel="describedby" href="/llms.txt" type="text/plain" /></head><body><AcquisitionCapture />{children}</body></html>
}
