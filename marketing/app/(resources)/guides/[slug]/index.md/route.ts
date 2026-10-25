import { guides } from '../../../../../content/guides'
import { articleMarkdown } from '../../../../../lib/article-markdown'

export const dynamic = 'force-static'
export const dynamicParams = false
export function generateStaticParams() {
  return guides.map(article => ({ slug: article.slug }))
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = guides.find(article => article.slug === slug)
  if (!article) return new Response('Not found', { status: 404 })
  return new Response(articleMarkdown(article, `/guides/${slug}`), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } })
}
