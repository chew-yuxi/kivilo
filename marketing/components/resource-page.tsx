import Link from 'next/link'
import type { Metadata } from 'next'
import type { ResourceArticle } from '../content/types'
import { FREE_ACTIVE_PROPERTIES } from '../../src/lib/plan-limits'
import styles from '../app/(resources)/resources.module.css'

export function articleMetadata(article: ResourceArticle, path: string): Metadata {
  const title = `${article.title} | Kivilo`
  return {
    title,
    description: article.description,
    alternates: { canonical: path, types: { 'text/markdown': `${path}/index.md` } },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'article', title, description: article.description, url: path,
      siteName: 'Kivilo', locale: 'en_SG',
      publishedTime: article.published, modifiedTime: article.updated,
      images: [{ url: '/opengraph-image.png?v=20261024-upgrade', width: 1200, height: 630, alt: 'Kivilo — Give every tenancy an upgrade.' }],
    },
    twitter: { card: 'summary_large_image', title, description: article.description, images: ['/opengraph-image.png?v=20261024-upgrade'] },
  }
}

export function ResourcePage({ article, path, collection }: {
  article: ResourceArticle
  path: string
  collection?: { name: string; path: string }
}) {
  const url = `https://kivilo.app${path}`
  const crumbs = [{ name: 'Home', path: '/' }, ...(collection ? [collection] : []), { name: article.title, path }]
  const formattedDate = new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Singapore' }).format(new Date(article.updated))
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article', '@id': `${url}#article`, headline: article.title,
        description: article.description, datePublished: article.published, dateModified: article.updated,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url }, inLanguage: 'en-SG',
        author: { '@type': 'Organization', name: 'Kivilo', url: 'https://kivilo.app/product' },
        publisher: { '@type': 'Organization', '@id': 'https://kivilo.app/#organization', name: 'Kivilo', url: 'https://kivilo.app', logo: { '@type': 'ImageObject', url: 'https://kivilo.app/icon-512.png' } },
        image: 'https://kivilo.app/opengraph-image.png?v=20261024-upgrade',
      },
      { '@type': 'BreadcrumbList', itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, name: crumb.name, item: `https://kivilo.app${crumb.path}` })) },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
      <article className={styles.article}>
        <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
          <Link href="/">Home</Link><span aria-hidden="true">/</span>
          {collection && <><Link href={collection.path}>{collection.name}</Link><span aria-hidden="true">/</span></>}
          <span aria-current="page">{article.comparison ? article.comparison.competitor : 'Product guide'}</span>
        </nav>
        <header className={styles.articleHeader}>
          <h1>{article.title}</h1>
          <p className={styles.byline}>By <Link href="/product">Kivilo</Link> · Updated <time dateTime={article.updated}>{formattedDate}</time></p>
          <div className={styles.answer}>
            <p>{article.summary}</p>
            {article.summarySources && <p className={styles.sources}>Sources: {article.summarySources.map((source, index) => <span key={source.url}>{index > 0 && ' · '}<a href={source.url}>{source.label}</a></span>)}</p>}
          </div>
          {article.comparison && <p className={styles.disclosure}>Published by Kivilo. Competitor information checked against the linked vendor documentation on {formattedDate}. This is a comparison of documented workflows, not an independent hands-on review. Features and plans can change.</p>}
          {article.introduction.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        </header>
        <nav className={styles.contents} aria-label="On this page">
          <strong>On this page</strong>
          <ul>
            {article.comparison && <li><a href="#comparison">At a glance</a></li>}
            {article.sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}
            {article.questions.length > 0 && <li><a href="#questions">Questions and answers</a></li>}
          </ul>
        </nav>
        {article.comparison && <section id="comparison" className={styles.section}>
          <h2>At a glance</h2>
          <p className={styles.tableHint}>Compare the workflow you need. On a narrow screen, scroll the table sideways.</p>
          <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={`Kivilo and ${article.comparison.competitor} comparison`}>
            <table className={styles.table}>
              <caption>Kivilo and {article.comparison.competitor}: documented workflows</caption>
              <thead><tr><th scope="col">What matters</th><th scope="col">Kivilo</th><th scope="col">{article.comparison.competitor}</th></tr></thead>
              <tbody>{article.comparison.rows.map(row => <tr key={row.topic}>
                <th scope="row">{row.topic}</th><td>{row.kivilo}</td><td>{row.competitor}<a className={styles.rowSource} href={row.source.url}>{row.source.label}</a></td>
              </tr>)}</tbody>
            </table>
          </div>
          <p className={styles.sources}>Kivilo details: <Link href="/product">product facts and limitations</Link>. Vendor descriptions are cited in each row; an unlisted feature is not evidence that it is unavailable.</p>
        </section>}
        {article.sections.map(section => <section id={section.id} key={section.id} className={styles.section}>
          <h2>{section.title}</h2>
          {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          {section.bullets && <ul>{section.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}</ul>}
          {section.sources && <p className={styles.sources}>Sources: {section.sources.map((source, index) => <span key={source.url}>{index > 0 && ' · '}<a href={source.url}>{source.label}</a></span>)}</p>}
        </section>)}
        {article.questions.length > 0 && <section id="questions" className={styles.section}>
          <h2>Questions and answers</h2>
          {article.questions.map(question => <div key={question.question} className={styles.question}><h3>{question.question}</h3><p>{question.answer}</p></div>)}
        </section>}
        <aside className={styles.related} aria-label="Related reading">
          <h2>Keep exploring</h2>
          <ul>{article.related.map(link => <li key={link.href}><Link href={link.href}>{link.label}</Link></li>)}</ul>
          <a className={styles.markdownLink} href={`${path}/index.md`}>Read this page as Markdown</a>
        </aside>
        <div className={styles.cta}>
          <h2>Try your next handover in Kivilo.</h2>
          <p>{FREE_ACTIVE_PROPERTIES} active properties free. No credit card required.</p>
          <a className={styles.button} href="https://my.kivilo.app/login">Start free in your browser</a>
        </div>
      </article>
    </>
  )
}
