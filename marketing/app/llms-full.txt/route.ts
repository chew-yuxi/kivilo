import { product } from '../../content/product'
import { comparisons } from '../../content/comparisons'
import { guides } from '../../content/guides'
import { articleMarkdown } from '../../lib/article-markdown'

export const dynamic = 'force-static'

export function GET() {
  const text = [
    '# Kivilo public reference\n\n> First-party product facts and guides published by Kivilo, operated by NotTooSweetLabs Pte. Ltd. in Singapore. Comparisons cite vendor documentation and are not independent reviews. Each article carries its own date and canonical URL.\n\nDirectory: https://kivilo.app/llms.txt\n',
    articleMarkdown(product, '/product'),
    ...comparisons.map(article => articleMarkdown(article, `/compare/${article.slug}`)),
    ...guides.map(article => articleMarkdown(article, `/guides/${article.slug}`)),
  ].join('\n---\n\n')
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
