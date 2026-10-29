# Kivilo app-first UX implementation plan

Date: 25 October 2026. Owner: Yuxi. Execution: Claude Opus, in an isolated worktree.

## Objective and decisions

Make the Flutter app useful every day to an agent, landlord and tenant, with one
account and a trusted property record. Reduce setup and inspection effort, make
outstanding actions obvious, and make the finished report worth sharing.

User-approved direction:

- App first. Existing web signing, invitations, sharing and PDF delivery remain
  important companion journeys. A desktop operations redesign is deferred.
- Home becomes a command centre. Properties remains the durable record library.
- Free: 3 active properties per billing workspace. Pro: S$39 per agent seat/month,
  25 active properties per seat pooled according to the existing billing model.
- Address search and reuse of authorized properties/people reduce re-entry.
- Property layouts differ: offer editable starter rooms, not assumed inventories.
- Users can hold agent, landlord and tenant relationships simultaneously.
- Faster inventory writing, better reports, participant experiences and sharing
  are priorities. AI is optional assistance subject to measurement and cost control.
- Deal preparation is a later paid workflow. Do not expose an empty Deals tab.

The earlier chat contained hypotheses, not validated market portfolio statistics.
Do not use those estimates as product facts. AI allowance sizes, overage prices,
annual prices and additional-property prices discussed in chat are proposals only.
Do not implement them as approved commercial terms.

## Current implementation and evidence limits

Read AGENTS.md, CLAUDE.md, mobile/RELEASE.md and plans/work-status.md first.
The 18 October competitive review and old store screenshots are historical evidence.
Several issues in them have since been fixed. Inspect and render current screens.

Existing building blocks include Properties, workspace selection, saved offline
reads, next-action inspection cards, notifications, standard item rows by furnishing
level, item-linked photos, markup, frozen check-in references, signatures, addenda,
repairs, assets, documents, renewals and history. Native multi-shot capture is in
newer binaries; stable releases and patch compatibility differ.

Specific starting points:

- mobile/lib/screens/home_screen.dart currently uses a party-only split and a
  selected inspection plus property cards; it is not a comprehensive task inbox.
- mobile/lib/screens/new_inspection_screen.dart starts with manually entered data.
- mobile/lib/screens/property_screen.dart groups tenancy/report/document actions.
- src/lib/maintenance.ts listTenancies currently emits a singular role with
  landlord/tenant precedence; a context switch cannot safely be a client-only filter.
- src/components/review-editor.tsx already folds unchanged check-out rows.
- mobile/lib/screens/inspection_screen.dart already offers Confirm no changes for
  the assessment. Do not confuse this with reviewing unchanged inventory per room.
- src/lib/plan-limits.ts is currently Free 5, Pro 25 in the shared dirty checkout;
  the Free 3 decision has not yet been implemented there.
- Current concurrent changes include native report/photo work and billing allowance
  edits. Preserve them. Work from an isolated branch and reconcile before merge.

## Product structure and multi-role navigation

Keep Home, Properties, Account as primary navigation in the first release.
Home answers what needs attention; Properties answers where the records are.
Notifications stays accessible and is an event history, not the task source of truth.

One top context picker, shown only when useful:

- My work: Personal work, each authorized agency workspace, All my work.
- Homes I own: tenancies where this account is the landlord.
- Home I rent: tenancies where this account is the tenant (plural supported).

Do not make users choose one permanent account type during registration. A fresh
account can start work or accept an invitation. Ownership/rental views arise from
verified relationships, never from selecting a role in the UI.

The context picker is one sheet with grouped choices, not two competing dropdowns.
Persist its valid selection per signed-in account. Keep existing workspace identity
and billing semantics; operational agency is not billing Team.

Home and Properties adapt to the selection. Property cards show the user's role.
A dual-role relationship must expose the actual permitted actions without granting
new powers or duplicating records. Explicit signing/approval text names the capacity
and party; choosing Agent cannot sign as a tenant or landlord. Preserve existing
business rules about parties who happen to share an identity; do not invent a new
self-agreement rule as part of presentation work.

Deep links open the authorized destination and show its context even when it differs
from the selected Home. Returning should restore the previous list/context. No
forced account switching. Saved reads and draft ownership remain account-scoped;
switching context must never briefly show the previous context's records.

Acceptance: one test account acting as agent at A, landlord at B and tenant at C can
reach all three; a second account cannot read any of them. Include same-tenancy
multiple-capability cases, revoked access, team departure, account switching,
deep-link return, empty state, offline state and large text.

## Phase 1 — Context foundation and command centre

First vertical slice to implement and verify.

1. Add backward-compatible context/capability data using existing data-layer scopes.
   Preserve singular role fields and existing routes for installed clients.
2. Build the context picker and adaptive navigation described above.
3. Replace duplicated property cards on agent Home with grouped actionable rows:
   Needs your action, Waiting on others, Coming up. Keep a compact Continue work
   shortcut and New check-in. Move the introductory guide below tasks or into Help
   after first use; don't spend the first screen repeating a tutorial.
4. Derive tasks from actual report, repair, document, acknowledgement and tenancy
   state. Never equate unread notifications with outstanding work.
5. Each row has property/unit, concrete action, relevant person, truthful date if
   available, and one destination. Start with signatures, incomplete inspections,
   repair decisions/confirmation, document requests, addendum responses, defect
   deadlines and renewal/end dates where current contracts permit them.
6. Distinguish actions for me from actions for another party. Do not label an item
   overdue without a real deadline. Tenancy start date is not a booked inspection;
   visit scheduling needs an explicit field and is a later slice.
7. Sort actual overdue deadlines, upcoming deadlines, then pending undated work;
   avoid a fabricated urgency score. Display an honest all-clear state.
8. Use one bounded, scoped aggregation instead of one request per property. Reuse
   domain predicates so counts and destination state agree. Paginate/limit results
   with an accessible View all path; do not silently omit work from counts.

Candidate files: mobile/lib/screens/home_screen.dart, services/workspace.dart,
models/maintenance.dart, services/api.dart, ui/workspace_picker.dart;
src/lib/auth.ts, maintenance.ts, inspection-work.ts, property-work.ts,
renewals.ts and thin additive /api/v1 endpoints as needed.

Acceptance: every row reaches the exact actionable screen, completed/revoked tasks
disappear after refresh, a failed source is distinguishable from zero tasks, saved
data is labelled appropriately, cold and warm loading are usable, and all role/scope
tests above pass. Render iOS and Android phone layouts with realistic 25-property data.

## Phase 2 — Faster creation and room setup

Start New check-in with Existing property / New property, searchable only within the
user's authorized working scope. Existing property does not automatically grant
permission to start another tenancy: use management authorization under the lock.
An old report-only grant is not permission to reuse private tenancy information.

For a new Singapore address use OneMap Search through the authenticated backend.
Search building, street or six-digit postal code; debounce text, cancel/ignore stale
responses, bound results, and permit manual entry offline or on failure. Choose an
address, then enter unit separately. Preserve manual edits. Never infer a unit,
landlord identity, property ownership, furnishing or property type from a lookup.
Avoid merging units/buildings based solely on an address string or postcode.

OneMap is SLA's authoritative Singapore address source. Official workshop material
describes free APIs and a 300 calls/minute token-based limit; current Search docs
require authentication and document 429 responses. Confirm account-specific terms,
limits and permitted caching before production. Server credentials/token renewal
must never be shipped in Flutter. Map tiles and Mapbox are unnecessary for this slice.
Cache public address results within provider terms; rate-limit the backend proxy.
Use manual entry for non-Singapore addresses rather than forcing six-digit validation.

Reuse people through scoped contact suggestions, not a search of all Stakeholders.
The verified-email identity rule remains authoritative. Never rename a shared
verified identity merely because another agent entered a different name.
Save unfinished setup locally, scoped to account and context, and restore after an
interruption. Explicit creation is retry-safe and cannot generate duplicate tenancies.

Ask bedroom count, bathroom count and furnishing level; present an editable room
checklist with optional kitchen, living/dining, balcony, utility and custom rooms.
Preview before creation. Template rows are editable prompts, not findings of fact.
For the SAME property's renewal, offer its prior room names/order explicitly. Do not
copy prior conditions, serials, meter readings, photos or signatures as new evidence.
Check-out continues to use its frozen signed baseline. Cross-property layout copying
and a large template builder are deferred until demand is demonstrated.

Acceptance: manual entry works without OneMap configuration; no stale search response
overwrites newer input; duplicate submits are safe; new and existing property flows
respect workspace and plan limits; users reach the first room with minimal typing.

## Phase 3 — Tenant and landlord Home

Use the Phase 1 shell and existing domain actions, rather than separate apps/accounts.

Tenant: signature requests, exact defect deadline, outstanding document requests,
repair reporting and confirmation, addendum responses, check-out/deposit responses,
and easy access to their agreement and signed reports.

Landlord: signatures, defect acknowledgements, repair approvals/cost proposals,
unresolved repairs, renewal/end dates, agreements, assets and reports. Do not imply
Kivilo collects rent, holds deposits or provides a contractor dispatch service.

Property detail begins with current tenancy, people and next actions. Group Reports,
Documents, Repairs and Assets clearly. Make Property timeline versus Activity history
distinguishable in everyday wording. Expose only authorized history per term.

Acceptance: single-role users need no context switch, mixed-role users can find every
relationship, tenant defect deadlines use the existing Singapore calendar rule,
ended-tenancy documents remain accessible where authorized, signed records stay fixed.

## Phase 4 — Faster inventory writing

First verify current native room/camera/markup/check-out flows on supported binaries.
Keep immediate saved capture feedback, durable drafts and offline retry guarantees.

- Quick item duplication copies editable structure only, with deliberate treatment
  of identifiers and no inherited photo links or baseline identity.
- Room-level check-out fast path makes untouched baseline rows easy to inspect and
  explicitly confirm; cannot skip uploads, room review or inspection freeze guards.
- Investigate OS keyboard dictation and text extraction before adding native plugins.
  A custom dictation/OCR action must save a draft and require confirmation before
  replacing a serial or meter reading. No fabricated precision or automatic verdict.
- Completeness checks point to specific missing details; they do not impose a rigid
  photo quota or reject a legitimate nothing-to-record room.
- Bulk condition changes apply only to selected editable rows within the room and
  require a clear confirmation; do not touch other rooms or a signed report.

Optional AI is a separate measured slice: explicit selection of photos/voice notes,
draft preview, source references, edit/accept/reject, no automatic report writes or
damage/liability decisions. Accepted text enters through normal authorized actions.
This changes the historical no-AI decision and must be documented as an explicit
opt-in exception, not revived via the removed automatic PROCESSING pipeline.

Before enabling a provider: choose a model using representative accuracy/cost tests,
define retention/privacy treatment and credentials, server-enforce usage bounds,
cap tokens/media/retries, deduplicate jobs, and reserve quota transactionally. No
uncapped AI for Free/Pro. Previous chat costs and credit counts are unvalidated
proposals, so ship no invented allowance or live provider calls from this plan alone.
Manual workflows must remain complete. If provider decisions are missing, finish
the non-AI improvements and report the specific dependency.

Acceptance: fewer taps/less time on the same realistic room fixture, no lost draft
on navigation or failed save, no altered original photo, and no frozen-report writes.

## Phase 5 — Report and PDF quality

Audit current native report and src/lib/report-pdf before editing: native report
photos have concurrent uncommitted work. Reconcile those changes before integrating.

Use the PDF skill for implementation and render actual PDFs for visual inspection.
Produce a compact summary, readable room inventory, photo sizes appropriate to the
evidence, before/after finding pairs, visible assessment totals and clear party
responses. Preserve all signature, version, fingerprint and addendum semantics.
Mark missing/unavailable comparison photos honestly. Use frozen approved evidence.
Avoid a decorative cover that adds no useful information to short reports.

Include 1-room, furnished 3-bedroom, long-note, many-photo, no-photo, long-name,
portrait/landscape evidence, pending addendum and disputed-deposit fixtures.
Check orphan headings, repeated headers, page numbers, captions, overlays and file
size. Bump RENDER_VERSION; prior issued files remain verifiable. Tagged PDF support
requires a renderer capability check; do not claim accessibility compliance merely
because text extraction works. Document the outcome and remaining work.

## Phase 6 — Sharing and first-use conversion

Use the native share sheet with useful text and WhatsApp as an available user choice;
avoid a WhatsApp SDK dependency. Differentiate Review and sign, Share read-only
report, Invite collaborator, and Download PDF. Sharing is a deliberate action.

Signing links remain authenticated; public report tokens remain bearer credentials.
Generic branded previews must not leak names, addresses, signatures, private photos
or credentials to social crawlers. Don't add tracking parameters to bearer links.
Link recipients see the relevant property/action after appropriate authorization.
Signing stays usable in the browser without installing the app. Offer optional app
use after completing the task, without interrupting signing or viewing the report.
Keep Kivilo attribution tasteful alongside responsible agent/agency branding.

Acceptance: installed and uninstalled app paths work, sign-in returns to the requested
action, revoked links fail uniformly, access is checked again at every mutation,
wrong-account users have a clear switch-account path, sharing never sends automatically.

## Phase 7 — Plan usage and first-run clarity

Implement Free 3 / Pro 25 through the shared limits and existing server enforcement.
Reconcile the existing uncommitted Pro 25 edits; don't reset them to the branch base.
Update documentation and public copy that consumes these constants. Older installed
clients must receive compatible plan responses.

App: show usage such as 2 of 3 active properties, explain the counting rule and what
happens at the limit. Existing records remain accessible above the limit; only new
capacity is blocked. Follow current repository/store purchase UX restrictions:
no in-app price, purchase link or external upgrade call to action in this slice.
Purchase changes need a separate current store-policy review.

Preserve the actual server definition: ended tenancy/completed check-out frees a slot
as defined by plan.ts. Do not promise archiving always frees capacity or promise
permanent free storage. Billing workspace and operational team are separate concepts.
Collaborator access must not consume a second allowance for the same lead's property.

Acceptance: limits at 2/3/4 and 24/25/26, multiple seats, multiple tenancies on one
property, collaborators, downgrade, concurrent creation and read-only above-limit
access. No secret or card data enters UI or logs. No Stripe product changes needed.

## Later — Deal workflow and desktop

Design one Singapore rental workflow: reusable people/property, document checklist,
document pack, signing status/reminders, invoice and next action. Separate transaction
status from condition-report status. Deal tasks join Home only when backed by real
features. Introduce Deals navigation when a useful end-to-end workflow exists.

Before implementing prescribed forms, resolve permitted templates, source/version,
signing sequence and any compliance-provider dependency. Do not turn this UX program
into a full AML engine, lead marketplace, rent collection or trust-accounting system.
Dense tables, bulk assignment, saved filters, agency dashboards and calendar-heavy
desktop views are explicitly deferred. Existing web remains functional.

## Quality, sequencing and handoff contract

Implement phases as small reviewable changes in order. Phase 7's constants can land
early with focused verification; cross-phase prerequisites may be pulled forward
when necessary. Maintain a progress ledger with actual files, tests and screenshots.
Do not treat a feature as missing until inspecting current source and rendering it.

Preserve data-layer authorization, lock ordering, audit records, private storage,
durable media queues, frozen signatures and backward-compatible /api/v1 contracts.
Avoid global role switches as authorization. Keep account/workspace cache isolation.
Use existing Kivilo components, palette, button styles and 12px button spacing.
No Material popup menus; tight headers and scrolling filter rows.

Verification per slice: focused unit/integration tests for changed behavior, Flutter
analysis/tests for mobile changes, and rendered phone screens with normal/large text,
keyboard, loading, offline, empty and failure states. Run required repository checks
for the integrated candidate: typecheck, lint, build, unit, local-Postgres integration
and E2E; Flutter analysis and tests. Report blocked checks honestly. Tests use local
data and must not send real email/push, modify production or expose credentials.
Measure setup time, taps per item, report completion, and task completion using approved
event schemas without addresses, names, token URLs or free text in telemetry.

Execution authority is local implementation and verification. Do not deploy, publish
Shorebird patches, submit store builds, push/merge, migrate production, or alter live
Stripe configuration. Respect the current iOS/native dependency freeze. Work requiring
a new plugin can be developed on an isolated branch, but cannot be presented as patch
compatible or shipped without a new compatible binary.

Before integration re-read git status and compare current main: report-photo and other
concurrent work belongs to its owners. Resolve overlap deliberately and retest. Do not
copy production secrets into a worktree or logs. Use local-only environment setup.

## Sources checked 25 October 2026

- OneMap Search: https://www.onemap.gov.sg/apidocs/search
- OneMap introduction: https://www.onemap.gov.sg/apidocs/
- OneMap authentication: https://www.onemap.gov.sg/apidocs/authentication
- SLA workshop, free APIs/rate limits:
  https://www.onemap.gov.sg/apidocs/static/media/OneMap_API_Workshop_Presentation_260825.04f72136081dd249c5ee.pdf

## Execution status

- Planning: complete; code-level inventory and historical-review corrections included.
- Claude handoff: see app-first-ux-opus-handoff.md.
- Execution launched: Claude Code background session `65ba637b`, named
  `Kivilo app-first UX`, using the `opus` alias (startup reports Opus 5.5, high effort).
  Worktree: `.claude/worktrees/app-first-ux-20261025`, branch
  `worktree-app-first-ux-20261025`, based on `462fbf6`.
- Session `65ba637b` was stopped at the user's request. Its worktree is retained;
  no phase is claimed complete. The user will open a new session referencing this
  plan. Do not resume the background session or create a worktree automatically.
  Inspect any partial work in the retained worktree before reusing it.
