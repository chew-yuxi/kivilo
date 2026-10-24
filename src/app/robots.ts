import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    // Private pages remain crawlable so their noindex tags can be read. Access is
    // enforced by the data layer; robots.txt is not an authorization boundary.
    sitemap: 'https://my.kivilo.app/sitemap.xml',
  }
}
