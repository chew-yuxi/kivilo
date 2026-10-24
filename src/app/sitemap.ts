import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  // Only public, indexable pages. Never enumerate tenancy or report URLs.
  return ['/support', '/verify', '/privacy', '/delete-account'].map((path) => ({
    url: new URL(path, 'https://my.kivilo.app').href,
  }))
}
