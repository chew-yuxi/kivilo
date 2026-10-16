# Sign by email link, and the signed PDF emailed on completion

## Goal

A landlord who is not at the handover gets an email, opens a link, signs in as themselves
with the emailed code, reads the frozen report and signs it. When the second signature
lands, both parties and the conducting agent are emailed the signed PDF.

## Decisions

- **The link is not a credential.** `/sign/[inspectionId]?email=...` only names the report
  and pre-fills the login form. Signing still needs a session for the landlord or tenant
  of that tenancy, and the write is `signOwnReport` / `authorizeOwnSignature`, unchanged.
  Sign-in claims the Stakeholder holding the verified address (`resolveAgent`), so someone
  who already uses Kivilo or the app signs into the same account.
- **Page outside `(app)`**, like `/reports/[token]`: no header, install prompt or upload
  queue. It is in the proxy matcher, for session refresh; the proxy forwards `email` to
  `/login`. A visitor signed in as anyone else, or holding an id that does not exist,
  gets one identical "nothing to sign for this account" page with a sign-out-and-switch
  button, so the page cannot be used to enumerate ids.
- **One report component.** The body of `/reports/[token]` moves to
  `src/components/report-document.tsx`, rendered by both pages.
- **Signature pad split.** The canvas becomes `SignatureCanvas` (`onSign(imageData)`);
  `SignaturePad` keeps the agent's queue checks around it. The sign page calls
  `signOwnReport` directly, since it is already a server action.
- **Content fingerprint.** Nullable `Signature.contentHash`: sha256 over the frozen
  content (inspection, tenancy and property, parties, rooms, items with their evidence
  links, captures stamped `processedAt` with notes and marks). Computed in
  `recordSignature`, inside its transaction, so every signing path gets it. Findings are
  excluded: they are written after the freeze and published separately. Shown short
  (16 hex, grouped) on the report page, the sign page and the PDF; `RENDER_VERSION` to 3.
- **Outbox.** New table `ReportEmail` (kind `SIGNATURE_REQUEST` or `SIGNED_COPY`),
  written in the same transaction as the change that causes it: Send queues requests to
  each unsigned party with an email; the transition to `COMPLETED` queues signed copies
  to landlord, tenant and the conducting agent (`dedupeKey` makes that once only).
  `/api/internal/report-emails` (every minute, `CRON_SECRET`) delivers them through
  Resend with an idempotency key per row, backing off exponentially on failure
  (`retryAt`), giving up after 10 attempts. A request whose party has since signed, or
  whose report is no longer awaiting signature, is withdrawn (deleted) rather than sent.
  Signed copies attach the stored PDF from `storedReportPdf`; no email carries a
  `/reports/` URL. The link needs an origin a cron run cannot infer: `KIVILO_APP_URL`.
- **Resend.** `emailSigningLink(inspectionId, stakeholderId)` queues another request for
  an unsigned landlord or tenant with an email, while awaiting signature. A request
  already waiting to go is not duplicated. Per-party status (`signingParties`) is shown
  on the web inspection page and returned as a new `signingParties` field on
  `GET /api/v1/inspections/[id]`; the app resends through
  `POST /api/v1/inspections/[id]/signing-email`.
- **App.** Signature tiles show the email status and an "Email signing link" / "Resend"
  button (`Icons.mail_outline`, already in build 23). No response field is removed.

## Migration (additive only)

`20261016100000_email_signing`: `Signature.contentHash TEXT NULL`, enum
`ReportEmailKind`, table `ReportEmail`.

## Tests

- Integration: fingerprint on all three paths and stable across them; Send queues
  requests; resend rules; completion queues signed copies once; delivery sends,
  withdraws, backs off; the sign page's authorization refuses others like a missing row.
- Unit: email bodies (link, app hint, no `/reports/`), fingerprint formatting.
- e2e: `e2e/sign-by-email.spec.ts`, the tenant opens the link signed out, signs in with
  the mailed code, signs; an outsider and a missing id see the same page.
- Flutter: signature tile states and resend call.

## Production

Migration, `KIVILO_APP_URL`, the new cron in `vercel.json` (uses the existing
`CRON_SECRET`), Resend env already set.
