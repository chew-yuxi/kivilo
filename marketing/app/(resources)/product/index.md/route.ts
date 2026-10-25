import { product } from '../../../../content/product'
import { articleMarkdown } from '../../../../lib/article-markdown'

export const dynamic = 'force-static'

export function GET() {
  return new Response(articleMarkdown(product, '/product'), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } })
}
