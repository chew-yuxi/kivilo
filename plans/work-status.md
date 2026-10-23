# Kivilo work tracker

Updated 23 October 2026 Singapore time. Tenancy agreements and supporting documents are
**live** from `74904b8`: backend `dpl_4b5jjqtjD4pkPLq8DYX9bxhLrWos` in `sin1`, Android25
patch **14** / `743531` and iOS24 patch **15** / `743545`, both stable and read back at
17:52 Singapore time. Both production migrations preceded the backend; authenticated
smoke passed. The release preserves Properties, history/bin and the button system through
`95df445`. Details and rollback are in `mobile/RELEASE.md`; receipt:
`build/release-20261023-documents/stable-release.json`. Physical-device delivery remains
**NOT RUN**. The concurrent Properties session resumes its cache-loading work after this release.

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
