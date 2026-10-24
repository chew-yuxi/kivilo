# Kivilo public website

`kivilo.app` is a static website on Cloudflare Workers Static Assets. The signed-in
app is a separate Vercel deployment at `my.kivilo.app`. Its old address stays live
for installed native apps and existing emails; this website does not change their
API URL or `KIVILO_APP_URL`.

Run from the repository root, using Node 24:

```sh
pnpm install --frozen-lockfile
pnpm marketing:dev
pnpm marketing:build
wrangler deploy --config marketing/wrangler.jsonc
```

The build exports HTML, CSS and browser JavaScript to `marketing/out`. It needs no
backend environment variables. `prepare-marketing.mjs` copies only the existing
public illustration and icon assets. The free-property allowance comes from the
same `src/lib/plan-limits.ts` constants the app enforces.

The photo-marking demo uses `public/demo/kitchen-detail.webp`, a synthetic sample
from the existing demo portfolio, with its demo label preserved. It contains no
customer property data. Visitors can try the annotation tools locally in the page;
those marks are demonstration state only.

The Wrangler configuration pins the Cloudflare account and apex custom domain.
Cloudflare manages the landing page DNS and TLS. `my.kivilo.app` uses a DNS-only
CNAME to the target returned by Vercel. Login, verification, deletion, privacy and
support links go to that app origin; convenience redirects preserve those paths
on the marketing origin too.

Metadata lives with the marketing page: canonical URL, Open Graph/Twitter card,
Organization/WebSite/SoftwareApplication structured data, robots and sitemap.
`public/llms.txt` is a short factual product reference. Private app pages inherit
noindex; the app's public utility pages have their own `my.kivilo.app` canonicals.

For a Git-connected Cloudflare build, use repository root as the root directory,
`pnpm marketing:build` as the build command, and
`wrangler deploy --config marketing/wrangler.jsonc` as the deploy command.
Vercel continues to build the repository's main Next.js app as before.
