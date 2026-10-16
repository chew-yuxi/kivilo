# Report addenda: "Updated <date>" pages after signing

## Why

Real condition reports change after the inspection. The reference report Yuxi supplied
(27 Jalan Merah Saga, 2025) carries pages stamped "Updated 11th September 2025" and
"Updated 23rd September 2025": a new dishwasher and dryer with model and serial numbers,
and a helper's toilet shown BEFORE and AFTER replacement. The agent simply edited the
PowerPoint and re-sent the PDF, so nothing records who agreed to the change or what the
report said before it.

In Kivilo a signed report is frozen by design (`assertOpen`, `assertNotCountersigned` in
`src/lib/actions.ts`; AGENTS.md "A signed report stops moving"). An addendum is therefore
an append-only, separately dated record attached to a COMPLETED check-in, never an edit
to it.

It matters for more than presentation. At check-out the baseline is the signed check-in.
Without addenda, the new dishwasher looks like an item that appeared from nowhere and
the replaced toilet looks like a change to assess, so the check-out comparison is wrong
for any unit where something was replaced mid-tenancy.

## Decisions (answered by Yuxi, 2026-10-16)

1. **The agent publishes.** The deal's agent or a teammate (`inspectionScope`, which is
   `actsAsAgent` plus the conductor), as for every other inspection action. Landlords
   do not publish.
2. **Both parties acknowledge.** A published addendum counts only once the landlord and
   the tenant have each acknowledged it. Until then the report and the PDF show it as
   pending acknowledgement, and check-out does not use it. Acknowledging is lighter than
   signing: an explicit "I acknowledge this update" by the signed-in party, recorded with
   who, when, IP, and the addendum's content hash.
3. **Add, replace and remove.** Each entry has notes, an identifier, and photos.
4. **A resolved maintenance case offers "Add to the report as an update".** It prefills
   an entry from the case and reuses its BEFORE and AFTER photos by reference, as the
   assessment snapshot does.
5. **No site visit.** The agent uploads photos supplied by anyone (landlord, contractor),
   straight from the browser to storage with a signed URL, under `addenda/<addendumId>/`.

## Design

### Data

- `ReportAddendum { inspectionId, number?, title, reason?, effectiveDate, createdById,
  publishedAt?, publishedById?, snapshot?, contentHash?, acknowledgedAt? }`. A draft has
  no number; publishing assigns the next number for the inspection (unique per
  inspection), writes `snapshot` and `contentHash`, and freezes it. `acknowledgedAt` is
  stamped in the same transaction as the second party's acknowledgement and is what
  check-out and the timeline read. One open draft per inspection.
- `ReportAddendumEntry { change: ADDED | REPLACED | REMOVED, roomName, targetKey?, name?,
  category?, condition?, quantity, identifier?, notes?, maintenanceCaseId?,
  propertyAssetId? }`: the agent's working rows while drafting, like `Finding` rows
  beside an `AssessmentVersion`.
- `ReportAddendumPhoto { entryId, storagePath, mimeType, sizeBytes?, note?, label?,
  maintenanceEvidenceId? }`: an upload under `addenda/<addendumId>/<clientId>.<ext>`, or
  a reference to a maintenance case's evidence object (label "Before" or "After").
- `AddendumAcknowledgement { addendumId, stakeholderId, acknowledgedAt, ipAddress,
  contentHash }`, unique per addendum and party.

### Line keys and the current state

A REPLACED or REMOVED entry names what it changes with a line key: `item:<id>` for a
signed check-in item, `entry:<id>` for the line an earlier addendum added. The current
state is the signed check-in's rooms and items with addenda applied in number order
(`applyAddenda` in `src/lib/addenda-state.ts`, a pure function):

- ADDED puts the line in its room, appending the room if the check-in has none of that
  name.
- REPLACED puts the new line where the old one stood. If the old one is not there (it
  came from an addendum that was never acknowledged), the new line is added to its room.
- REMOVED drops the line, and does nothing if it is not there.

The draft editor offers targets from the state after every *published* addendum, and
publishing refuses a target that is not in it. Check-out applies only *acknowledged*
ones, which is why the two rules above for a missing target exist.

### Snapshot

By value, rendered without following any mutable row: number, title, reason,
effectiveDate, publishedBy, and per entry its change, room, the target line as it stood
(name, identifier, condition, quantity, notes), the new line, notes, maintenance case
title, and photos (storage path, mime type, note, label). `contentHash` is SHA-256 of
the snapshot JSON. Each acknowledgement records the hash it acknowledged.

### Publishing

`publishAddendum` locks the inspection row, checks a COMPLETED check-in, at least one
entry, valid targets, assigns the number, writes the snapshot, and in the same
transaction:

- **Asset register.** An ADDED or REPLACED appliance with an identifier creates a
  `PropertyAsset` (name, room, identifier) and the entry keeps its id, so a check-out
  copies the link. A REPLACED or REMOVED line linked to an asset deactivates it.
- **Notifications.** A `REPORT_UPDATED` notification to the landlord and the tenant,
  href `/updates/<addendumId>`. The retrying notification outbox emails it ("The report
  for <address> was updated, please review and acknowledge", with the link and a note
  that the Kivilo app works too) and pushes it. The link is built from `KIVILO_APP_URL`.

### Acknowledging

`acknowledgeAddendum(addendumId)`: the signer is the session's stakeholder, never an id
from the request (`authorizeOwnAcknowledgement`, the counterpart of
`authorizeOwnSignature`). Only the tenancy's landlord or tenant, only a published
addendum. Idempotent.

Two ways in: `/updates/[addendumId]`, a clean document outside `(app)` that needs
sign-in (the proxy sends a signed-out visitor to `/login?next=/updates/<id>`), and
`POST /api/v1/addenda/[id]/acknowledgement` for the app's report screen.

### Where it shows

- `/reports/[token]` and the PDF: after the signatures, oldest first, each opening with
  an "Updated <date>" banner, title and reason, entries with photos (no marks), who
  published it, and each party's acknowledgement or "Pending acknowledgement".
  `RENDER_VERSION` 3.
- `GET /api/v1/inspections/[id]/report` gains `addenda` (with `acknowledgeAs` for the
  viewer). The app's report screen shows them with an Acknowledge button.
- Property timeline: `REPORT_UPDATED` at `acknowledgedAt`.
- Agent web: on a completed check-in, "Updates since signing": the published list, the
  draft editor (entries, photo upload, publish), and resolved maintenance cases with "Add
  to the report as an update". The app's maintenance case screen offers the same button
  to agents; authoring the rest of an addendum stays on the web for now.

### Check-out

`startCheckOut` builds the check-out's rooms from `applyAddenda(signed check-in,
acknowledged addenda in number order)`.
