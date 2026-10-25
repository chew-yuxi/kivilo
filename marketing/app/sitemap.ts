import type { MetadataRoute } from 'next'
import { product } from '../content/product'
import { comparisons } from '../content/comparisons'
import { guides } from '../content/guides'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://kivilo.app/' },
    { url: 'https://kivilo.app/product', lastModified: product.updated },
    { url: 'https://kivilo.app/compare' },
    { url: 'https://kivilo.app/guides' },
    ...comparisons.map(article => ({ url: `https://kivilo.app/compare/${article.slug}`, lastModified: article.updated })),
    ...guides.map(article => ({ url: `https://kivilo.app/guides/${article.slug}`, lastModified: article.updated })),
  ]
}
