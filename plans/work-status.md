# Kivilo work tracker

Updated 21 October 2026. This conversation coordinates the work below. Yuxi has
authorized publishing the native patch once the artwork deployment is live; that
deployment is now verified. This does not authorize a new iOS store submission.

## Current execution queue

| Work | Status | Owner | Completion evidence / next step |
| --- | --- | --- | --- |
| Host optimized illustrations | **Done, live** | Coordinator | `ddb4012`; all eight public WebPs verified on the Kivilo domain, including hashes, transparency and one-year immutable caching. 253,874 bytes total. |
| Combine Home, navigation and teaching redesign with the latest room flow | **Done, verified source** | Integration agent | `3a11313`, based on current `main`. Preserves `292a0b5` inventory-first capture and immediate photo markup; guidance teaches that same flow. |
| Remove the new icon-font dependency from the redesign | **Done in candidate** | Integration agent | Reused existing icons; no missing glyph names against iOS `7161f53` or Android `ce0d8e3`. The actual Shorebird asset/native checks remain required. |
| Review and verify the combined candidate | **Done** | Integration agent + independent reviewer | 276 Flutter tests, clean analysis, web typecheck/lint/build and 98 unit tests. Independent review found no material regression in routing, guidance or the preserved capture/markup/queue logic. |
| Remove duplicate drawer handles | **Done in source; awaiting native patch** | Coordinator + audit agent | Removed the inventory editor's inner handle and extra spacing; the outer sheet supplies its single handle for add/edit flows. All native sheet implementations audited; 19 existing targeted tests and Flutter analysis pass. |
| Refresh the phone rehearsal | **Done** | Release agent | [rehearsal-checklist.md](rehearsal-checklist.md) now targets iOS 24 / Android 25 and the combined workflow. All physical results remain pending. |
| Publish Android patch for `1.0.0+25` | **Waiting for release environment** | Release agent, coordinator publishes | User approval exists. Need the existing production configuration, Shorebird identity, Android build/signing tools and a pinned verified source. Preserve `--build-number=25`. |
| Publish iOS patch for `1.0.0+24` | **Waiting for release Mac** | Release agent, coordinator publishes | User approval exists. Need the configured Mac/Xcode/Shorebird/signing environment; check App Store state read-only and preserve the store freeze. |
| Device smoke checks and delivery verification | **Waiting for devices** | Release agent + device owner | Follow the refreshed checklist, including restart to apply the patch, offline captures and no media loss. Record any checks that cannot be run. |
| Other computer's sessions | **Outside this workspace** | Session-audit agent | Yuxi confirmed those sessions are on another computer and cannot be accessed here. They are excluded from this execution queue; no further access request is pending. |

## Consolidation evidence

- Combined native source: `3a11313819354e1f1be9b61795c36a4fa8ba4aac`, based on
  `ddb4012a61a747fab81c86197468645ea508c492`. The tracker/checklist follow as a
  documentation-only commit; release from a pinned commit containing both.
- The other recent feature is `292a0b5`: inventory-first room capture, item-linked
  photos and immediate markup. Its backend is deployed; its native changes were
  recorded as unreleased and belong in the same candidate as this redesign.
- The session audit inspected local Paseo, Codex live/archive metadata and Claude
  project history. It found one independent mobility conversation: this one,
  Codex `01a15d33-adb4-71b1-8605-96a353359adb`, Paseo
  `ab716db0-e680-40d3-9a53-b1907c425631`. The other matching records were this
  conversation's subagents and approval reviews. The detailed local audit is at
  `/tmp/kivilo-session-audit.json`. Yuxi subsequently confirmed the other sessions
  are on another computer, so this tracker covers the work available here.
- The old `feat/kivilo-mobile-release` branch has no commits ahead of `main`; it
  contains no separate unmerged feature to bring in.
- Recorded stable patches before this work are Android patch 3 and iOS patch 4.
  Those are release-note records, **not a fresh Shorebird read-back**. Live state
  must be checked before creating/promoting another patch.
- Artwork production deployment: Vercel `9bkzYZALRdaRR5sXBnJt8iyUFeWn`, GitHub
  deployment `7221229836`. Live receipt: `/tmp/kivilo-hosted-illustrations-live.json`.

## Verification and release record

The combined native source passed **276 Flutter tests** and clean analysis.
Both release icon comparisons are empty, and native configuration, dependencies,
version and bundled assets are unchanged. The web passed typecheck, lint,
production build and **98 unit tests**. Independent review confirmed that capture,
photo markup and queue implementations remain the upstream versions.

Database integration/browser end-to-end tests were not rerun here: this environment
has no local Supabase/Docker stack. Physical-device tests and Shorebird's actual
native/asset build checks remain outstanding. The local Next build used non-production
configuration for compilation; it was not uploaded as a production build.

No native patch has been uploaded or promoted by this conversation. No store
build, submission, metadata or screenshots have been changed.

The current Linux environment has Flutter 3.47.2 but no configured release Mac,
Shorebird credentials, Android SDK/signing setup, production `mobile/env.json`, or
App Store Connect signer. Those are execution dependencies, not missing user
approval. Never substitute development configuration in a production patch.

## Reviewed items outside this patch

| Item | Disposition |
| --- | --- |
| [ImgBot PR #1](https://github.com/chew-yuxi/kivilo/pull/1) | Do not merge into this patch: it changes native icon/launch assets and store screenshots. Revisit with an authorized store release after the freeze. |
| Physical full-flow rehearsal | Still required; automated test results do not imply phone delivery, background upload or force-quit checks passed. Use the updated checklist. |
| Stripe live billing | Existing launch dependency in `AGENTS.md`/`plans/billing.md`: needs the business's live Stripe configuration. It is not required for this design patch. |
| Tenant-view expansion and Singapore-specific servicing features | Explicitly deferred product designs in `plans/ux-competitive-review.md`; not silently added to the current execution queue. |
| Old AI-era plans and schema fields | Historical plans are not new tasks. The product remains human-authored; the retained columns require a separately scoped cleanup migration. |

As additional sessions become accessible, add only their unfinished, still-current
requests, with source evidence and an owner. Mark superseded or already-shipped
requests as such instead of executing them twice.
