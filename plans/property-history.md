# Property history, 30-day restore, and "ask who can" permissions

## Context

Agents told Yuxi they are scared property data gets deleted, and want a history of
changes and deletions. Today every delete except a whole property is permanent and
unrecorded (rooms, items, photos/videos, findings, draft updates), and nothing records
who changed what. Yuxi also wants agent/manager permissions to be intuitive: agents see
every action, and a locked one explains who can do it, instead of hiding it.

Decisions (Yuxi, 23 Oct):
1. Everyone with access to a property sees its history.
2. Submitted supporting documents: agents archive only; managers can delete (into the bin).
3. Build now, in parallel with the Codex session's uncommitted supporting-documents work.
4. Version one = history log + Restore for deletions.
5. Agents see every action; tapping a locked one shows who can do it.

## Approach

### 1. One append-only log: `PropertyEvent`
New table (additive migration `20261023120000_property_history`):
`id, propertyId (FK, cascade), tenancyId?, inspectionId?, actorId? (SetNull), actorName,
kind, summary, detail Json? (before/after), binId?, createdAt`, index `(propertyId, createdAt)`.

- `src/lib/property-history.ts`: `recordEvent(tx, …)` is called **inside the same
  transaction** as each mutation, so the log cannot miss a change, plus `propertyHistory(propertyId, viewerId)`.
- Nothing in the app can edit or delete an event.
- **Burst coalescing:** edits to the same item, or photos added to the same room, by the
  same person within 15 minutes update one event ("Jac added 6 photos to Kitchen").
  Without it, autosave would flood the log.
- **Logged:**
  - Rooms, items and captures: create, edit (with before → after for condition, notes,
    serial and meter values), delete, restore.
  - Findings: create, edit, delete, restore.
  - Addenda: draft entry deleted, draft discarded, published.
  - Report: sent, signed, share link created or revoked.
  - Tenancy terms: edits.
  - Access: collaborators added or removed, assignment and handover, moved to team.
  - Assets: added, retired.
  - Property: archive, trash, restore.
- **Visibility:** events for tenancies the viewer can access (`tenancyAccessScope` OR
  `managedTenancies`), inspection events through `inspectionScope`, and property-level
  events for anyone who can see the property. This matches `propertyManagement` in
  `src/lib/property-management.ts`.
- **History starts at release.** The screen says so. Existing milestones remain in the
  current property timeline.

### 2. The 30-day bin, as snapshot and restore (not a `deletedAt` flag)
There are about 95 reads of Room, Item, Capture and Finding across the report,
fingerprint, PDF, check-out copy and the API. A `deletedAt` flag would need every one of
them filtered, and a single miss leaks deleted data into a signed report. So instead:

- **New table `BinItem`:** `id, propertyId, inspectionId, kind, label, rows Json, deletedById, deletedAt, expiresAt (+30d), restoredAt?`.
- **On delete:** each existing delete action, in its existing transaction, records:
  - the removed subtree as ordered `{model, data}` rows (room plus its items, captures and
    ItemEvidence; or the capture plus its evidence links; or the finding)
  - which links were nulled (`Finding.itemId`, `InspectionItem.sourceCaptureId`)
  - the `StoragePurge` rows, created with `readyAt = expiresAt` instead of +3h, so the
    bytes survive until the bin expires
- **Restore:** `src/lib/bin.ts` `restoreBinItem(id)`. It authorizes like the original
  delete, takes the same locks (`editOpenInspection`, or the finding's lock path), then:
  - requires the inspection to still be open for room, item and capture restores, since a
    sent or signed report never changes
  - re-inserts the rows with their original ids, in order
  - re-links nulled links whose other end still exists
  - deletes the pending `StoragePurge` rows
  - logs `RESTORED`
- **Room-review invariant:** a restore into a reviewed room sends it back to `REVIEW`, and
  restored captures lose `processedAt`, so they must be reviewed again. This matches "a
  new capture sends its own room back to REVIEW".
- **Finding photos:** their existing `deletedAt` is cleared on restore. Their purge is
  likewise deferred 30 days.
- **Expiry:** the daily `/api/internal/property-trash` cron also deletes expired `BinItem`
  rows. Their storage purges fall due by themselves through the existing worker.
- **Old app builds keep working:** the DELETE endpoints are unchanged; they now go to the
  bin.

### 3. Supporting documents (Codex session's feature, not on `main` yet)
Once it lands:
- **Archive** (`archivedAt`): anyone with access to the tenancy.
- **Delete** to the bin: `managedTenancies` only.
- Both are logged.

I'll build the hooks so this is a small follow-up. I'll leave a note in
`otter-context/projects/mobility.md` so that session wires the archive and delete calls
in the same way, and not message it directly unless you want me to.

### 4. History screens
- **Web:** `src/app/(app)/properties/[id]/history/page.tsx`
  - Linked from `property-settings.tsx`, between Property records and the Danger zone, and
    from `inspections/[id]/page.tsx` next to "Property settings".
  - Rows read "Jac deleted Kitchen (4 items, 12 photos) · 2:14pm", grouped by day.
  - Filter: All changes / Deletions.
  - **Restore** button while the bin item is restorable.
- **API:**
  - `GET /api/v1/properties/[id]/history`
  - `POST /api/v1/bin/[id]/restore`
  - Both are new routes in the `authed` pattern, so nothing changes for released builds.
- **App:** new `mobile/lib/screens/property_history_screen.dart`, read through `_read` so
  it works offline. Reached from Property settings and the inspection screen.
- **No new icon glyphs:** uses only icons already in the release font, so it can ship as
  a patch. The font hash is checked before release.

### 5. Show every action; locked ones explain who to ask
- **API (additive fields):**
  - Property settings and tenancy access get `managers: [{name}]`, the people who can act:
    the personal lead, or the agency's active owners and managers.
  - Agency detail already returns members with roles.
- **Shared components:**
  - App: `showPermissionSheet(context, action, names)` in `kivilo_components.dart`
  - Web: a `<LockedAction>` button that opens a small dialog
  - Text: "Only the responsible agent or a team owner/manager can delete this property.
    Ask Yuxi or Nimin."
  - The client decides from the existing `canManage*` flags, never from server errors,
    which deliberately read "not found".
- **Converted from hidden or disabled to visible-with-sheet:**
  - Property settings: Archive, Unarchive, Restore, Delete
  - Team: Invite, Rename, member actions, owner role
  - Tenancy access: Move to team, Assign, Add/remove collaborator
  - Document delete
  - These apply on both web and app. Billing stays hidden, per the store rules.

## Critical files
- `prisma/schema.prisma` plus the new migration
- New: `src/lib/property-history.ts`, `src/lib/bin.ts`
- Delete and edit actions:
  - `src/lib/actions.ts`: `deleteRoom`, `deleteCapture`, `deleteItem`, `deleteFinding`, and the edit/create actions
  - `src/lib/addendum-actions.ts`
  - `src/lib/property-actions.ts`
  - `src/lib/tenancy-access-actions.ts`
  - `src/lib/agency-actions.ts`
  - `src/lib/maintenance.ts`: assets and terms
- Purge: `src/lib/storage-purge.ts`, `src/lib/property-trash.ts`
- New pages and routes: web history page, `src/app/api/v1/properties/[id]/history`, `src/app/api/v1/bin/[id]/restore`
- Locked-action conversions: `property-settings.tsx`, `team-management.tsx`, `tenancy-access-panel.tsx`, `tenancy-assignment-panel.tsx`
- App:
  - `mobile/lib/services/api.dart`
  - new model and screen
  - `property_settings_screen.dart`, `team_screen.dart`, `tenancy_access_screen.dart`, `inspection_screen.dart`
- Docs: `AGENTS.md` (a new "History and the bin" section), `plans/property-history.md`

## Build and release order
1. Work in a clean worktree off `main`, never in the shared checkout, where the Codex
   session has uncommitted work.
2. Schema and migration first, then the server (log, bin, restore and tests), then web
   pages, then the app.
3. Release:
   - read the production schema, then apply the migration
   - push and confirm the deploy
   - Shorebird staging patches
   - your go for stable

## Verification
- **Integration tests, local Postgres:**
  - For each kind: delete → bin row and history event → restore brings back the identical
    rows, links and room status; storage purge deferred, then cancelled.
  - Restore refused once the report is sent, and after expiry.
  - Expiry cron removes the bin item and the bytes.
  - History visibility: a collaborator on one tenancy doesn't see another tenancy's events.
  - A signed report's fingerprint is unchanged by a delete and restore of findings.
- **Browser test:** delete a room, see it in History, restore it, and confirm it's back in
  the review editor. Also check an agent sees Delete property and gets the "Ask …" sheet.
- **App widget tests:** the history screen (including offline), restore, and the
  permission sheet on each converted action.
- **The full set:** typecheck, lint, build, unit, integration, e2e, Flutter analysis and
  tests, and an icon font hash check before patching.
