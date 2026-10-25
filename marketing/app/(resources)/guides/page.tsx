import Link from 'next/link'
import type { Metadata } from 'next'
import { guides } from '../../../content/guides'
import styles from '../resources.module.css'

const title = 'Rental handover and inspection guides for Singapore agents | Kivilo'
const description = 'Practical rental handover checklists and inspection software guides for Singapore property agents. Prepare evidence, inventories and signatures for check-in and check-out.'
export const metadata: Metadata = {
  title, description, alternates: { canonical: '/guides' },
  openGraph: { title, description, type: 'website', url: '/guides', siteName: 'Kivilo', images: ['/opengraph-image.png?v=20261024-upgrade'] },
  twitter: { card: 'summary_large_image', title, description, images: ['/opengraph-image.png?v=20261024-upgrade'] },
}

export default function GuidesPage() {
  return <div className={styles.hub}>
    <h1>Better rental handovers start before the keys change hands.</h1>
    <p>Practical guides for Singapore agents and agencies: what to record at the property, how to make the evidence useful later, and what to test before choosing an inspection app.</p>
    <div className={styles.cards}>{guides.map(article => <article className={styles.card} key={article.slug}>
      <h2><Link href={`/guides/${article.slug}`}>{article.title}</Link></h2>
      <p>{article.description}</p>
      <Link href={`/guides/${article.slug}`}>Read the guide <span aria-hidden="true">→</span></Link>
    </article>)}</div>
    <p className={styles.hubNote}>Shortlisting software? Read our <Link href="/compare">inspection app comparisons</Link> or see the <a href="/reports/property-condition-report.pdf">Kivilo condition report format (PDF)</a>.</p>
  </div>
}
