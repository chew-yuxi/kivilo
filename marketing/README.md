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
pnpm marketing:indexnow
pnpm marketing:indexnow --submit
```

Build and deploy from an isolated checkout when other tasks are building in this
workspace: both `prepare-marketing.mjs` and Next overwrite generated marketing files.
Deploy the exact export that passed review.

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
scuff continues into the check-out example. The next section follows a repair from
reporting to the tenant's confirmation that it is fixed, with no additional clicks.
The three audience benefits are compact, with the roles named directly.

The signing step links to `public/reports/property-condition-report.pdf`, a four-page
report rendered by the production PDF component with wholly fictional details,
branding and signatures. It never reads customer data or registers a genuine report.
Regenerate the PDF and its page previews with
`node marketing/design/report-preview.mjs` (Node 24; Poppler `pdftoppm` required).
The generator validates the page count, footers, evidence and signatures.

The closing CTA distinguishes browser signup from app downloads. Google Play links
to package `one.kivilo.kivilo`; the iPhone icon says Coming soon. On 25 October the
App Store version was WAITING_FOR_REVIEW, with no public TestFlight group or link.
Replace the availability text with a verified App Store or public TestFlight link
only once it is usable. No store release or beta configuration changed here.

The Wrangler configuration pins the Cloudflare account and apex custom domain.
Cloudflare manages the landing page DNS and TLS. `my.kivilo.app` uses a DNS-only
CNAME to the target returned by Vercel. Login, verification, deletion, privacy and
support links go to that app origin; convenience redirects preserve those paths
on the marketing origin too.

Metadata lives with the marketing page: canonical URL, Open Graph/Twitter card,
Organization/WebSite/SoftwareApplication structured data, robots and sitemap.
`app/llms.txt/route.ts` exports a factual product reference and curated directory. Private app pages inherit
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

## Search and AI reference content

`/compare` and `/guides` contain the public comparison and practical handover articles.
`/product` is the first-party product reference, including platform availability and
workflow limits. All three use `content/` as their source. Comparisons cite official
vendor documentation and identify Kivilo as publisher; they are not independent tests.
Keep claims factual, acknowledge overlapping capabilities, and check the source before
updating a claim or its review date. Never infer an absent feature from absent documentation.

`content/comparisons.ts` covers Report and Run, InventoryBase, Inventory Hive, Chapps,
SnapInspect and RentCheck. Compare each product's documented workflow with the work a
Singapore rental agent or agency needs; do not treat a product's home market as a limit
on where it can be used. Name the relevant product or plan when a vendor sells several,
and distinguish an inspector's visit from a tenant-led inspection. Link claims to the
official page that supports them. Verify availability and current pricing directly
before making either part of a comparison.

The article pages export their full text as HTML, with canonical/social metadata,
Article and BreadcrumbList structured data, and visible dates. Their matching
`/index.md` URLs use the same content through `lib/article-markdown.ts`. Markdown
alternates are linked in HTML; Cloudflare serves them as `text/markdown` with `noindex`
so search listings use the canonical HTML pages. The sitemap lists the public HTML
pages and uses editorial dates rather than a fresh timestamp at every build.

`/llms.txt` is generated at build time from the same product facts and article lists.
Its format follows the [llms.txt proposal](https://llmstxt.org/): identity and concise
context, then grouped annotated links to Markdown sources. `/llms-full.txt` combines
the complete articles, canonical URLs and citations for clients that want one file.
There is no separate hand-maintained copy in `public/`. Both files contain only public
editorial content. A `describedby` HTML link and HTTP header point to the directory.

Update `content/product.ts` when capabilities, platforms or availability change;
the free-property count comes from the app's existing shared constant. Update article
dates only after a substantive edit or source recheck. Adding an article to its content
array adds its static page, Markdown export, hub link, sitemap entry and LLM directory
entry together. The comparison hub description describes the collection without a
separate vendor list to maintain. Keep related links and homepage entry points useful
to readers, and check that every related article slug exists after adding or renaming
an article. Do not duplicate generated references in static text files.

Check the production export: every sitemap URL resolves, every article has one H1 and
the correct canonical, JSON-LD parses, Markdown matches the visible content, and all
`llms.txt` links resolve. Review 320px and desktop layouts, including horizontal table
scrolling and navigation without JavaScript. Recheck `/llms.txt`, `/llms-full.txt`,
Markdown Content-Type headers, 404s and asset delivery on Cloudflare after deployment.

These references help readers and AI clients understand the product; they do not
guarantee indexing or AI citations. Google documents that normal SEO applies to its
[AI search features](https://developers.google.com/search/docs/appearance/ai-features).
Google Search Console ownership of the URL-prefix property `https://kivilo.app/` was
verified through the HTML tag on 25 October 2026. Keep that tag in `app/layout.tsx`.
The submitted `https://kivilo.app/sitemap.xml` reports Success with 12 discovered pages;
this confirms sitemap processing, not that all pages are indexed. The reviewed export
was published as Cloudflare version `dc3af825-b675-477b-8214-3b65356207f0`; the
later verification-file release is recorded below.
Monitor search impressions, landing-page visits and actual crawler access in Cloudflare.
Cloudflare injects its existing web analytics beacon; this change adds no app signup
event instrumentation, so signup attribution needs separate measurement.

### Cloudflare access for automated readers

Browser Integrity Check previously returned 403/1010 to the default Python-urllib
user agent. On 25 October 2026, configuration rule
`846de885a54c498da61d97caad4d8b1b` was enabled in ruleset
`838ed5cebaef4870854ac7862be59f7d` (`http_config_settings`). It matches only
`(http.host eq "kivilo.app" and http.request.method in {"GET" "HEAD"})`, uses
`set_config`, and sets only `bic: false`. A fresh API read confirmed this exact rule;
the zone-wide Browser Integrity Check setting remains on. The exception does not
match app hosts or other request methods. To roll it back, disable this rule.

Independent production checks with the unmodified Python-urllib/3.14 user agent
passed: all 13 reference/discovery files returned 200 and matched the reviewed
export byte-for-byte with the expected headers; all 12 HTML pages returned 200 and
matched their exported metadata and structured data. `HEAD /llms.txt` also returned
200 with the expected headers and no body.

After changes to Cloudflare rules, verify the public pages and both LLM files, nine
Markdown files, sitemap and robots with an ordinary HTTP client as well as a browser.
Requests should return 200 with the reviewed export's content and expected headers.

### Bing and other search engines

Bing Webmaster Tools ownership of `https://kivilo.app/` was verified through
`public/BingSiteAuth.xml` on 26 October 2026 Singapore time (25 October UTC).
Keep that file in future exports. The sitemap was submitted and initially showed
**Processing**, with no crawl results yet. Bing's new-property reports can take up
to 48 hours to populate. A sitemap-scoped Site Scan named `Kivilo public pages -
26 October 2026`, limited to 12 pages, was also queued with email updates disabled.
Yahoo directs website submissions through Bing; DuckDuckGo
sources much of its traditional web-link results from Bing too.

`marketing/indexnow.json` and its matching public TXT file establish IndexNow
ownership. They are public verification material, not an app credential. Run
`pnpm marketing:indexnow` after a successful deployment to preview changes, then
`pnpm marketing:indexnow --submit` to send them. The script reads the live key,
sitemap and canonical HTML first; it rejects private hosts, query strings,
non-HTML URLs, missing/noindex pages and unexpected redirects. Its explicit route
allowlist must be extended when introducing a new public marketing route family.

Content fingerprints include visible text, metadata, link/image destinations and
structured data, so changes to undated hubs are detected without resubmitting for
Next.js bundle churn. A removed URL requires a confirmed 404/410 before notification.
Only added, changed or removed pages are submitted, in bounded batches, to
`https://api.indexnow.org/indexnow`. Participating engines share those notifications;
do not send duplicate batches to every engine. The current registry includes Bing,
Yandex, Seznam, Naver, Yep, Amazonbot and the Internet Archive.

State and receipts live at `<git-common-dir>/kivilo-seo/indexnow-state.json`, shared
by worktrees and excluded from source control. `--state-file PATH` supports an
isolated operator checkout; preserve this file between releases. Accepted batches
are saved atomically. A refusal leaves that batch pending; the next run skips earlier
accepted batches. HTTP 200 acknowledges receipt, while 202 means receipt with key
validation pending. Neither establishes indexing. Historical 202 receipts remain
visible in dry-run output and need follow-up in the engine's tools, not repeated
blind submissions. `pnpm marketing:indexnow:test` exercises these boundaries.

The first live batch submitted all 12 canonical pages and received HTTP 202; a
follow-up dry run found no additional changes and retained the pending-validation
receipt. The two verification assets are live in Cloudflare version
`14c84072-bb29-41e2-9ac3-845144bf7d69`; all 132 pre-existing exported files are
unchanged from the reviewed release. Independent live checks confirmed both new
files and all 13 existing reference/discovery files match their source bytes.
The initial submission receipts are preserved in `search-submissions-2026-10-26.json`.

Brave's official refetch form acknowledged the homepage, `/compare` and `/product`
as **Submitted**. This is a refresh request, not an indexing confirmation. Applebot
and other public crawlers can read the existing robots, sitemap and public pages;
successful user-agent probes do not establish real bot visits. Follow actual crawl,
indexing, referral and AI citation reports in the relevant tools.

Official references: [IndexNow protocol](https://www.indexnow.org/documentation),
[participants](https://www.indexnow.org/searchengines.json),
[Yahoo submissions](https://help.yahoo.com/kb/SLN2217.html),
[DuckDuckGo sources](https://duckduckgo.com/duckduckgo-help-pages/results/sources),
[Brave refetch form](https://search.brave.com/submit-url), and
[Applebot](https://support.apple.com/en-us/119829).
