import Link from 'next/link'
import type { ReactNode } from 'react'
import styles from './resources.module.css'

export default function ResourcesLayout({ children }: { children: ReactNode }) {
  return <div className={styles.page}>
    <a className={styles.skipLink} href="#main">Skip to content</a>
    <header className={styles.header}>
      <Link className={styles.wordmark} href="/" aria-label="Kivilo home"><span aria-hidden="true" />kivilo</Link>
      <nav aria-label="Main navigation"><Link href="/compare">Compare</Link><Link href="/guides">Guides</Link><a className={styles.button} href="https://my.kivilo.app/login">Start free</a></nav>
    </header>
    <main id="main">{children}</main>
    <footer className={styles.footer}>
      <p>Kivilo · NotTooSweetLabs Pte. Ltd.<br />Made in Singapore. For a better handover.</p>
      <nav aria-label="Footer navigation"><Link href="/product">Product facts</Link><Link href="/compare">Comparisons</Link><Link href="/guides">Guides</Link><a href="https://my.kivilo.app/support">Support</a><a href="https://my.kivilo.app/privacy">Privacy</a></nav>
    </footer>
  </div>
}
