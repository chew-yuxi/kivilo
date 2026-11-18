import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { StoreButtons } from '../../components/app-downloads'
import { FREE_ACTIVE_PROPERTIES } from '../../../src/lib/plan-limits'
import landing from '../landing.module.css'
import styles from './app-page.module.css'

// The link to share. A store URL previews as Apple's or Google's own card, which is only
// the app icon; this page previews as Kivilo's card and sends each phone to its store.
const title = 'Get Kivilo for iPhone and Android'
const description = `Property handovers from check-in to check-out, signed on the phone. On the App Store and Google Play. ${FREE_ACTIVE_PROPERTIES} active properties free.`
const socialImage = '/opengraph-image.png?v=20261024-upgrade'
export const metadata: Metadata = {
  title: `${title} | Kivilo`,
  description,
  alternates: { canonical: 'https://kivilo.app/app' },
  robots: { index: true, follow: true },
  itunes: { appId: '6821514302' },
  openGraph: {
    type: 'website', url: 'https://kivilo.app/app', siteName: 'Kivilo', locale: 'en_SG',
    title, description,
    images: [{ url: socialImage, width: 1200, height: 630, alt: 'Kivilo: Give every tenancy an upgrade.' }],
  },
  twitter: { card: 'summary_large_image', title, description, images: [socialImage] },
}

export default function AppPage() {
  return (
    <div className={landing.page}>
      <header className={styles.header}>
        <Link className={landing.wordmark} href="/" aria-label="Kivilo home"><span className={landing.brandMark} aria-hidden="true" />kivilo</Link>
      </header>
      <main className={`${landing.finalCta} ${styles.main}`}>
        <div className={landing.happyScene}><Image src="/art/tenancy-scenes.webp" alt="An agent and a happy resident exchanging keys at their new home." width={2172} height={724} sizes="300px" unoptimized priority /></div>
        <h1 className={styles.title}>Get Kivilo</h1>
        <p>Every handover, signed on the phone.<br />{FREE_ACTIVE_PROPERTIES} active properties free.</p>
        <StoreButtons />
        <p className={styles.browser}>No app? <Link href="https://my.kivilo.app/inspections" prefetch={false}>Start free in your browser</Link></p>
      </main>
    </div>
  )
}
