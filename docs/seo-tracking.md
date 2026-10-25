# Kivilo search and AI discovery tracking

Updated 26 October 2026. Audience: Singapore rental property agents and agencies.
This is the operating runbook for the weekly measurement review. The schedule and
first dated observations are recorded separately; this document does not establish
that a scheduled run or authenticated dashboard read has occurred.

## Scope and starting evidence

The public marketing site is `https://kivilo.app/`. The live sitemap is the URL
inventory; on 26 October it contains these 12 canonical HTML pages:

| Group | Paths |
| --- | --- |
| Home and product | `/`, `/product` |
| Hubs | `/compare`, `/guides` |
| Comparisons | `/compare/kivilo-vs-report-and-run`, `/compare/kivilo-vs-inventorybase`, `/compare/kivilo-vs-inventory-hive`, `/compare/kivilo-vs-chapps-rental-inspector`, `/compare/kivilo-vs-snapinspect`, `/compare/kivilo-vs-rentcheck` |
| Guides | `/guides/rental-handover-checklist-singapore`, `/guides/rental-inspection-app-singapore` |

Inspect every page while the inventory is this small. Record an intentional URL
addition/removal when the sitemap changes; do not keep 12 as a permanent denominator.
Markdown alternates and LLM reference files are delivery checks, not extra indexed
HTML pages. Keep app, signing, report and storage URLs out of public search checks.

The [submission receipt](../marketing/search-submissions-2026-10-26.json) records
Bing verification, a processing sitemap, a queued Site Scan, IndexNow HTTP 202 for
12 URLs and three Brave acknowledgments. The [marketing runbook](../marketing/README.md)
also records Google's successful sitemap processing and 12 discovered pages.
These are dated setup facts. They are not current indexed-page, traffic or citation
counts. Re-read the dashboards before updating their status.

## Weekly report contents

Use a source-availability table first, followed by changes and actions. Each metric
needs its observation time, source, exact period, timezone, filters and evidence.

| Source | Record | Interpretation and availability |
| --- | --- | --- |
| Public HTTP checks | Sitemap URLs, status, canonical, indexing directives; discovery-file delivery | Technical delivery observed now; does not prove an engine crawled or indexed a page |
| Google Search Console: indexing | Indexed/not-indexed state, last crawl and selected canonical for each URL; sitemap processing | URL Inspection reports Google's stored version, not a live indexing test |
| Google Search Console: Search results | Clicks, impressions, CTR, average position; page and query rows; country/device splits | Keep all-country and Singapore views separate; preserve omitted/anonymized queries and table limits |
| Google Search Console: Generative AI | Impressions, pages, countries and devices if the report is visible | A missing report is unavailable/insufficient data, not zero; keep preliminary dates separate |
| Bing Webmaster Tools | Sitemap and scan status; indexed URLs/crawl errors; clicks, impressions, CTR, position, query/page rows and available country filters | New-property or delayed reports stay pending; record unsupported dimensions as unavailable |
| Bing AI Performance | Citations, cited pages, grounding queries and any available comparison breakdown | Covers Microsoft Copilot, Bing and the partner experiences named by Microsoft; never label it all-assistant visibility |
| Cloudflare Web Analytics | Visits, page views, paths, referring hosts, country/device; bot-exclusion setting | Preserve provider metric names; visits are not unique people or account signups |
| Cloudflare AI Crawl Control | Crawler/operator requests, public paths, response classes, observed period | Separate requests from human traffic; distinguish verified bot classification from spoofable user-agent matching |
| Fixed answer panel | Mention, recommendation, cited URLs, expected landing page, observed/unavailable coverage | A controlled sample of answers, not total assistant demand or a universal ranking |
| IndexNow ledger | Submission time, URL changes and receipt status | HTTP 200/202 acknowledges submission; neither proves indexing |
| Verified signup, first completed report and first live payment | `/admin` acquisition cohort after the acquisition release | Server milestones; source categories are browser observations. Preserve cohort dates and exclusions; never infer historical conversion from Stakeholder creation or unrelated inspection totals |

Google's [URL Inspection API](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect)
supports read-only authorization. [Search Analytics](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)
provides query/page/country/device dimensions, but returns top rows rather than a
guaranteed complete query inventory. Preserve chart totals independently from table
sums. Calculate aggregate CTR from clicks divided by impressions, and weight combined
positions by impressions; do not average percentages or page positions equally.

Google's [Generative AI report](https://support.google.com/webmasters/answer/16984139?hl=en)
covers AI Overviews and AI Mode impressions. It may be hidden when the property has
insufficient impressions. Export chart and page/country/device tables when present;
capture their filters and preliminary-data marker. Its dates use Pacific Time.
Page-table sums and property totals can differ. The report is a view of Search Web
data, so do not add its impressions to Web totals. Its export converts unavailable
`~`/`-` values to zero: inspect the dashboard before classifying an exported zero as
observed. Do not invent query, click or conversion fields absent from this report.

Microsoft documents the scope and meaning of its [AI Performance metrics](https://blogs.bing.com/search/2026/6/New-AI-Visibility-Insights-in-Bing-Webmaster-Tools-Intents-Topics-Citation-Share-Compare/).
Citation Share is an observational share for a grounding query, not traffic share.
Keep the dashboard's reported period and coverage. Use its visible export/manual
read when available; do not assume the ordinary Webmaster API exposes AI reports.

Cloudflare [defines visits separately from page views](https://developers.cloudflare.com/web-analytics/data-metrics/high-level-metrics/)
and provides [referrer, country, path and bot-exclusion dimensions](https://developers.cloudflare.com/web-analytics/data-metrics/dimensions/).
Record whether bots were excluded. The [AI Crawl Control API](https://developers.cloudflare.com/ai-crawl-control/reference/graphql-api/)
has plan-dependent fields: user-agent matching can be spoofed, verified detection
IDs require Bot Management, and its referral filters require a paid plan. Do not
confuse those edge filters with Web Analytics' separate referrer reporting. A denied
or unavailable analytics field stays unavailable; it is not a reason to buy a plan.

## Periods, lag and honest comparisons

The review happens on the Singapore calendar. Preserve each provider's calendar in
the data: Google performance dates are `America/Los_Angeles`; Cloudflare GraphQL
timestamps are captured with explicit offsets (use UTC windows); for Bing or a
dashboard export record the displayed timezone, or `unknown` until confirmed.
Do not silently relabel provider dates as Singapore dates.

For each source, choose the latest **complete, finalized** end date `E` and record
the source's freshness/lag. Use inclusive windows:

- Recent 7 days: `E − 6` through `E`; previous 7: `E − 13` through `E − 7`.
- Recent 28 days: `E − 27` through `E`; previous 28: `E − 55` through `E − 28`.

Exclude the current partial day. If the newest finalized day is unknown, use a
conservative three-day allowance as an explicitly stated reporting assumption,
then verify it against the dashboard. Do not treat that allowance as a provider SLA.
If a source supplies only weekly buckets, keep its native bucket boundaries and
label the comparison instead of prorating partial weeks. Current URL Inspection
and sitemap reads are point-in-time observations, not historical weekly coverage.

Compare like filters and sources: same country, search type, device, page set and
aggregation. An all-country total and Singapore total are separate views. New or
lost query rows mean newly visible/missing reported rows, not proven demand growth
or loss; suppressed and truncated data can change visibility. Where the prior value
is zero, show the absolute change and `percentage change not defined`.

Keep page groups (home/product, comparisons, guides) and brand/nonbrand/comparison
queries separate. No percentage conversion may combine search clicks, Cloudflare
visits, assistant citations and app accounts: these are different populations and
often different timezones. Missing referrers remain unknown/direct as the source
reports them, never inferred as search or AI traffic.

## Collecting a weekly snapshot

From the repository root:

```sh
node scripts/search-visibility.mjs
node scripts/search-visibility.mjs --observations /absolute/private/path/observations.json
```

The collector checks public delivery and reads local IndexNow receipts. It does
**not** sign into Google, Bing, Cloudflare or assistant dashboards. Supply their
observations only after an authorized manual read or separately configured read-only
API collection. `--output-dir PATH` selects another private output location.

By default, timestamped JSON/Markdown reports and `latest.json` live under
`<git-common-dir>/kivilo-seo/visibility`, shared by worktrees and outside source
control. Preserve the dated files. A later public-only run carries the original
observation time of imported metrics; its new report time does not make those data
fresh. Back up these private artifacts through the existing operator backup process.

The observation file contract is:

```json
{
  "version": 1,
  "observations": [
    {
      "id": "google-gen-ai-impressions-all-7d",
      "source": "google-search-console",
      "metric": "generative-ai-impressions",
      "status": "not-collected",
      "value": null,
      "unit": "impressions",
      "observedAt": "2026-10-26T09:00:00+08:00",
      "period": null,
      "sourceUrl": "https://search.google.com/search-console",
      "notes": "Schema example only; replace the timestamp and collect this report before recording a value."
    }
  ]
}
```

Use stable IDs for a metric/filter/window, such as `google-clicks-sg-7d`,
`google-clicks-sg-prior7d`, `bing-citations-all-28d` or
`cloudflare-chatgpt-referral-visits-7d`. Replace a rolling observation with the next
verified one under the same ID; history stays in dated snapshots. Include source
timezone and inclusive dates in `period`, for example
`{"start":"2026-10-17","end":"2026-10-23","timezone":"America/Los_Angeles"}`.
Use `null` only for a point-in-time result or a period not yet established. Notes
must disclose the latter and any sampling, partial coverage, filters or evidence path.

| Status | Value | When to use |
| --- | --- | --- |
| `observed` | Number or string, including a genuinely measured `0` | Dashboard/API supplied the value; source, period and evidence are recorded |
| `pending` | `null` | Source explicitly shows processing, a queued scan or reporting lag |
| `unavailable` | `null` | Access/report/dimension absent, unavailable marker, or not instrumented; state the reason |
| `not-collected` | `null` | The source has not been read; no conclusion about performance |

The collector retains the source observation time and reports age. Partial tables
must be described as partial in notes, with a separate unavailable full-total row
when needed. Never promote a table's subset into a site total. Save supporting CSVs,
JSON and screenshots in the private evidence directory and reference them in notes;
avoid embedding account identities, browser cookies, credentials or private URLs.

## Operator checklist

1. Read the last snapshot and release/submission ledger. Run the public collector;
   investigate any new failure before attributing a traffic change to content.
2. In the verified Google property `https://kivilo.app/`, read sitemap/indexing and
   inspect all current sitemap URLs. Export the two performance windows and their
   comparisons, query/page tables, and Singapore/all-country views. Open Generative
   AI and record what is actually available, including a missing-report state.
3. In the same Bing property, check sitemap, Site Scan, index/crawl and Search
   Performance. Read AI Performance separately. Preserve provider periods and
   exposed dimensions; do not resubmit URLs simply because metrics have not arrived.
4. In Cloudflare, select `kivilo.app`, record Web Analytics visits, page views,
   paths/referrers and country splits. Record AI Crawl Control separately. Keep
   operator test requests and self-declared bot probes out of claimed audience growth.
5. Run the fixed answer panel below when the relevant interfaces are accessible.
   Preserve incomplete coverage rather than replacing missing answers with ordinary
   search results or API generations.
6. Import the observations and review the resulting report. Summarize changed
   metrics, stale/missing sources, technical failures and at most three next actions
   with an owner and review date. Every completion claim links to its evidence.

For later API automation, Google's read-only Search Console scope can cover
performance and URL Inspection; Bing's [Webmaster API](https://learn.microsoft.com/en-us/bingwebmaster/)
provides site search/index reporting. Configure the exact property explicitly and
keep credentials outside the repo. Existing browser ownership does not establish
API credentials. Do not reuse another product's credential without confirming its
authorized property and scope. The weekly collector does not provision access or
mutate provider settings.

## Fixed query and answer panel

[seo-query-panel.json](../marketing/seo-query-panel.json) defines 12 English queries:
two brand, four nonbrand tasks and six competitor comparisons. It is an editorial
panel, not evidence of search volumes. For search reporting, examine reported query
and landing-page matches; log an absent query as `not present in returned rows`,
not zero searches. Expected landing pages are hypotheses for review, not a claim
that Kivilo ought to outrank a competitor.

For assistant observations, use the entry's exact `assistantPrompt` in a fresh
conversation on ChatGPT search, Perplexity and Google AI Mode when available.
Twelve prompts on three surfaces gives **36 planned observations**, not 36 completed
ones. Keep Gemini and Microsoft Copilot as separately labelled optional surfaces;
do not substitute them under another surface's name. Google AI Mode observations
are distinct from the site's aggregate Google Generative AI report.

- Record actual country, language, visible model/surface, search mode and session
  personalization conditions. `market: SG` in the panel is the target audience;
  it is not evidence that the browser is located in Singapore.
- Use the first answer once, with no leading mention of Kivilo except the two brand
  prompts, no follow-up and no regeneration. Change wording only in a new panel version.
- Save the visible answer and expanded source list with screenshot/share-link
  evidence. Record mention, recommendation, all Kivilo URLs cited, expected-page
  match, ordered competitor names and short factual-error notes.
- Count a citation only when the displayed source URL belongs to `kivilo.app`.
  A brand mention alone is not a citation. Mark incomplete source capture partial;
  an unrecovered source is unknown, not a confirmed miss.
- A sign-in wall, regional restriction, unavailable search or exhausted access is
  unavailable with a reason. An unattempted assignment stays not collected. These
  rows stay outside observed-answer denominators.
- Report category and surface coverage before mention/citation rates. Compare
  only matching panel version and collection conditions. Keep dated evidence;
  never manufacture missed historical observations.

## Acquisition boundary and follow-up

The original 26 October baseline predates acquisition instrumentation; its missing
values remain historical unknowns. The acquisition release adds `AccountAcquisition`
and a separate cohort in `/admin`. Confirm deployment and table availability before
reporting any counts. `Stakeholder.createdAt` still is not a signup: an agent can
enter a party's details long before that person signs in.

The marketing site keeps the earliest valid touch for 30 days in a first-party
cookie shared with `my.kivilo.app`. Only recognized source/medium values, exact
public landing paths and deliberately registered campaign codes are admitted.
No campaigns are registered initially; arbitrary `utm_campaign` values are discarded.
There is no click ID, visitor ID, search term, email, full referrer or free-text field.
Cookies blocked by the browser, native installs and the old app host stay unattributed.
These labels are client observations, not verified engine clicks. Account creation
never refreshes or overwrites an existing account's acquisition.

`resolveAgent` stores the verified Supabase email-confirmation date when a verified
Auth account first claims or creates its Stakeholder. Existing linked accounts are
not backfilled. A previously verified Auth account first mapped later keeps its real
old verification date, and a later marketing touch cannot claim that historical signup.
Missing or invalid verification timestamps do not create a guessed cohort entry.
The signup row and identity mapping commit together; client usage events cannot
submit signup, payment or completion milestones.

The report milestone is the first server-observed countersignature after signup,
credited to the frozen responsible agent, not either signing party. It does not
establish complete historical report coverage. The payment milestone requires a
successful, positive **live** Stripe invoice, re-read from Stripe and attributed to
the current subscription payer. It excludes off-Stripe amounts, trials, comps and
sandbox payments. It records historical payment, not active entitlement or net revenue
after refunds. Team members are not all counted as payers. Live Stripe account setup
is still required; [billing readiness](../plans/billing.md) records the blocker.

The admin cohort uses verification dates in the last 30 days and milestones observed
so far, with a consistent database snapshot. Its sources are segmented by medium,
landing, campaign and web/bearer entry. Admins, trusted store reviewers, reserved test
domains and exact `ACQUISITION_EXCLUDED_EMAILS` addresses are excluded. Set QA addresses
before creating test accounts; adding an exact address to that list also excludes it
from later admin reads. `excluded` retains the original exclusion decision.
Account-deletion fulfillment removes the cohort row even when shared records retain
the Stakeholder. The cookie expires after 30 days; linked milestone data lasts until
account deletion, as the privacy page describes.

Record the cohort boundary, observation time, included/excluded counts and source
coverage when importing metrics. Newer accounts have had less time to complete or pay;
do not mix these counts with Cloudflare visits or search impressions to invent a
conversion rate. A weekly measurement run does not authorize deploying changes,
buying tools, changing crawler settings or sending outreach.
