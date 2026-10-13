# Report PDF and agency branding

## Context

Yuxi set the bar on 2026-10-13 with a real agency report (Savills / JQT Private, 27 Jalan
Merah Saga #02-05, 37 A4 pages): "we minimally need to produce something of this
standard", while noting it is old school rather than best in class. Its shape: about 300
photos in a uniform 3x3 grid, a header on every page (title, address, date, agency logo),
"Page X of Y", the room heading on every page, short red defect captions under photos,
thick red rings, and dated "Updated" pages added after the inspection. No written
inventory and no signatures.

Kivilo already records more (an item inventory with identifiers and meter readings, both
signatures, the check-out assessment, marks kept beside the photograph). What it lacks is
the document: the report is a web page with a "Print or save PDF" button, which gives no
running header, no page numbers, rooms that run into each other, marked photos at full
width, and grey captions. Chrome's print dialog also puts the page URL in the footer by
default, and that URL is the share token.

Decisions taken with Yuxi: a server-generated PDF (yes); agency name and logo upload
(yes); dated addenda planned separately (`plans/report-addenda.md`); marked photos laid
out however reads best.

## The document

A4 portrait, 36pt margins, Helvetica (built in, so no font files to trace into the
function). Generated with `@react-pdf/renderer` 4.x, which the m4 plan already names and
Next 16 already treats as a server external package.

Better than the reference, using data we already hold:

1. **Cover.** Agency logo and name, agent name, "Check-in condition report", the address
   large, then a facts grid: inspection date as "Friday, 22 August 2025", inspected by,
   landlord, tenant, tenancy term, and when each party signed. A line of counts (rooms,
   items, photos, noted items) and a contents list whose entries are internal links.
   Every room is also a PDF bookmark, so the reader's sidebar navigates the report.
2. **Noted condition.** One list, by room, of every item rated FAIR, POOR or DAMAGED and
   every photo carrying a caption or marks, each with its photo reference. At check-out
   this is the page everyone actually wants; in the reference you flip 37 pages for it.
3. **One section per room**, starting on a new page, its heading repeated on continuation
   pages. The written inventory first (item, quantity, identifier, colour-keyed
   condition, notes and meter reading, and the photo references from `ItemEvidence`),
   then the photos in a 3-column grid.
4. **Photo references.** Every photo is numbered room.photo ("3.12"), which is what lets
   the inventory, the noted-condition list and a dispute email point at one picture.
5. **Captions** (`Capture.note`) in red under the photo, as in the reference, and each
   mark's note keyed to the numbered badge drawn on it.
6. **Marks** drawn as vector paths over the image from the stored geometry with the
   existing `markPath`, red over a white halo with numbered badges like `MarkOverlay`.
   Never painted into the pixels. Marked photos stay in the grid (the reference proves a
   thick ring reads at a third of the page width), embedded at higher resolution so a
   reader can zoom. Check that call against a 2-up variant on real photos before
   settling it.
7. **Agreement.** Signature images, names, roles and signing times in Singapore time.
8. **Check-out assessment**, when published: findings with verdict and cost, the total
   against the deposit, and the maintenance evidence images.
9. **Running header and footer** on every page: logo or agency name, report kind,
   address, inspection date; footer with a short report reference and "Page X of Y". No
   URL anywhere in the document.
10. The evidence statement from the web report's footer closes the document.

All dates are formatted with `timeZone: 'Asia/Singapore'`. The server runs in UTC, so
without it an early-morning inspection prints the previous day.

## Serving it

- `GET /reports/[token]/pdf`, a route handler beside the page. Same lookup by
  `shareToken`, same `notFound()` for an unknown or revoked token. Only COMPLETED
  inspections have a token (`shareReport`), so the content is already frozen.
- Photos: `downloadCapture` (`src/lib/storage.ts`, no callers yet) then `sharp`
  `.rotate()` (applies EXIF orientation, which the AGENTS.md EXIF lesson says any
  server-side flattening must) and `.resize()` inside about 900px (about 1600px for
  marked photos), JPEG at about 75. A small concurrency limit keeps memory bounded.
  `sharp` becomes a direct dependency (it is installed today only through Next).
- A 300-photo PDF is about 10MB, over Vercel's 4.5MB response limit, which has no
  streaming exemption. So the PDF is written to `reports/<inspectionId>/<hash>.pdf` in
  the private bucket and the route answers 303 to a signed URL that lasts 10 minutes,
  with a download filename like `Kivilo-check-in-02-05-27-Jalan-Merah-Saga.pdf`.
  `<hash>` is a sha256 of every input to the render (rows, captions, marks, signatures,
  latest assessment version, branding, and a render version constant), so a cached
  copy is correct by construction: same inputs, same file; anything changed, new file,
  and older files in the prefix are removed.
- `revokeReportLink` removes the `reports/<inspectionId>/` prefix, so revoking a link
  also withdraws the generated copy.
- The `captures` bucket's allowed MIME types gain `application/pdf` (and `image/webp`,
  which maintenance evidence already accepts but the bucket refuses).
  `scripts/setup-storage.ts` currently returns early for an existing bucket, so it
  becomes create-or-update. Running it against production is a deploy step.
- `maxDuration` on the route, as the poster cron does.

## Agency branding

Built first on branch `claude/branded-pdf` by another session the same afternoon, and
merged here; its Chromium print of the web page was dropped in favour of this document
(on the reference report it came to 84 pages and 13 MB against this one's 47 and 7, with
no page numbers, and its size grows with every full-size phone photo it embeds).

- `AgentBranding`, one row per agent (migration `20261013120000_agent_branding`): agency
  name, agency licence, CEA registration, phone, logo. Per agent because a Singapore agent
  is individually registered; an agency shared across agents waits for agencies to exist
  as records.
- `src/lib/branding.ts`, `GET/PUT /api/v1/me/branding`, `POST/DELETE
  /api/v1/me/branding/logo` (raw image body, sniffed, at most 1 MB). The logo is stored as
  PNG at `branding/<stakeholderId>/logo`, replaced in place; the row's `updatedAt` is in the
  PDF cache key so a new logo redraws the report.
- `PUT` also takes `agentName`, the name printed beside the agency. Until then it is the
  start of the agent's email address.
- The report uses the tenancy's agent, falling back to the inspector.
- Account deletion removes the row and the logo.

## Entry points

- Web report: "Print or save PDF" is now "Download PDF", a link to `./pdf`, and the page
  carries the agency header.
- Web inspection page: a "PDF copy" card for the agent (`src/components/download-pdf.tsx`).
- App: Account has a Report branding card and drawer (agency fields, your name, logo); a
  signed inspection has Download PDF beside its share link, opened in the phone's viewer.

## Verification

- `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test`, `pnpm test:integration`,
  `pnpm test:e2e`, and `flutter analyze` plus `flutter test` in `mobile/`.
- Unit: photo grid paging, references, noted-condition selection, and the mark
  geometry in points.
- Integration: profile updates and logo validation (a non-image refused), and the PDF
  route's 404 for unknown and revoked tokens.
- e2e: after sharing, fetch `<link>/pdf`, follow the redirect, check `%PDF`, then
  extract text with `pdfjs-dist` (dev dependency): the address and "Page N of M" on
  every page, room names, the caption. Revoke, and the PDF route 404s.
- Visual: seed a local completed inspection with the reference report's own photos
  (extracted with `pdfimages`, kept in /tmp, never committed), with matching rooms
  and captions, render it, and compare it page by page with the reference using
  `pdftoppm`.

## Deploy order (needs Yuxi's go)

1. Apply the migration to production (`.env.deploy`, `prisma migrate deploy`).
2. Run `scripts/setup-storage.ts` against production for the bucket MIME types.
3. Push `main`, confirm the deployment with `vercel ls`, and check `/reports/<bad>/pdf`
   404s.
4. Mobile build or patch.
