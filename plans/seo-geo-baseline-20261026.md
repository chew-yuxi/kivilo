# Kivilo search and AI visibility baseline

Observed 26 October 2026, approximately 02:13–02:20 Singapore time
(25 October 18:13–18:20 UTC). Audience: Singapore rental agents and agencies.

This continues the prior session's final request, “lets track properly pls”, after
the public search content and engine submissions were pushed in `eb2a732`.
The unfinished Home inbox/context-switcher changes belong to a separate task.

## Measured starting point

| Source | Observation | Meaning and limits |
| --- | --- | --- |
| Public delivery | 12/12 canonical HTML pages pass; sitemap, robots, both LLM files and all nine Markdown alternates pass | HTTP/canonical/directive checks, not evidence of crawler visits or rankings |
| Google sitemap | Success, 12 discovered URLs, last read 25 October | Discovery does not establish indexing |
| Google URL Inspection | **2 indexed, 9 discovered but not indexed, 1 unknown**, from all 12 live sitemap URLs | Homepage and `/compare` are indexed. The handover-checklist guide is unknown. The other nine are discovered, not indexed. This is a sitemap cohort, not a whole-domain index count |
| Google aggregate indexing and Search results | Processing | Clicks, impressions and aggregate indexed totals remain unknown |
| Google Generative AI | Report absent from this property's navigation | Unavailable, not zero impressions |
| Bing sitemap | Success, 12 discovered URLs, no sitemap errors or warnings | Updated from the earlier processing receipt |
| Bing Site Scan | Completed: 12 pages, 0 errors, 1 image-alt warning on homepage | Existing scan read only; warning triaged below |
| Bing Search Performance | “Please check back in 48 hours” | Clicks and impressions remain pending |
| Bing AI Performance | **0 citations**, 18–24 October, timezone not displayed | Observed on Microsoft Copilots and Partners; period ends before these submissions. No inference about other assistants or the new content's performance |
| Cloudflare Web Analytics | **48 visits, 48 page views**, all 48 direct, all path `/`; bots excluded | 19–25 October, dashboard GMT+7. Tracking was created only about two days earlier, so this is incomplete historical coverage and may include owner/QA visits |
| Cloudflare countries | US 24, Thailand 21, Canada 1, Brazil 1, South Korea 1; Singapore 0 | Visits, not unique people or qualified prospects |
| Identifiable AI referrers | 0 in the Cloudflare period above | All visits were labelled direct; stripped or absent referrers cannot identify acquisition source |
| AI crawler traffic | Not collected | The public script's requests are probes, not real bot activity |
| Consumer answer panel | Not collected | 12 fixed queries × 3 intended surfaces is planned coverage, not completed observations |
| Search-attributed signup / first completed report | Unavailable: uninstrumented | Stakeholder creation and existing screen events do not establish signup or acquisition conversion |
| IndexNow | Historical HTTP 202 for 12 URLs; latest dry run has zero changes | Key validation pending at submission, not a new status poll or proof of indexing |

The Bing image warning was checked against the live homepage. All five images have
an `alt` attribute. The hero artwork and report cover use empty alt text alongside
the corresponding visible content; the other three images have descriptions.
No missing attribute was found. Keep the warning in the record, but do not add
redundant descriptions merely to clear a scan: [W3C recommends empty alt for decorative
or text-redundant images](https://www.w3.org/WAI/tutorials/images/decorative/).

## Evidence and repeatable collection

The private evidence root is `<git-common-dir>/kivilo-seo/visibility/` (in this
checkout, `.git/kivilo-seo/visibility/`). It is outside source control and must be
backed up with the local workspace if the checkout is moved or removed.

- `observations/2026-10-26.json`: 25 sourced observations with status, period,
  source URL and original observation time.
- `evidence/2026-10-26-index-coverage.json`: all 12 individual Google inspections,
  including source links, exact coverage wording, canonical and last-crawl fields.
- `2026-10-25T18-20-09-634Z-cd17bdb0.json` and matching `.md`: complete public
  checks plus the imported baseline. No technical failures or regressions.
- `2026-10-25T18-22-49-292Z-c03646cd.json` and matching `.md`: public-only repeat
  after the collector's concurrency fixes; no changes or failures, with all 25
  source observations carried forward at their original timestamps.
- `latest.json`: newest collector snapshot; dated files remain the history.
- `schedule.json`: read-back of the saved recurring review configuration.

Dashboard sources: [Google Search Console](https://search.google.com/search-console?resource_id=https%3A%2F%2Fkivilo.app%2F),
[Bing Webmaster Tools](https://www.bing.com/webmasters?siteUrl=https%3A%2F%2Fkivilo.app%2F)
and [Cloudflare](https://dash.cloudflare.com/). The private observations retain the
more specific source links. No customer reports or account credentials are copied.

```sh
pnpm marketing:visibility
pnpm marketing:visibility --observations /absolute/private/path/observations.json
pnpm marketing:visibility:test
```

The collector performs bounded GET requests against public marketing URLs only.
It preserves failures and imported observation timestamps, compares public checks
with the previous snapshot and never converts missing search data to zero.
It does not sign into dashboards or submit URLs. See the
[tracking runbook](../docs/seo-tracking.md) and
[fixed query panel](../marketing/seo-query-panel.json).

## Scheduled review and next actions

Paseo schedule **`9c0d5402`**, “Kivilo weekly search and AI visibility”, is active:
**Wednesdays at 09:00 Asia/Singapore**, first run **28 October 2026**.
Saved cron: `0 9 * * 3`; verified next run: `2026-10-28T01:00:00.000Z`.
This is a local Paseo schedule: its daemon must be available, and authenticated
dashboard reads depend on accessible sessions. A missing session is recorded as
unavailable while public checks continue. No scheduled run has occurred yet.

Each run collects fresh public checks, reads accessible dashboard metrics, saves
private dated evidence and reports changes. Compare matching finalized 7-day and
28-day windows, preserving source timezones and Singapore/all-country filters.
The first run and first review of each month attempt the fixed consumer answer panel,
with incomplete coverage explicit. Scheduled runs do not publish, resubmit, change
settings, buy services or contact other people.

| Next action | Owner | Review |
| --- | --- | --- |
| Reinspect all sitemap URLs and record index transitions; re-read pending search reports | Scheduled review | 28 October |
| Collect accessible assistant-panel and crawler evidence; preserve any access gaps | Scheduled review | 28 October, then monthly panel |
| Read the new verified-signup cohort after deployment; keep it separate from search/visit totals | Scheduled review | 28 October; release status in the work tracker |

Verification: all 25 collector/IndexNow tests and repository ESLint pass; the
package commands and live public collection complete without errors. An independent
review checked bounded public requests, unknown values, history locking and merged
observation validation. These changes add
measurement tooling and documentation; no production app or marketing deployment
was made during this baseline collection. The subsequent acquisition implementation
is recorded separately in [the work tracker](work-status.md); it does not backfill
the baseline's unknown conversion values.
