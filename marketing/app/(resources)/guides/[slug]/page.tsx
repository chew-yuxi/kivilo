import { notFound } from 'next/navigation'
import { guides } from '../../../../content/guides'
import { articleMetadata, ResourcePage } from '../../../../components/resource-page'

export const dynamicParams = false
export function generateStaticParams() {
  return guides.map(article => ({ slug: article.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = guides.find(article => article.slug === slug)
  if (!article) notFound()
  return articleMetadata(article, `/guides/${slug}`)
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = guides.find(article => article.slug === slug)
  if (!article) notFound()
  return <ResourcePage article={article} path={`/guides/${slug}`} collection={{ name: 'Guides', path: '/guides' }} />
}
