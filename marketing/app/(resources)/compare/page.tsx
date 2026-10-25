import Link from 'next/link'
import type { Metadata } from 'next'
import { comparisons } from '../../../content/comparisons'
import styles from '../resources.module.css'

const title = 'Compare rental inspection apps for Singapore agents | Kivilo'
const description = 'Compare rental inspection apps for Singapore agents and agencies. Explore documented workflows for inventories, photo reports, signatures and check-outs.'
export const metadata: Metadata = {
  title, description, alternates: { canonical: '/compare' },
  openGraph: { title, description, type: 'website', url: '/compare', siteName: 'Kivilo', images: ['/opengraph-image.png?v=20261024-upgrade'] },
  twitter: { card: 'summary_large_image', title, description, images: ['/opengraph-image.png?v=20261024-upgrade'] },
}

export default function ComparePage() {
  return <div className={styles.hub}>
    <h1>Choose the right app for your next rental handover.</h1>
    <p>Compare Kivilo with other inspection apps through the work Singapore agents actually do: photograph the unit, write the inventory, get agreement and keep a clear record through check-out.</p>
    <p>These comparisons are published by Kivilo. Each names the vendor sources, explains where the other product fits, and gives you a practical workflow to test.</p>
    <div className={styles.cards}>{comparisons.map(article => <article className={styles.card} key={article.slug}>
      <h2><Link href={`/compare/${article.slug}`}>{article.title}</Link></h2>
      <p>{article.description}</p>
      <Link href={`/compare/${article.slug}`}>Read the comparison <span aria-hidden="true">→</span></Link>
    </article>)}</div>
    <p className={styles.hubNote}>Still deciding what to compare? Start with our <Link href="/guides/rental-inspection-app-singapore">inspection app evaluation guide</Link>, or check <Link href="/product">Kivilo’s product facts and limitations</Link>.</p>
  </div>
}
