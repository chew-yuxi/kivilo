# Native app rehearsal on physical devices

The outstanding full-flow rehearsal in `DEPLOYING.md`, updated for the consolidated
design and inventory-first capture changes. **All checks below are pending until
someone records a physical-device result.** Automated tests, generated previews and
a successful patch upload do not complete this checklist.

Target the existing releases: **iOS `1.0.0+24` and Android `1.0.0+25`**, with the exact
consolidated patch recorded below. Follow `mobile/RELEASE.md` for patch delivery.
The iOS store freeze still applies; this rehearsal needs no new store build.
The consolidated source candidate is `3a11313`; its new patches have not been built
or published. Record their eventual numbers before running delivery checks.

## Owner prerequisites and results

- An iPhone and an Android phone with those binaries installed, camera/photo-library
  access, and permission to terminate and restart the app. Confirm that the intended
  patch actually applies after restart; an upload receipt alone is not delivery proof.
- Owner-controlled agent, landlord and tenant accounts, already signed in where
  possible. A second agent account is needed for account isolation. Use a made-up
  property, two rooms with distinct items, and harmless, recognizable sample photos.
- Controlled fixtures: empty account, editable inspection, awaiting-signatures report,
  completed check-in and check-out. A missing fixture is a prerequisite, not a pass.
- Wi-Fi and a way to disable connectivity. Do not uninstall or clear app data to
  simulate a restart or reset illustration caching: queued captures live on the phone.

Do not send production email during these checks. Use existing sessions and fixtures
for sections A–D. Sign-in codes, **Send for signature**, resends, the second signature,
and some repair/publication actions can send mail. Leave section E pending until the
owner separately arranges those actions with controlled inboxes. No production emails
or physical-device checks were performed when writing this plan.

| Record | iPhone | Android |
| --- | --- | --- |
| Device model / OS | Pending | Pending |
| Installed release | `1.0.0+24` — confirm | `1.0.0+25` — confirm |
| Patch number / track / source commit | Pending | Pending |
| Date / tester / network | Pending | Pending |
| Passed, failed and blocked check IDs | Pending | Pending |

Record **pass**, **fail**, or **not run** per check and platform. For a failure, include
the last action, connectivity, queue count where relevant, and a screenshot/recording.
Keep live report links and real personal information out of evidence. Note confusing
wording even when the action worked.

## A. Orientation, guidance and hosted illustrations

- [ ] **A1 — Delivery and navigation.** Download the patch, fully close and reopen
  the app, and confirm redesigned Home. Switch Home, Inspections and Account: selected
  destination and page title agree, and back navigation returns to the expected place.
- [ ] **A2 — Home versus library.** Home presents the next task for an editable
  inspection, signing guidance for an awaiting-signatures fixture, and links to the
  correct property/report. Inspections holds the full library: try search, status
  filters, no matches and clearing filters. Home does not repeat that complete list.
- [ ] **A3 — Empty and property states.** An empty account has a clear first check-in
  action on Home and in Inspections. Open a property, report, room and inventory item:
  titles/context identify the property, check-in/check-out and room. Check the property
  timeline and its empty state without confusing history with the editable report.
- [ ] **A4 — Guidance and artwork.** Expand every Home lesson: inventory first, item
  photos/marks, then review/signing. Inspect all four hosted scenes, including the
  signing scene and enlarged lesson art. No white rectangle on pink surfaces, clipped
  detail or distortion; instructions and actions remain reachable.
- [ ] **A5 — Art unavailable and cached.** View scenes online, go offline, restart,
  then revisit: previously cached art remains available. For a scene not yet cached,
  missing art must not hide guidance or block available controls. Record data-load
  errors separately; this does not promise that all app data works offline.
- [ ] **A6 — Small screen and large text.** Repeat Home, expanded guidance, library
  and item capture with larger system text on the smallest phone available. No clipped
  labels, missing icon glyphs, unreachable buttons or keyboard obstruction. Check the
  wide layout on a physical tablet if available; otherwise mark that check not run.

## B. Inventory-first capture and marking

Prepare the draft rooms while online, then use the same loaded rooms for offline
capture. Count the distinct sample photos before starting so missing or misplaced
photos are detectable.

- [ ] **B1 — Item first.** Open a room's inventory. Edit/remove a standard row and
  add another by hand. Open an item: details and evidence are together. **Edit details**
  saves the intended item; cancelling leaves the previous wording unchanged.
  The add/edit drawer has exactly one drag handle above its content.
- [ ] **B2 — Camera to item.** Take an item photo: **Mark photo** opens immediately.
  Try circle, arrow, freehand and undo/redo, then **Save photo**. It appears once,
  automatically attached to that item and room. Also save a photo without marks.
- [ ] **B3 — Original and overlay.** Reopen a photo, zoom and rotate the device.
  Marks stay on the same feature for portrait, landscape and rotated phone photos.
  Editing/removing marks changes the overlay, not the original; saved edits persist.
- [ ] **B4 — Library batch.** **Choose photos** selects at least three distinct
  images. Finish each pending photo and verify exact count and original item/room
  association. Cancel a later picker invocation: existing photos/details remain.
- [ ] **B5 — Room walkthrough.** **Room media & walkthrough** records a short video
  and opens existing room media. Video plays with audio and does not open the photo
  mark editor. Back/Done returns to the right room/item without moving evidence.

## C. Offline, restart and photo-loss checks

- [ ] **C1 — Interrupted editor.** Take an item photo, complete a mark, then terminate
  the app before **Save photo**. Reopen: original and completed mark remain;
  **Finish marking** resumes it. Upload waits for **Save photo**. Repeat by backing
  out of the editor instead of terminating the app.
- [ ] **C2 — Interrupted batch.** Choose three library photos, terminate from the
  first editor, then reopen. Every selected original is recoverable, including photos
  never opened in an editor. Finish them: each uploads once to its original item/room.
- [ ] **C3 — Offline and restarted.** In a loaded room, disable connectivity and save
  a marked photo and short video. Leave, terminate and reopen. Media and pending state
  survive. Restore connectivity: uploads complete once with notes, marks and links.
- [ ] **C4 — Connection lost during upload.** Interrupt a larger photo/video upload,
  restart and reconnect. Recovery produces no duplicate or lost evidence. An unresolved
  save has a visible error; preserve the queue instead of clearing app data.
- [ ] **C5 — Independent rooms and review.** With unfinished marks/pending uploads
  in room A, its review is refused with an actionable explanation. Review fully uploaded
  room B, then resume/add media in A: B stays reviewed and unchanged. Once A's media
  and edits upload, **I reviewed this room** succeeds. Empty rooms require explicit
  **Nothing to record** confirmation.
- [ ] **C6 — Account and destination isolation.** With pending media, change to the
  second controlled agent: it must not show/upload the first agent's captures as its
  own. Returning recovers them. After a camera/library interruption, opening another
  room must not reassign recovered media. If switching requires a production sign-in
  email, leave this check pending for the owner-run session.
- [ ] **C7 — OS/storage/session failures.** Check camera permission refusal and
  backgrounding during the picker. Separately exercise a realistically long walkthrough,
  low free storage and an expired session with queued media on a dedicated test phone.
  Record these separately; a short video does not verify them. Do not deliberately
  exhaust storage on someone's working phone.

## D. Existing fixtures: reports, references and access

Use signed fixtures for the frozen-report/PDF checks and an editable check-out
fixture for D3. Do not edit a report that has already been sent for signature.

- [ ] **D1 — Frozen report.** Awaiting-signatures/completed inventory, captions and
  photo marks cannot be edited, while media stays viewable. Inspect signing status
  without tapping Send, resend or sign.
- [ ] **D2 — Report and PDF.** Compare a controlled completed report's wording,
  evidence, marks and signatures across app, web and PDF. Check small identifiers and
  mark alignment on differently shaped photos. Open an existing controlled share link
  signed out; keep its bearer URL out of screenshots and notes.
- [ ] **D3 — Check-out reference.** In the editable check-out fixture, open
  **At check-in** and a copied check-out item:
  agreed wording and linked photos remain visible. Editing only the check-out item
  does not change the reference. In Add finding, search/filter, inspect the selected
  item's comparison/photos, then cancel without creating a finding.
- [ ] **D4 — Property and roles.** Existing signed reports/resolved repairs open the
  correct records from the property timeline. Existing landlord/tenant sessions show
  their own tenancy without agent editing controls or another account's records.

## E. Full-flow completion still outstanding

The owner must schedule these email-producing actions using only controlled accounts
and inboxes. Read-only fixtures do not count as an end-to-end pass. Record results on
both intended patched release binaries.

- [ ] **E1 — Check-in and signing.** Complete a fresh test check-in with two rooms,
  item photos/marks, a walkthrough and written inventory. Finish uploads and reviews,
  send, and obtain both signatures. Confirm completion, content fingerprints and the
  frozen report in app/web/PDF. Late bytes must not silently join the photos agreed
  at Send.
- [ ] **E2 — Check-out and publication.** Start from that signed check-in. Verify
  copied inventory/reference, record a changed item/finding, finish reviews/signatures
  and publish. With a second fixture, exercise **Publish: no damage found**. Each
  assessment appears on the intended report without changing the original check-in.
- [ ] **E3 — Repair regression.** Tenant reports a sample issue with a before photo;
  the parties propose/counterpropose/accept costs; agent records repair and actual
  cost; tenant confirms fixed. Verify allocation, property history and notification
  routing in foreground/background on both phones.
- [ ] **E4 — Email and access.** Check code sign-in, signing requests, each party's
  own-account signing and final PDF delivery only to the arranged inboxes. An unrelated
  account cannot open/edit the inspection. Revoke a controlled share link and verify
  the old URL no longer opens the report.

## Finish

Assign an owner to remaining failures or missing prerequisites. Do not mark the
`DEPLOYING.md` rehearsal complete until check-in, check-out, signatures and publication
actually pass on the intended patches. Preserve phones with unresolved captures for
investigation. Use the approved test-fixture cleanup process; account deletion is not
a required test or a substitute for handling queued media.
