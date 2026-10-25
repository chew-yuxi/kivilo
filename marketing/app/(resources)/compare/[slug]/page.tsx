import { notFound } from 'next/navigation'
import { comparisons } from '../../../../content/comparisons'
import { articleMetadata, ResourcePage } from '../../../../components/resource-page'

export const dynamicParams = false
export function generateStaticParams() {
  return comparisons.map(article => ({ slug: article.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = comparisons.find(article => article.slug === slug)
  if (!article) notFound()
  return articleMetadata(article, `/compare/${slug}`)
}

export default async function ComparisonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = comparisons.find(article => article.slug === slug)
  if (!article) notFound()
  return <ResourcePage article={article} path={`/compare/${slug}`} collection={{ name: 'Compare', path: '/compare' }} />
}
