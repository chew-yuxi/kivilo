# UI/UX review and competitive position (2026-10-18)

Method: the web PWA driven on a Pixel 7 viewport against the local stack (landing,
inspections list, inspection page, room capture, room review, check-out review, shared
report), plus a read of the Flutter room screen. Competitors from their own product pages.
Screenshots were taken to `/tmp/uxshots/out/` and are not kept in the repo.

## Where the market is

| | Kivilo | InventoryBase (UK) | Inventory Hive (UK) | Property Inspect (UK/US) | Singapore today |
|---|---|---|---|---|---|
| Who it serves | SG agent, both parties | Clerks, agencies | Agents, clerks | Rental and FM teams | Services (Expat Handovers, Rentify), Word templates |
| Capture | Photos, narrated video, offline queue | Photos, live video calls | Photos, 360 (Ricoh, Insta360) | Photos, voice notes, GPS, live video | Phone camera roll |
| Drafting | Person writes every line | BaseAI drafts from photos | None stated | Inspect AI | n/a |
| Check-out | Starts from signed check-in, per-line reference, findings with verdicts | Template | Side-by-side with inventory | Not stated | Manual |
| Signing | Both parties, content fingerprint, frozen report | E-sign | E-sign, audit-trailed tenant comments | E-sign, audit trail | Wet ink or PDF |
| After signing | Addenda both acknowledge, 30-day move-in defect window, maintenance, renewals | Not stated | Maintenance export | Actions with SLAs | Expat Handovers sells the 30-day defect window as a service |
| Price | Free 1 property, Pro per seat | Not published | £30/month, unlimited reports | Not published | Per visit |

Read of it: the UK incumbents are diary-and-template tools for professional clerks, and
in 2026 every one of them is racing to AI note generation (BaseAI, Inspect AI, PIM's video
AI notes, DoorLoop AI Inspections). Singapore has no software competitor at all; the
nearest thing is a human service. Kivilo is already ahead on the parts that matter after
the visit (frozen signed report, fingerprint, addenda, move-in defects, check-out against
the agreed state). It is behind on the visit itself: entering the inventory is slow on a
phone, and that is the part an agent feels every day.

## Bugs found during the review

1. **Inspection page throws during server render once a report link exists.**
   `src/components/share-report.tsx:18` reads `window.location.origin` in render, so SSR
   logs `ReferenceError: window is not defined` and React falls back to client rendering
   for that tree (and it lands in `ErrorEvent`). The comment's reason, "whatever host the
   agent is on", predates `KIVILO_APP_URL`; building the link from that origin on the
   server is the root fix.
2. **Shared report header overlaps itself on a phone.** With `AgentBranding` set, the
   agency name, "Agency licence", the CEA number and the email draw on top of each other
   at 390px. It is the first thing a landlord sees on the link.

## Inspector experience, ranked by daily cost

3. **Review editor density.** Every line is a full card: name, make/model/serial, kind
   select, condition select, notes box, Remove. About 770px per line; a 13-line kitchen
   is ~10,000px and the sample 85-line flat is several minutes of scrolling. The Flutter
   room screen already does list-plus-edit-sheet. Web should match: a collapsed row
   (name, condition chip, first line of the note), tap to expand, condition as four
   one-tap chips instead of a native `<select>`, identifier field only for appliances.
4. **Check-out has no fast path for unchanged lines.** Most lines at check-out are the
   same as check-in, yet each needs its own pass, and "At check-in: GOOD" sits under every
   row whether or not anything differs. Wanted: "Everything else unchanged" per room
   (confirms untouched copied rows, explicitly, as `nothingToRecord` does), changed rows
   floated to the top, and the check-in photo for that line inline rather than in the
   room-level collapsed panel.
5. **Photos belong to the room, not the line, on web.** The app's edit sheet already
   links photos to a line (`ItemEvidence`) and the PDF prints them per line, but the web
   review editor had no way to set it and the web report did not show it. Built
   2026-10-19: a photo picker in the web row, and photo numbers beside each line on the
   report, matching the PDF's.
6. **The inspection page is one 22,000px scroll.** Handover QR, the full agreed
   inventory, signatures, share, PDF, addenda, renewal and check-out are stacked in one
   column. Lead with status and the single next action, collapse the inventory by room,
   group the after-signing actions.
7. **Phone chrome.** "Sign out" is a top-level header link on every screen; there is no
   way back to the list except "All rooms" then "All inspections". Small, but it is on
   every screen.

## How to be at the forefront

Ranked by leverage. The first two are the product; the rest compound it.

1. **Own the deposit settlement, not just the report.** Everyone else stops at a
   document. Kivilo already has findings with damage-or-wear verdicts and costs. Finish
   the job: a per-line before/after view (check-in photo beside check-out photo), a
   deduction statement totalled from the findings, and both parties signing the
   deduction the same way they sign the report. "The check-out is a diff, not a debate"
   is already the landing page's promise; this is the screen that keeps it. Later this is
   the dataset the deposit-insurance story in the spec needs.
2. **Be the fastest honest inventory.** Competitors sell speed through AI drafting, and
   Kivilo removed AI because agents need accuracy. Keep that as the position ("every line
   written by the person who was there") and win speed with tools that keep the person as
   author: items 3 to 5 above, on-device dictation into the note field (the inspector's
   own words, transcribed by the OS), and copying a serial off a photo with the OS's own
   text selection (iOS Live Text, Android Lens) so the inspector chooses what goes in.
   Dictation and text selection need your call against the "a person writes every line"
   invariant; both keep a person as the author, unlike the removed drafting. Then measure
   time from first capture to second signature (ProductEvent can carry it) and publish it.
3. **Make the report verifiable by anyone.** Every signature already carries a content
   fingerprint. A public "check a report" page where a landlord, tenant or tribunal
   uploads the PDF and sees whether it matches what was signed, and when, is a small
   build that nobody in this market has. It turns the fingerprint from a footnote into
   the reason a landlord insists on Kivilo.
4. **Treat the tenant as the growth channel.** The handover QR and defect window already
   put the tenant in the product. Their view should be the best-designed screen in it:
   their signed copy, the defect window counting down, maintenance, and at the end a
   check-out they can follow line by line. Tenants become landlords and agents.
5. **Singapore-native details nobody else will build.** Aircon servicing records (the
   TA usually requires quarterly servicing), the minor-repair cap and problem-free period
   from the CEA pack shown beside the relevant lines, HDB and condo room templates, and
   WhatsApp as the default share target.
6. **Later: 360 capture.** Inventory Hive ships it and PIM has it coming. For SG condos
   the narrated video already covers the walkthrough; not worth it before 1 to 5.

## Suggested order

1. Fix bugs 1 and 2 (a day).
2. Web review editor to list-plus-sheet with condition chips (3).
3. Check-out fast path and inline check-in photos (4).
4. Photo-to-line linking on the web editor and web report (5).
5. Deduction statement and its signatures (forefront 1).
6. Report verification page (forefront 3).

## Sources

- [InventoryBase](https://www.inventorybase.co.uk/)
- [Inventory Hive](https://www.inventoryhive.co.uk/) and [pricing](https://www.inventoryhive.co.uk/pricing)
- [Property Inspect](https://propertyinspect.com/)
- [Property Inspection Manager 5.7.5 release notes](https://propertyinspectionmanager.freshdesk.com/support/solutions/articles/11000137988-what-s-new-in-version-5-7-5-september-2026-)
- [DoorLoop AI Inspections launch](https://www.prnewswire.com/news-releases/doorloop-launches-ai-inspections-to-help-property-managers-work-smarter-and-faster-302682012.html)
- [Imfuna digital inventory](https://www.imfuna.com/new-digital-inventory-system-can-be-done-on-a-phone/)
- [Expat Living on SG condition reports](https://expatliving.sg/moving-house-in-singapore-relocation-service-property-condition-report)
- [mydeposits: photos and video as evidence](https://www.mydeposits.co.uk/wp-content/uploads/2021/04/Using-photos-and-video-as-evidence-EW.pdf)
