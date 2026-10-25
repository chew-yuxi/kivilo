# Kivilo public website

`kivilo.app` is a static website on Cloudflare Workers Static Assets. The signed-in
app is a separate Vercel deployment at `my.kivilo.app`. Its old address stays live
for installed native apps and existing emails. Production `KIVILO_APP_URL` is
`https://my.kivilo.app`, so new invitations, signing and handover links use that host.
Resend sends as `Kivilo <noreply@kivilo.app>`; Supabase's auth site and email hook also
use `my.kivilo.app`. Installed clients' API URLs remain supported.

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

The marking example uses `public/art/workflow-capture.webp`, an ink-and-pink
illustration made with built-in imagegen from Kivilo's existing character artwork.
The saved brief is `design/workflow-capture.prompt.txt`. It replaces the synthetic
kitchen photograph. Visitors
can mark the cabinet scuff locally; the same marks appear beside the inventory item
and in the signing example. Detail crops expand if someone draws elsewhere in the
scene, so their marks remain visible. Viewing the original affects only the first
illustration. Touch gestures scroll and zoom normally until a tool is selected;
drawing switches off again after one stroke. No customer property data is used.
The landlord and tenant signatures are two fictional SVG ink drawings, each with
an accessible role label and a visible role caption. Public copy presents the workflow
directly, without demo disclaimers or example/sample qualifiers.

The hero leads with "Give every tenancy an upgrade." and the short promise "Better
service. Less admin. From move-in to move-out." The free-plan note stays on one line
on phones, with the artwork close beneath it. The same headline appears in social
titles and the social image.

The static hero artwork is `public/art/tenancy-scenes.webp`: a property inspection
on the left and a happy handover on the right, with the headline and CTA in the clear
center. Both scenes were composed together from the existing Kivilo illustrations
using built-in imagegen; the exact brief is in `design/tenancy-scenes.prompt.txt`.
Mobile shows the inspection crop below the copy and the happy handover above the
closing CTA. There is no automatic animation; the photo demo responds to the
visitor's own tool choices and drawing.

The cabinet plant was repaired with built-in imagegen, then only its local area
was composited into the panorama; the remaining visible pixels and transparency
are unchanged. The edit brief is in `design/tenancy-plant-fix.prompt.txt`.

The header stays visible while scrolling and gains a subtle bottom border away
from the top. In-page links scroll smoothly with an offset for the header;
reduced-motion preferences use an instant jump. The hero has one primary CTA,
56px high above 900px and 44px on narrower screens.

Typography uses the web app's system sans-serif stack. All page text, including
demo labels, captions and footer links, is at least 18px; body copy is 20px.
Narrow layouts wrap or stack instead of reducing type. Section headings stand on
their own without decorative pre-titles. Keep these rules in future design edits.

The product section uses an open, alternating sequence: a dominant inspection
illustration, a compact inventory excerpt, then the existing signing illustration
and an example of the agreed item. All three steps are visible without tabs or
required interactions. Phones show the copy above each visual. The same sideboard
scuff continues into the check-out example. The following
"How Kivilo works" section explains the shared property record with
`public/art/shared-record.webp`, generated from the existing inventory illustration
using built-in imagegen. Its exact prompt is in `design/shared-record.prompt.txt`.

The Wrangler configuration pins the Cloudflare account and apex custom domain.
Cloudflare manages the landing page DNS and TLS. `my.kivilo.app` uses a DNS-only
CNAME to the target returned by Vercel. Login, verification, deletion, privacy and
support links go to that app origin; convenience redirects preserve those paths
on the marketing origin too.

Metadata lives with the marketing page: canonical URL, Open Graph/Twitter card,
Organization/WebSite/SoftwareApplication structured data, robots and sitemap.
`public/llms.txt` is a short factual product reference. Private app pages inherit
noindex; the app's public utility pages have their own `my.kivilo.app` canonicals.
The 1200×630 social image uses an oversized logo and left-aligned headline beside
a close crop of the happy handover, with a soft blush organic shape behind it.
There is no small supporting paragraph; review it at 600px and 360px wide so the
message remains readable in chat previews.
Regenerate it with
`node marketing/design/render-social-preview.mjs` from the repository root. It uses
the existing artwork and system font stack; no page server is required. Change the
`socialImage` version query in `app/page.tsx` when replacing it so social platforms
can fetch the revised asset.

For a Git-connected Cloudflare build, use repository root as the root directory,
`pnpm marketing:build` as the build command, and
`wrangler deploy --config marketing/wrangler.jsonc` as the deploy command.
Vercel continues to build the repository's main Next.js app as before.
