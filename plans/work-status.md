# Kivilo work tracker

Updated 21 October 2026. This tracker now combines the cloud design session with the
mobility/Kivilo sessions on the release Mac. Work is being integrated on
`codex/consolidate-kivilo-20261021`; production is still the separately verified
`d32bc42`. A completed source change is not evidence of app delivery.

## Current execution queue

| Work | Status | Completion evidence / next step |
| --- | --- | --- |
| Inventory-first room capture and immediate markup | **Implemented; backend live; native release pending** | `292a0b5`. Preserved in the integrated candidate. Photos carry their item and completed marks through the durable queue. |
| Guided Home, navigation and onboarding artwork | **Implemented; artwork live; native release pending** | `ddb4012`, `3a11313`, `ddd1e62`. The eight public WebPs were verified for hashes, transparency and immutable caching. Native assets/configuration remain unchanged. |
| Remove duplicate drawer handles | **Integrated; awaiting native patch** | Main `d32bc42` removes the inventory editor’s inner handle; add/edit drawers retain one outer handle. |
| Photos and markup inside Add finding | **Integrated; verification running** | Recovered interrupted session as `85b2e2b`. Choose item, capture/select photo, mark immediately, save finding; resumable personal drafts, retry-safe uploads and immutable published evidence in app/web/PDF. Recovery and access-removal regressions added. |
| Private tenancies and selected collaboration | **Integrated; verification running** | Existing completed branch `9697a67` incorporated without rebuilding it. Lead shares selected tenancies; both work on them; only lead manages access. Removal preserves work, renewal sharing is opt-in, billing teams no longer imply access. |
| Combined regression checks | **Running** | Isolated local DB `kivilo_consolidation_20261021`; both migrations applied successfully. Logs and rendered finding-photo PDF fixture under `build/consolidation-20261021/`. |
| Coordinated backend release | **Pending tested candidate** | Apply finding-photo migration, then collaboration migration, then deploy the same pinned source. Neither new migration has been applied to production by this session. |
| Android `1.0.0+25` / iOS `1.0.0+24` patches | **Pending backend and final candidate** | This Mac has the required release tools/configuration. Build from isolated pinned checkouts, keep Android `--build-number=25`, run native/asset checks without overrides. No new patches uploaded here. |
| Physical delivery and full-flow rehearsal | **Needs devices** | [rehearsal-checklist.md](rehearsal-checklist.md); record exact patch/device, offline capture, interrupted markup, account isolation and push. Automated tests do not complete this. |
| Optional payment proof / supporting documents | **Queued; flow discussion only** | Latest proposal: agent requests an optional private document; tenant uploads; show submitter/time; no payment ledger, no signing block, excluded from public condition reports. No implementation existed. Scope question asked during consolidation; default is to finish existing implementations first. |
| Exposed production database credential | **Needs coordinated rotation** | Prior demo session recorded accidental exposure in a tool log. Rotate with all dependent connection settings updated and verified together; do not copy the credential into this tracker or rotate one consumer alone. |
| Apple approval | **Waiting for Apple** | Fresh App Store Connect read on 21 October: `WAITING_FOR_REVIEW` for 1.0.0. Store-build/submission/metadata freeze remains in force. |
| Historical iOS reviewer push failures | **Needs project access/device evidence** | Four old failures on two reviewer installations; successful iOS pushes existed in the same batch. Cached Firebase account lacks Kivilo access. No universal APNs outage established; do not rotate a working key on this evidence. |

## Release facts and order

Fresh read-only release checks on 21 October:

- Production custom domain: Vercel `dpl_8BnWWQdXJ93xDEifstQwBbRCwcmf`, Ready in
  `sin1`, source `d32bc42`. It includes the optional
  capture `itemId` and `itemApplied` acknowledgement needed by inventory-first capture.
- iOS `1.0.0+24`: latest patch **4**, ID `734035`, stable.
- Android `1.0.0+25`: latest patch **3**, ID `734030`, stable.
- No newer staging patch existed at that read-back. Xcode, Shorebird, release Flutter
  3.47.2, production configuration and signing setup are present on this Mac.
- Native-design publication was already authorized in the cloud session once artwork
  was live. That permission was recorded in `mobile/RELEASE.md`. Findings and tenancy
  collaboration add backend migrations to the coordinated candidate; stable promotion
  was authorized on 21 October after automated checks, with physical-device testing
  explicitly outstanding.

Release the expanded candidate in this order:

1. Finish combined checks and pin the exact source commit.
2. Apply `20261021090000_finding_photos`, then
   `20261021130000_tenancy_collaborators` to production. Collaboration backfills
   existing team permissions as explicit grants and preserves narrower historical
   inspection access; it must not silently remove existing access.
3. Deploy that backend and verify authenticated new routes and private evidence.
4. Build staging patches from separate pinned checkouts. Compare icons with iOS
   `7161f53` and Android `ce0d8e3`; pass Shorebird native/asset checks without overrides.
5. Record patch receipts and remaining device checks, then promote with Yuxi's go.
   Never upload a new iOS store build or change its pending submission.

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
verification remains historical evidence; the combined candidate is tested again here.

Local audit reports: `/tmp/kivilo-session-audit.md` and
`/tmp/kivilo-release-preflight.md`. Do not place credentials, live report tokens or
production connection strings in any evidence or tracker.
