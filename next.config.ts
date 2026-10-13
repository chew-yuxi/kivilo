import type { NextConfig } from 'next'

/// Identifies the build so the service worker can name its cache after it and drop
/// caches from earlier builds. Vercel supplies the commit SHA; anything else falls
/// back to a timestamp, which is still unique per build.
const buildId =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? `local-${Date.now().toString(36)}`

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: buildId },

  // The poster cron runs the ffmpeg binary, which nothing require()s, so file tracing
  // would leave it out. Only that one function carries it. The path is pnpm's real
  // directory, which is also where Node resolves the package at runtime: Vercel rejects
  // a function whose files arrive through the node_modules/ffmpeg-static symlink.
  serverExternalPackages: ['ffmpeg-static', '@sparticuz/chromium', 'puppeteer-core'],
  outputFileTracingIncludes: {
    '/api/internal/posters': ['./node_modules/.pnpm/ffmpeg-static@*/node_modules/ffmpeg-static/ffmpeg'],
    // The PDF route unpacks Chromium from these brotli archives at runtime, which no
    // require() reveals to tracing. Same pnpm real-path rule as ffmpeg above.
    '/api/v1/inspections/[id]/pdf': ['./node_modules/.pnpm/@sparticuz+chromium@*/node_modules/@sparticuz/chromium/bin/**'],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // The app is only ever framed by itself; a condition report inside someone
          // else's iframe is a clickjacking target.
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            // Camera and microphone are the capture flow. Everything else is off.
            value: 'camera=(self), microphone=(self), geolocation=(), payment=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      {
        // A report URL is a bearer credential, so keep it out of search engines and
        // stop the token leaking to third parties through the Referer header.
        //
        // Cache-Control is deliberately not set here: the route is force-dynamic, and
        // Next emits its own `no-cache, must-revalidate` that overrides both this and
        // the proxy. That still forbids reuse without revalidating against the origin,
        // which is the property that matters, and the body is only ever readable by
        // someone already holding the token.
        source: '/reports/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
    ]
  },
}

export default nextConfig
