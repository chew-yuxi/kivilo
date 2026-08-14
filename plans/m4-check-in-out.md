# M4: check-in / check-out build plan

**Timebox:** 2026-08-13 → ~2026-09-13 (internal).
**Ships first** because it stands alone: no record history, no integration, works on an
agent's next handover. Every report filed seeds a property record M1–M3 later build on.

## Stack (matches sarnies-labs-mono house stack)

| Layer | Choice | Why |
|---|---|---|
| App | Next.js 16 App Router, React 19, TS 5.9 | House standard |
| Styling | Tailwind v4 + shadcn/ui (Radix) | House standard; pink-500 #EC4899 primary |
| DB | Postgres via Supabase, Prisma 5 ORM | House standard |
| Storage | Supabase Storage (video, frames, PDFs) | Signed-URL direct upload, no server relay |
| Video AI | Gemini (`@ai-sdk/google`) | Native long-video + audio input; a 10-min narrated walkthrough is one call |
| Reasoning AI | Claude (`@ai-sdk/anthropic`) | Check-out diff + damage/fair-wear judgement, structured output |
| PDF | `@react-pdf/renderer` | House standard |
| Test | Vitest (unit), Playwright (e2e) | House standard |

Single app (not a monorepo) until there's a second surface.

## Data model (M4 slice of the spine)

Spine objects are created thin now, so M1 can extend rather than migrate:

- `Stakeholder`: name, kind (INDIVIDUAL|ENTITY), idNumber, email, phone
- `Property`: address, postalCode, unit, type (HDB|PRIVATE_NON_LANDED|LANDED|COMMERCIAL)
- `Tenancy`: property, landlord, tenant, agent, startDate, endDate, rent, deposit

M4-owned:

- `Inspection`: tenancy, kind (CHECK_IN|CHECK_OUT), status
  (DRAFT|CAPTURING|PROCESSING|REVIEW|AWAITING_SIGNATURE|COMPLETED), conductedBy,
  conductedAt, `baselineInspectionId` (check-out points at its check-in)
- `Capture`: inspection, storagePath, durationSec, transcript, processedAt
- `Room`: inspection, name, order
- `InspectionItem`: room, name, category (FIXTURE|APPLIANCE|FURNITURE|SURFACE|METER),
  condition (NEW|GOOD|FAIR|POOR|DAMAGED), notes, quantity, `meterReading`,
  `sourceTimestampSec` (jump back into the video), `confidence`, `editedByHuman`
- `ItemMedia`: item, storagePath, kind (FRAME|PHOTO), timestampSec
- `Finding`: check-out only: item, baselineItemId, changeType
  (DAMAGE|MISSING|WEAR|IMPROVED|UNCHANGED), verdict (TENANT_LIABLE|FAIR_WEAR|DISPUTED),
  rationale, estimatedCost
- `Signature`: inspection, stakeholder, signedAt, ip, imageData

Invariant: **AI is the scribe, not the witness.** The raw timestamped video is the
evidence; every AI-authored row carries `confidence` and flips `editedByHuman` when a
person touches it. Nothing is countersignable until a human has passed through review.

## Pipeline

1. **Capture:** browser MediaRecorder (or file pick), chunked direct upload to Supabase
   Storage via signed URL. Never through a serverless function (25 MB body cap).
2. **Process:** background route where Gemini reads the video file into structured JSON
   (rooms → items → condition → meter readings → transcript, each with a video timestamp).
   Zod-validated; a schema miss retries once, then parks the inspection in REVIEW with
   whatever parsed.
3. **Frames:** for every item, extract its frame at `sourceTimestampSec` as the report thumbnail.
4. **Review:** agent edits the draft (rooms, items, conditions, add/remove). Every edit
   sets `editedByHuman`.
5. **Sign:** both stakeholders countersign; report freezes and renders to PDF.
6. **Check-out diff:** Claude compares check-out items against the check-in baseline,
   per item, and drafts DAMAGE vs FAIR_WEAR with rationale. Agent overrides; the
   disagreement is the product moment, so the UI shows baseline photo and check-out
   photo side by side.

## Build order

1. ~~Scaffold + Prisma schema + seed~~: done 2026-08-13
2. ~~Inspection list / detail shell~~: done
3. ~~Upload + capture~~: done (signed-URL direct upload)
4. ~~Gemini extraction → draft report~~: done, verified against a real narrated clip
5. ~~Review editor~~: done
6. Signing: done. **PDF export still to do.**
7. ~~Check-out diff~~: done; prompt and persistence verified, but the Claude call
   itself is unproven on a funded key (the available one 400s on billing)
8. ~~Room-by-room capture, resumable~~: done 2026-08-13. Captures belong to a room;
   re-reading one room provably leaves reviewed rooms untouched.
9. ~~Identifiers from still photos~~: done. Video is downsampled too far to read a
   serial; deliberate stills are transcribed character-for-character and merged with
   the video's condition for the same item.
10. ~~PWA~~: done. Installable, offline shell, IndexedDB capture queue that survives
    no-signal capture and drains itself when connectivity returns.
11. Still to do: PDF or shareable web report, Playwright e2e for capture → review →
    sign, the polish pass to the Linear/Stripe bar, and a regression test pinning
    room-scoped reprocessing (currently verified by hand only).
14. Native app: deferred behind the PWA, per the 2026-08-13 decision.

## Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build`
- `pnpm test` (Vitest): the extraction schema and the diff classifier get real unit tests
- `pnpm test:e2e` for the capture→review→sign path

## Open questions

- PDPA: video retention period and where the bucket lives (SG region).
- Whether tenant self-serve capture needs an account or just a magic link (leaning link).
