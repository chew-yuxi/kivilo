# Kivilo work tracker

Updated 24 October 2026 Singapore time. Tenancy details are now always viewable and the
Property page groups Continue check-in/check-out, Tenancy details and Documents in one
action card (`c6792bd`). Editable details require confirmation; sent/signed values remain
read-only because they are part of the signature fingerprint. Android25 patch **24** /
`745798` and iOS24 patch **25** / `745805` are stable and read back. The patch source
excluded the concurrent native camera dependencies. Flutter analysis, 395 full tests and
11 isolated focused tests passed; physical-device delivery remains **NOT RUN**. The
production tenancy-details API remains live from `dpl_CmXiGr3PHutUqJWn1TJ3247pVjS6`.
The camera-enabled internal builds now have the same UI: Android26 patch **1** / `745843`
and iOS TestFlight25 patch **25** / `745855`, both stable and read back. No store binary
or track changed. Details and rollback are in `mobile/RELEASE.md`.

## Account acquisition and payment attribution — 26 October

The implementation connects a finite, 30-day marketing first-touch cookie to verified
Supabase signup, the responsible agent's first countersigned report, and the payer's
first positive live Stripe payment. `/admin` shows a separate 30-day signup cohort by
source, medium, landing page and registered campaign. Existing accounts are not
backfilled; admins, reviewer accounts and configured QA addresses are excluded.
Account deletion removes acquisition records. Privacy wording and the weekly review
runbook describe these limits; the scheduled review now reads this cohort when an
authorized admin session is available.

The isolated release excludes the unfinished Home/context-switcher changes. Unit
tests (198), Postgres integration tests (319), strict ESLint, typecheck, app production
build and marketing export passed. Chromium/WebKit checks verified first-touch
capture and cross-domain availability. All 25 E2E cases passed across the full run
and a focused rerun of two corrected tests, including real sandbox Checkout and the
new OTP acquisition case. The corrections update the current login heading and
avoid a redundant page reload that allowed a click before hydration; authorization
and checkout assertions remain intact. All 25 collector/IndexNow tests also passed.

Production rollout is pending. The additive acquisition migration
must precede the app release, which must precede the marketing cookie release.
Production checkout remains closed: the operator confirmed the Singapore live Stripe
account is not activated. The sandbox payment was verified without counting it as a
live conversion. [Billing readiness](billing.md#live-readiness-checked-2026-10-26)
records the remaining lifecycle/risk handling, live account/catalog/webhook setup,
restricted credentials and tax decisions. No real payment was taken.

## Search and AI visibility tracking — 26 October

The previous session's final request, “lets track properly pls”, now has a dated
[baseline](seo-geo-baseline-20261026.md), [measurement runbook](../docs/seo-tracking.md),
12-query panel and read-only `pnpm marketing:visibility` collector. Private JSON/Markdown
history lives under the shared git directory's `kivilo-seo/visibility`; imported
observations keep their real timestamps and unknown values remain unknown.

All 12 live sitemap URLs were inspected in Google: **2 indexed** (home and `/compare`),
**9 discovered but not indexed**, **1 unknown** (handover-checklist guide). Aggregate
Google and Bing search reports are still processing. Bing's existing sitemap is now
**Success** with 12 discovered URLs; its scan completed with 0 errors and one homepage
image-alt warning, manually triaged in the baseline. Cloudflare recorded 48 visits
for 19–25 October GMT+7, all direct, with partial instrumentation coverage; this is
not evidence of search acquisition. This baseline predates the acquisition release;
its unknown signup/first-report values remain historical unknowns.

Paseo schedule `9c0d5402` is active for Wednesdays at **09:00 Asia/Singapore**, first
run **28 October**. It reads available dashboards, preserves private evidence and
reports changes; public checks continue if authentication is unavailable. The local
daemon must be running. The consumer answer panel is planned, not yet collected.
Focused Node tests, strict ESLint and live public collection passed. No deployment
or repeat URL submission was made. The distribution section below preserves the
earlier submission-time states.

## Search engine distribution — 26 October

Bing Webmaster Tools ownership of `https://kivilo.app/` is verified using
`marketing/public/BingSiteAuth.xml`. The submitted sitemap shows **Processing**;
this is a submission receipt, not an indexed-page count. New-property reporting
may take up to 48 hours. No paid advertising or additional account subscriptions
were enabled. A 12-page sitemap-scoped Bing Site Scan is queued with email updates
disabled. Initial submission receipts are in `marketing/search-submissions-2026-10-26.json`.

Cloudflare version `14c84072-bb29-41e2-9ac3-845144bf7d69` adds only the Bing XML
and IndexNow TXT verification assets to the reviewed static export. A file-by-file
comparison confirmed all 132 existing files unchanged. Both new public files and
all 13 reference/discovery files passed independent HTTP 200/exact-byte checks.
Representative crawler access probes also passed; these are not real bot visits.

`pnpm marketing:indexnow` previews changed public URLs; `--submit` sends them to
the shared IndexNow endpoint. The first 12-page batch received HTTP **202** at
2026-10-25 17:27 UTC (26 October Singapore time), meaning key validation pending.
A follow-up dry run found zero new changes and preserved that status. State and
receipts are in the shared git directory under `kivilo-seo/indexnow-state.json`.
The script validates the live key, sitemap, canonical/indexable HTML and allowed
public paths; it detects content changes on undated hubs, confirms deletions,
and saves accepted batches atomically so failures do not repeat earlier batches.
All 11 focused Node tests and strict ESLint passed, plus independent code review.
No application/backend code or page rendering changed; prior build/UI checks apply.

IndexNow shares submissions across Bing, Yandex, Naver, Seznam, Yep, Amazonbot
and Internet Archive. Yahoo directs submissions to Bing, and DuckDuckGo sources
much of its traditional links from Bing. Brave's official refetch form acknowledged
`/`, `/compare` and `/product` as **Submitted**. These acknowledgments do not promise
crawling, ranking or AI citations. Release commands, verified scope and official
references are recorded in `marketing/README.md`.

## Public search content and LLM reference — 25 October

Published to `https://kivilo.app`, Cloudflare Worker version
`dc3af825-b675-477b-8214-3b65356207f0`: `/compare` contains six source-backed
comparisons (Report and Run, InventoryBase, Inventory Hive, Chapps Rental Inspector,
SnapInspect and RentCheck). `/guides` contains two practical Singapore-agent guides;
`/product` documents current capabilities and limits. The homepage links into this
content. Twelve canonical HTML pages appear in the sitemap, with editorial dates,
publisher disclosure, vendor citations, Article/Breadcrumb structured data and related
reading. Independent claim checks found no unsupported competitor-feature absences.
The articles compare official documentation, not hands-on test results.

`/llms.txt` is generated from the same product facts and article lists, following the
llmstxt.org format. `/llms-full.txt` contains the complete public reference, and all
nine articles export matching `/index.md` files. The five-property allowance uses the
existing shared app constant. HTML and HTTP links expose the directory and Markdown
alternates. Markdown duplicates are `noindex`; customer report indexing is unchanged.
Maintenance instructions are in `marketing/README.md`.

Verification used an isolated checkout on Node 24.22.1: marketing production export,
app typecheck, strict full ESLint, app production build and all 133 unit tests passed.
The final expanded marketing build and focused ESLint passed again. Local and production
browser checks covered all 12 pages at 320/390/768/1440px, with no page overflow or
runtime errors. Production checks resolved 96 internal links and 17 first-party assets;
HTML/Markdown parity, metadata, LLM format, Content-Type/noindex headers, unknown-path
404s and navigation without JavaScript passed. The pre-existing Cloudflare analytics
beacon could not resolve from the CLI environment; first-party delivery was verified
separately. Database integration and signed-in E2E were not run for this static change.

Google Search Console ownership of `https://kivilo.app/` is verified using the public
HTML tag in the marketing layout. `/sitemap.xml` was submitted and reports **Success**,
last read 25 October, with **12 discovered pages**. Indexing was requested for `/compare`
and accepted into Google's priority crawl queue; discovered/requested is not indexed.
Live requests using Googlebot, OAI-SearchBot, Claude-SearchBot and PerplexityBot user
agents returned 200; these probes do not establish real bot visits or AI citations.
Keep the verification tag. No signup conversion event instrumentation was added.

The Cloudflare crawler exception was applied on 25 October after owner sign-in.
Configuration rule `846de885a54c498da61d97caad4d8b1b`, in ruleset
`838ed5cebaef4870854ac7862be59f7d`, sets only `bic: false` for GET/HEAD on
`kivilo.app`. A fresh API read confirmed the enabled rule and the unchanged zone-wide
Browser Integrity Check setting (`on`). Other hosts and request methods do not match
the exception. This resolves the configuration behind the default Python-urllib
403/1010 responses; the website deployment version is unchanged.
Independent production verification with the unmodified Python-urllib/3.14 user
agent passed: all 13 reference/discovery files returned 200 and matched the reviewed
export byte-for-byte, including expected Content-Type/describedby/Markdown noindex
headers. All 12 HTML pages returned 200 with matching H1, title, description,
canonical, robots, verification tag and JSON-LD. `HEAD /llms.txt` returned 200 with
the expected headers and no body. Dashboard and API both confirm the rule is active.

Store source copy now describes inspector-written inventories, with matching Apple
and Google JSON files in `mobile/store/submission/`. App Store Connect accepted the
corrected description, promotional text, keywords, subtitle and public/support/privacy
URLs. Version `1.0.0` remains `WAITING_FOR_REVIEW`, with its original 18 October review
submission retained. Google Play's contact website was published as `https://kivilo.app`;
its corrected short/full descriptions, privacy URL and account-deletion URL were sent
for review. Publishing overview shows all four under **Changes in review**, queued
while Google runs its quick checks; they are not yet publicly released. The deletion
update preserved all other Data safety declaration answers
and returned HTTP 204. No app binary
or release track was changed; the pre-existing Android27 rollout remains held.

## Public website and app domains — 24–25 October

The 25 October conversion revision replaces the repeated shared-record explanation
with a concrete repair journey, condenses the audience benefits, and adds a branded,
four-page PDF from the production renderer. Its property, identities and signatures
are fictional; the generator never queries customer data or issues a real report.
Google Play is linked from the closing CTA. The Apple icon says iPhone / Coming soon:
App Store Connect is WAITING_FOR_REVIEW and has no public external TestFlight link.
Store status was checked read-only; no builds, groups or releases changed.
The browser signup now welcomes new and returning users with the actual logo and
18px text, preserving OTP, email prefill and safe return destinations unchanged.
Marketing build/lint and browser checks at 320/390/768/1440px passed: 18px minimum,
no overflow or runtime errors, working annotation tools, PDF delivery, downloads,
FAQ and anchor navigation. The login passed mocked email/code/error browser checks
at all four widths without sending email. A clean snapshot of 94a2b1f plus only the
two login files passed app typecheck, full lint, production build and all 133 unit
tests; concurrent backend/mobile work was excluded. No database suite was required
for this presentation-only change. Source commit: `46ec288`. Vercel deployment
`dpl_Arq9CN1UeTxPgSrchzRbsxUXJbs3` reached READY with both app domains retained;
live 390/1440px checks passed for landing-to-signup navigation, 18px controls,
invitation email prefill and no runtime errors. The intervening `5e3ed8e` commit
changed native report rendering only; the isolated web checks remain applicable.
A concurrent favicon build changed the shared marketing output during verification;
the final release was rebuilt from `46ec288` in an isolated directory. Its HTML and
15 referenced script, style, artwork and PDF assets match production byte-for-byte,
including the correct five-property allowance. Responsive checks also passed against
the isolated export. Future marketing releases should use an isolated checkout when
other builds are active.

The illustrated website is an independent static Next.js export in `marketing/`,
published to Cloudflare Workers Static Assets at `https://kivilo.app`. Worker version:
`ee9a2d6a-eebb-406b-ad04-174b760b4446`. Build/deploy instructions: `marketing/README.md`.
The working app stays on Vercel at `https://my.kivilo.app`; its root opens Properties.
The previous app host and installed-client URLs remain supported. On 25 October,
production `KIVILO_APP_URL` moved to `https://my.kivilo.app` and `RESEND_FROM_EMAIL`
to `Kivilo <noreply@kivilo.app>`. The existing production Resend key can access the
verified, sending-enabled `kivilo.app` domain. Vercel redeployment
`dpl_5TREqvgPRSRaJnWY6doStUMsfXkd` is READY from the existing release `462fbf6`, with
both old and new app aliases retained. Supabase's Auth site and Send Email Hook now
use `my.kivilo.app`; the hook secret and previous redirect destinations are preserved.
No pending notification contains an absolute link or the old host, so queued invites
pick up the new origin at delivery without any data rewrite. The local deployment
environment reference was updated too. All 24 focused email, hook, handover and
notification-outbox unit tests passed. A signed unsupported-action request verified
the new hook endpoint without sending an email; both app hosts return HTTPS login.
The `my` CNAME and Vercel certificate are verified: HTTPS login works and the root
redirects to Properties. The app deployment for `ee73047` is ready.

The page includes the existing ink/pink illustrations, an accessible interactive
capture/write/agree example, tenancy history and check-out explanation, and FAQs.
The lead feature is immediate photo markup: visitors can try Circle, Freehand and
Arrow with mouse or touch on a labelled illustration, and view its untouched
original. The hero, product metadata and FAQs explain that workflow. Native logo
geometry, 12px controls and 16px cards match the app; CTAs use lighter sizing.
Canonical/social metadata, a branded favicon, structured product data, public sitemap
and a factual `llms.txt` accompany it. Private app pages inherit noindex. Marketing
links to the app for login, verification, account deletion, support and privacy.

Verification: app typecheck, strict lint, 129 unit tests and both production builds
passed. All 24 browser E2E cases passed across the full run and a serial rerun of seven
resource-contention failures. Integration: 272/276 passed; four unchanged
account-deletion cases were blocked by a pre-existing retained StoragePurge tombstone
created 23 October, due 22 November. It was not removed. The exported site passed
Cloudflare-local browser checks at 320/390/768/1440px, keyboard tabs, FAQ toggles,
redirects, static assets, 404 and metadata. Production domain/DNS checks are part of
launch verification; no native release or store metadata changes are included.
The photo-markup revision passed the marketing production build and targeted strict
lint, all four responsive sizes, mouse/touch drawing, original-photo comparison and
keyboard tool/tab navigation, with no browser errors.
Live HTML, JavaScript, CSS, photo and metadata assets match the tested export over
valid HTTPS. Signed-out app visits follow Properties to the login screen.

The hero uses static illustrated scenes around a centered sans-serif headline: recording
the home on the left and a happy handover on the right. Both scenes share one artwork
derived from Kivilo's existing illustrations. Mobile shows the inspection below the
copy and the happy handover at the closing CTA. The photo demo responds only to the
visitor's actions. The generation brief is in `marketing/design/tenancy-scenes.prompt.txt`.
The static redesign passed the marketing production build and strict lint, visual
reviews at 320/390/768/1024/1440/1920px, and mouse/touch drawing and keyboard-tab
checks at desktop and phone sizes. Visible images decode, there is no horizontal
overflow or automatic animation, and the browser reports no runtime errors. Its
1200×630 social preview uses the same static composition.

The readability revision uses the app's system font stack, an 18px minimum for
all page text and 20px body copy, with no decorative pre-titles. Demo controls and
comparison records reflow on narrow screens. The product section leads with speed,
thoroughness and convenience; "How Kivilo works" explains the shared record with a
new static illustration. Browser checks at all six widths and all three demo tabs
confirmed the 18px minimum, no visible text overflow and no runtime errors. Drawing,
original-photo toggling and keyboard tabs passed at 320/390/1024px. The social
preview uses the same sans-serif typography. Published on 24 October: live HTML and
16 CSS, JavaScript, illustration, photo and metadata assets match the reviewed export.
Production checks at 390/1440px confirm the 18px minimum across all three demo tabs,
no horizontal overflow or browser errors, working drawing/original-photo controls
and keyboard navigation. The app root reaches its HTTPS login page.

The cabinet plant is repaired in the hero and social preview; only its local area
changed in the panorama. The hero has one CTA, 56px high on desktop and 44px on
narrower screens. Section links scroll smoothly (instantly with reduced motion)
and clear the sticky white navigation, which gains a thin border after scrolling.
Marketing build and strict lint pass. Browser checks at all six widths confirm
no overflow or runtime errors, stable header height, correct anchor offsets and
border visibility; reduced-motion behavior and the photo demo pass. Live HTML and
11 script, style and artwork assets match the export, with production CTA and
sticky-navigation checks passing.

The product walkthrough now shows photo, inventory and signed report together,
without tabs or required clicks. Desktop has three columns; tablets pair captions
with each example; phones stack them. The same cropped, labelled example photo
and shared marks appear in all three stages. Original-photo viewing affects only
the first copy. Phone gestures scroll/zoom normally until a tool is chosen, and
drawing ends after one stroke. The redundant illustration, benefit strip and
per-tab CTAs are removed. Marketing build and strict lint pass; seven-width checks
(320/390/768/1024/1101/1440/1920) confirm 18px minimum type, no overflow, and visible
stages. Mouse/touch drawing, normal touch scrolling, keyboard tools, shared marks,
original comparison and rendering without JavaScript pass. Live HTML and ten
script/style/photo assets match the export; desktop and phone production checks pass.

The subsequent illustration revision replaces the three equal panels and synthetic
kitchen image with open alternating rows: a large inspection scene, a compact
inventory excerpt and the existing signing artwork. The same sideboard scuff and
marks continue through the examples, including check-out. The inspection artwork
was generated with built-in imagegen; its prompt is saved in
`marketing/design/workflow-capture.prompt.txt`. Tool hints identify the illustration,
and detail crops expand to retain marks drawn elsewhere in it. Marketing build and
strict lint pass. Seven-width browser checks (320–1920px) confirm 18px minimum text,
no overflow or runtime errors, three visible stages, shared marks, original-view
toggling, keyboard tools, ordinary touch scrolling, touch drawing and no-JavaScript
rendering. Desktop, tablet and phone screenshots were reviewed. Live HTML and eleven
script, style and illustration assets match the export; 390/1440px production checks
confirm shared marks, original viewing, no overflow and no runtime errors.
The signing example now uses two fictional handwritten SVG signatures instead of
"Signed" badges, with accessible names and aligned 18px role captions. Marketing
build, strict lint and 320/390/768/1440px visual/layout checks pass. Live HTML and nine
script/style assets match the export; both sample signatures render on the phone layout.
The hero now leads with "Give every tenancy an upgrade." Supporting copy explains
the digital tools agents use to keep landlords informed, tenants involved and the
details together from the first inspection to check-out. Open Graph/Twitter titles,
the meta description and social artwork match this broader tenancy positioning.
The marketing build, scoped strict lint and six-width (320–1920px) browser checks
pass: 18px minimum text, correct CTA sizing, no overflow or runtime errors. The
longer hero paragraph uses balanced line wrapping on phones.
The social preview now uses a 62px logo and 94px headline on the left, with no small
supporting paragraph. A tighter crop of the happy handover fills the right against
a soft blush organic shape. The existing artwork and system typography remain.
It was reviewed at actual chat widths of 600px and 360px as well as full size. Its reproducible
renderer is `marketing/design/render-social-preview.mjs`; Open Graph and Twitter
use a revised image URL. The 1200×630 image was visually reviewed, build and scoped
lint pass, and live HTML, both metadata tags and image bytes match the export.

The subsequent copy cleanup removes demo disclaimers and example/sample qualifiers
from visible copy, signatures' accessible names and annotation status messages.
The check-out header reads "CHECK-OUT ASSESSMENT" and the drawing hint is "Choose a
tool, then draw." Internal asset provenance remains documented. Marketing build,
strict lint and browser checks at 320/390/1440px pass: no remaining public demo
qualifiers, 18px minimum text, no overflow or runtime errors, and working annotation
tools and original-image toggling. The shorter assessment card was visually reviewed.
Live HTML and nine script/style assets match the checked export.

The 25 October mobile revision shortens the hero to "Better service. Less admin.
From move-in to move-out." and the allowance note to "5 properties free. No credit
card." Mobile artwork is 28px closer; the CTA sits about 100px higher on a 390px
phone. Marketing build, scoped lint and 320/390/768/1440px visual/browser checks
pass, retaining 18px minimum text and 20px body copy without overflow. Live HTML
and nine script/style assets match the reviewed export. The concurrent Pro-plan
allowance change was not included in this marketing revision.

## Tenancy agreements and supporting documents — 23 October

**Backend live and native patches stable**, on Yuxi's explicit shipping approval.
Existing photo flows, sharing and the other session's shipped Properties UX are retained.

- Agreement-first direct uploads are available to the tenant, landlord and full tenancy
  agents. Previous agreements and requested supporting documents remain secondary.
  Files stay private to that tenancy's authorized participants; historical inspection
  grants, billing teams and unassigned agency members confer no access.
- Every authorized property term offers Documents independently of running-term repair
  access. Tenant names and dates distinguish renewals. A specific upload request opens
  and focuses that request, including after web sign-in or the native PDF handoff.
- PDF text extraction is deterministic, **with no AI**. Agent or landlord confirmation
  records the source page, quote, contribution rule, exceptions and author. Only a confirmed
  first-amount rule sets the repair proposal default; other arrangements need a written
  explanation. Every repair still needs its own cost agreement. Scans/photos support manual
  entry, and a newer agreement flags previous terms without rewriting agreed repairs.
- Web IndexedDB and native capture queues preserve account/request ownership, retry offline
  uploads and recover Android picker interruption. PDF upload opens authenticated web UI;
  the app reviews clauses natively, with no new plugin. Agreement photos can start offline.
- Documents never block signing or enter public reports, hashes or PDFs. Notifications
  recheck access. Existing request, submission and confirmation mutations record scoped
  PropertyEvents in the same transaction; no archive/delete lifecycle was added.
- Retention protects submitted documents, keeps delayed cleanup for pending uploads and
  preserves shared files and clause authorship during account deletion.
- Both additive migrations are applied to production; all **36** migration checksums and
  actual schema constraints passed, with no pending/failed migration or existing record loss.
  Backend deployed before the patches; production read-only smoke passed and revoked its
  temporary synthetic session, with application records and emails unchanged.

Verification passed: typecheck, lint, clean production build, **129 unit**, **276 integration**,
**24 browser** scenarios (22 full-run passes and two targeted reruns), **379 mobile tests**
and clean Flutter analysis. Targeted browser reruns supplied the existing local Stripe
sandbox key and retried a sign-in navigation timing failure; no source fixes were needed.
Phone layouts were rendered and inspected. Exact deployment-traced PDF dependencies passed
text/page/suggested-cap and malformed-file tests on production's Node 24 runtime.
Both patches have byte-identical bundled assets and MaterialIcons; iOS strict deep code-sign
verification passed. Physical-device delivery/performance rehearsal remains **NOT RUN**.
Evidence: `build/release-20261023-documents/`; shipped source `74904b8`.

## Team-first workspaces — 22 October follow-up

Built on the team-management candidate below; **live** as recorded above. The
confirmed access rule remains assigned agents
only, with owners and managers overseeing all team properties.

- Home and Inspections offer team workspaces, Personal, and All my work. The first
  active team is the default unless the person has chosen a workspace. Team setup
  and invitations are reachable from the working screens.
- New check-ins inherit the workspace and allow an explicit Personal choice. No
  existing property is moved. Web team setup leads directly to a team portfolio and
  new check-in; mobile shares the choice between Home and Inspections.
- Inspection, tenancy and renewal filters narrow existing authorization. API calls
  without filters preserve installed-client behavior. Active team members get agent
  navigation before their first assignment; that role metadata grants no property
  access. Preferences and native offline copies are scoped to the account.
- This follow-up adds no migration, plugin, native asset or store metadata change.

Verification passed: clean production build, typecheck, zero-warning lint, **107
unit**, **237 integration**, **20 browser scenarios** (full run plus affected-test
reruns), and **354 mobile tests**, with clean Flutter analysis. A final 28-test mobile
run covers the last assignee-filter correction. The team-first browser flow also
passed against the clean production build, including a phone-width assertion for
the workspace selector; phone screenshots were visually inspected. The clean build
was necessary to discard stale generated CSS from the earlier local cache.
Evidence: `build/team-workspace-20261022/`. No production data, deployment, store
submission or stable patch was changed; device delivery remains **NOT RUN**.

## Team and property management candidate — 22 October

Implemented and verified on `feat/team-property-management`; **live** with the
follow-up above, superseding the photo handoff patches below as stable.

- Persistent operational teams have verified invitations, owner/manager/agent roles,
  assigned work, activity, handover and departure with reassignment. Existing personal
  work stays private until explicitly moved into a team. Billing `Team` is unchanged.
- Team membership and tenancy assignments use the same data-layer scope on web and
  mobile. Removing access suppresses scoped notifications and preserves saved evidence,
  authorship and unrelated personal work. Report agent identity is frozen at Send so
  a later handover cannot change signed content or its PDF cache hash.
- Property settings expose Archive and a Danger zone. Draft-only properties move to
  Recently deleted for 30 days; signed/shared reports, repairs and other protected
  history require archiving. Only a personal lead or agency manager responsible for
  every tenancy can manage the whole property. Expiry uses durable storage tombstones;
  the phone's queued media is never removed by these actions.
- Web and mobile actions have visible button boundaries, focus states and touch
  targets; navigation rows use clear affordances. Team and property controls are
  reachable from Account and the relevant working screens.
- Additive migrations: `20261022100000_agency_management_property_lifecycle`, then
  `20261022103000_frozen_report_agent`. Applied locally only. A local-only schema drift
  repair restored missing earlier collaboration objects without resetting data or
  rerunning the full-collaborator backfill. Verify actual production schema before any
  future migration rollout; migration history alone is insufficient.

Final verification passed: production build, typecheck, lint, **107 unit**, **229
integration**, **19 browser** and **345 mobile** tests, plus clean Flutter 3.47.2
analysis. Mobile includes 19 new management and access-recovery regressions.
Backend coverage includes
stale uploads, signing, report-link changes, offboarding and property lifecycle races.
The local database exactly matches the migration schema. The browser harness now
uses local Mailpit for both auth and transactional test email. Its final full run
passed after an explicit sign-out navigation wait fixed a test account-switch race;
earlier sleep-interrupted and failed runs do not replace that final result. Phone
viewport screenshots of Team and Property settings were visually inspected.
Logs and previews: `build/team-property-management-20261022/`. Physical-device
delivery and interaction checks remain **NOT RUN**. No store binary, native assets,
plugins, metadata, minimum-build floor or production configuration changed. Shorebird
build compatibility and publication are **NOT RUN** for this candidate.

## Current execution queue

| Work | Status | Completion evidence / next step |
| --- | --- | --- |
| Room-photo flicker during upload handoff | **Published stable** | Stable card identity and decoded preview span the local-to-server handoff; refreshes coalesce, pending/saved rows deduplicate in order, marks remain aligned. Queue cleanup unchanged. Clean analysis and 326 mobile tests, including 15 new regressions. |
| Inventory-first room capture and immediate markup | **Published stable** | Included in `298f3b3`. Photos carry their item and completed marks through the durable queue. |
| Guided Home, navigation and onboarding artwork | **Published stable** | Hosted artwork remains live. Camera/library and expanding lesson controls use the installed icon font; all ten bundled assets match the release bytes. |
| Remove duplicate drawer handles | **Published stable** | Main `d32bc42` is included; add/edit inventory drawers retain one outer handle. |
| Photos and markup inside Add finding | **Backend live; native stable** | Resumable personal drafts, retry-safe uploads and immutable app/web/PDF evidence. Revoked collaborators' unfinished drafts remain preserved and excluded without blocking publication; restored access makes them block again. |
| Private tenancies and selected collaboration | **Backend live; native stable** | Lead-only access management; removal preserves work, renewal sharing is opt-in, billing teams grant no access. Existing narrow inspection grants remain narrow. |
| Combined regression checks | **Passed** | Documents integration: typecheck/lint/build; 129 unit, 276 integration, 24 browser and 379 mobile tests; exact-trace PDF runtime on Node 24 and rendered phone layouts checked. |
| Coordinated backend release | **Live and smoke verified** | Documents source `74904b8`, deployment `dpl_4b5jjqtjD4pkPLq8DYX9bxhLrWos` in `sin1`; both additive migrations applied first. Private document access/storage and installed-client compatibility smoke passed. |
| Android `1.0.0+25` / iOS `1.0.0+24` patches | **Stable** | Documents release `74904b8`: Android patch **14**, ID `743531`; iOS patch **15**, ID `743545`. Read back active/latest at 17:52 Singapore time; see `mobile/RELEASE.md`. |
| Cache-first loading and plain next-step cards | **Owned by concurrent Properties session** | Its `888fe5a` and unfinished cache-loading changes were deliberately excluded; that session rebases onto the Documents release before its next push/patch. |
| Physical delivery and full-flow rehearsal | **NOT RUN — needs devices** | [rehearsal-checklist.md](rehearsal-checklist.md); record exact patch/device, offline capture, interrupted markup, account isolation, sharing and push. Automated tests do not complete this. |
| Tenancy agreement, maintenance clause and supporting documents | **Backend live; native stable** | Agreement-first private upload, deterministic PDF extraction, person-confirmed terms and repair context. Per-term Documents access and request-specific navigation included. No signing block or public-report inclusion. |
| Exposed production database credential | **Needs coordinated rotation** | Prior demo session recorded accidental exposure in a tool log. Rotate with all dependent connection settings updated and verified together; do not copy the credential into this tracker or rotate one consumer alone. |
| Apple approval | **Waiting for Apple** | App Store Connect read on 23 October Singapore time: `WAITING_FOR_REVIEW` for 1.0.0. Store-build/submission/metadata freeze remains in force. |
| Historical iOS reviewer push failures | **Needs project access/device evidence** | Four old failures on two reviewer installations; successful iOS pushes existed in the same batch. Cached Firebase account lacks Kivilo access. No universal APNs outage established; do not rotate a working key on this evidence. |

## Release facts and recovery

Verified on 22 October 2026 Singapore time:

- Production custom domain: Vercel `dpl_J6uMEDrb141uZTrcaNKiLeuq9hNR`, Ready in
  `sin1`, exact source `f633d7f04f4d5938f7b9e47d0094381dc69881e1`. The photo-handoff
  fix changes only mobile Dart and its tests; the deployed backend is unchanged.
- `20261021090000_finding_photos`, then `20261021130000_tenancy_collaborators`,
  applied before backend push. No pending/failed migrations, no missing access grants,
  and all ten existing notification scopes correct. Existing data needed zero team or
  historical-conductor grants across 24 tenancies and 30 inspections.
- Photo-handoff Android `1.0.0+25`: patch **5**, ID `739033`, **stable**, active and latest.
- Photo-handoff iOS `1.0.0+24`: patch **6**, ID `739038`, **stable**, active and latest.
  Both exact targets were read back at **08:18:15 Singapore time on 22 October**.
- Photo-handoff native/asset checks passed without overrides; bundled assets match
  the original releases. iOS strict code-sign verification passed. Its **74.2%** shared
  Dart code produced the familiar possible slower-execution warning; physical-device
  performance remains **NOT RUN**.
- Earlier consolidated patches Android **4**, ID `738237`, and iOS **5**, ID `738246`, were read back
  stable at **01:21:53 Singapore time on 22 October**; these are the fallback pair.
- Consolidated builds passed native/asset compatibility without overrides. All ten bundled
  assets match the original releases; a real camera/library and accessible lesson
  control fix preserves the original icon font. No plugins, native configuration,
  version, store submission or minimum-build floor changed.
- Consolidated iOS strict code-sign verification passed. Shorebird reported **73.7%** shared Dart
  code and the same possible slower-execution warning seen on earlier patches; no
  compatibility check was overridden. Physical-device performance is **NOT RUN**.
- Authenticated production smoke passed on consolidated source `298f3b3`: scoped identity,
  inspection/access/draft reads, signed private photos and identical forbidden/missing
  404s. No application/outbox rows or emails were created. The post-backend health
  check found no new ErrorEvents or failed report emails; older exhausted notification
  and push failures remain a separate issue.
- Stable publication after automated checks was authorized on 21 October, with
  physical-device delivery and interaction explicitly **NOT RUN**.

Rollback baselines for the photo-handoff fix are Android25 patch **4** (ID `738237`)
and iOS24 patch **5** (ID `738246`). Roll back only the new patch if needed, keeping queued media.
Keep the additive migrations. Backend recovery must preserve explicit-grant access:
reverting to the old team-based authorization could restore revoked access.

Evidence: `build/release-20261021/verification.json`, `production-db-after.json`,
`vercel-final-source.json`, `production-smoke-final-source.json`, `stable-release.json`,
PDF QA and each platform's `final/` patch logs, asset comparisons and stable receipt.
Photo-handoff evidence is under `build/release-20261022-photo-handoff/`, including
326-test/analysis logs, `vercel-source.json` and `stable-release.json`. Apple's 08:13 Singapore
read still shows `WAITING_FOR_REVIEW` with build24 `VALID`; the store freeze remains in force.

## Completed or superseded sessions

| Session/request | Disposition |
| --- | --- |
| Jacwong demo portfolio | Already seeded and verified: five properties, seven inspections, 21 photos, 11 marked; two PDF verifications. Evidence in `build/demo-jacwong-20261021/`. The untracked seed script is not an instruction to seed again. |
| Shelvin / Jacqueline / Nimin TestFlight and accounts | Completed; no repeat invitations or account creation. |
| Earlier eleven product/release decisions | Completed and superseded by current releases: furnishing/templates, required fields, renewal reminders, upload progress, review hierarchy, sharing, analytics and plan limits. Demo tunnels already stopped. |
| Rich check-out finding chooser | Live since `4e5fe87`, Android25 patch3 / iOS24 patch4. New finding capture extends it. |
| Deposit statements, report verification and competitive UX fixes | Implemented and shipped; deposit statement also exists in the app. Do not reimplement stale plan items. |
| Tenant handover, move-in notices and native analytics | Shipped from `18bb3f1`; distinct from the deferred larger tenant-home redesign. |
| Check-in references, report PDF/branding, emailed signing, addenda, iPad fixes | Existing feature branches have no unique unmerged commits. Preserve their implementation and tests. |
| Previous session cleanup | Completed sessions can reappear due to Paseo archival persistence. Being visible/idle does not mean unfinished. No sessions deleted or archived during this consolidation. |

## Deliberately outside the current implementation

- Stripe live billing: user explicitly deferred activation. Existing email-us fallback
  remains until business live configuration is supplied and activation is requested.
- Broader tenant-home design, Singapore servicing/CEA features, universal email-to-app
  links, 360 capture and AI-era schema cleanup require separate product work.
- Dictation and serial copying use the phone keyboard/OS tools; the product has no AI.
- [ImgBot PR #1](https://github.com/chew-yuxi/kivilo/pull/1) changes native assets/store
  screenshots; leave it for an authorized store release after the freeze.

## Audit and verification evidence

The Mac audit checked 412 matching local Codex records (18 independent top-level
conversations, plus subagents/reviews), matching Paseo histories, all worktrees and
feature branches, current source and release records. Only tenancy collaboration
contained a separate unmerged feature; finding photos were the interrupted dirty work.
The clean `finding-photo-build` checkout held no additional implementation.

The cloud session is Codex `01a15d33-adb4-71b1-8605-96a353359adb` / Paseo
`ab716db0-e680-40d3-9a53-b1907c425631`; its history is not available on this Mac, so its
pushed tracker/release notes supply that part of the evidence. Its 276-test native
verification remains historical evidence; the combined release passed the newer
verification recorded above.

Local audit reports: `/tmp/kivilo-session-audit.md` and
`/tmp/kivilo-release-preflight.md`. Do not place credentials, live report tokens or
production connection strings in any evidence or tracker.
