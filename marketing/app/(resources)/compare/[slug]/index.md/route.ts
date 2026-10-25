import { comparisons } from '../../../../../content/comparisons'
import { articleMarkdown } from '../../../../../lib/article-markdown'

export const dynamic = 'force-static'
export const dynamicParams = false
export function generateStaticParams() {
  return comparisons.map(article => ({ slug: article.slug }))
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = comparisons.find(article => article.slug === slug)
  if (!article) return new Response('Not found', { status: 404 })
  return new Response(articleMarkdown(article, `/compare/${slug}`), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } })
}
