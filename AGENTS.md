# kivilo: M4 check-in / check-out

Installable PWA for property condition reports. The inspector walks a unit room by room,
narrating a video and photographing labels, and writes each room's inventory against that
evidence. At end of tenancy the agent records each change between the signed check-in and
check-out, with a damage-versus-fair-wear verdict, and publishes it as a dated assessment.

There is no AI in the product. Gemini drafting of room inventories and of the check-out
comparison was removed on 2026-10-12: agents need accuracy and are used to writing the
inventory themselves. The AI-era columns (`InspectionItem.confidence`, `Capture.transcript`,
`Room.processing*`, `Inspection.summary`/`aiConsentAt`, `Finding.confidence`) and the
`PROCESSING`/`FAILED` room statuses are left in the schema unused, pending a cleanup
migration; rows written by the old pipeline still carry them.

Product context: `plans/product-spec.md`. Build plan for this module: `plans/m4-check-in-out.md`.
Consolidated work queue, verification and release blockers: `plans/work-status.md`.

The product is **Kivilo**. The directory, this repo's Supabase `project_id`, and the
`otter-context` notes file are all still called `mobility`, which was the working name.
That is deliberate: `project_id` names the local Docker containers, so changing it spins
up a fresh stack and orphans the current database and storage. Rename all three together
when someone is ready to re-migrate and re-seed.

## Core principles

1. **Simplicity first.** No premature abstractions, no helpers wrapping a single call site.
2. **Root causes only.** No `try/catch` that swallows errors, no `?? []` patches on symptoms.
3. **Minimal impact.** Touch only what the task requires.

## iOS store freeze: in force until Apple approves 1.0.0

Set by Yuxi on 2026-10-19. Kivilo's first App Store version, `1.0.0` with build `24`
(submission `628f3b8a`), is waiting for review, and every new build, cancellation or
resubmission sends it to the back of the queue. Until App Store Connect shows it
approved (`READY_FOR_SALE` or `PENDING_DEVELOPER_RELEASE`):

- Do not upload an iOS build, submit one, cancel the submission, or edit its metadata
  or screenshots.
- Ship app changes as Shorebird patches on `1.0.0+24` (and `1.0.0+25` on Android), per
  `mobile/RELEASE.md`. Promoting a patch to stable still needs Yuxi's go.
- A change a patch cannot carry (a plugin, `Info.plist`, entitlements, a new icon) waits.
  Tell Yuxi; do not work around the freeze.

Check the state read-only with the App Store Connect API (app `6821514302`; the key and
a token signer are in `~/.appstoreconnect/`). Once approved, delete this section and the
matching notes in `mobile/RELEASE.md` and `otter-context/projects/mobility.md`.

## Four invariants

**A person writes every line.** The timestamped video is the evidence, and the inventory
is the inspector's reading of it. A new room starts with the standard rows in
`src/lib/room-templates.ts`, made as `addItem` makes a line, which the inspector edits or
removes like any other; a check-out starts from the signed check-in's room and item state,
which the inspector edits to record what they find on the new visit. While they do,
each room copied from the check-in shows its check-in lines and agreed photos (the
check-in's and any acknowledged addendum's), frozen in `Room.baseline` when the check-out
started, so renaming a room or a later addendum never
changes them (`src/lib/check-in-reference.ts`). Each copied row names its check-in line in
`InspectionItem.baselineKey`, so what it said stays in view after it is edited, and a
line's frozen `photoIds` (the check-in photos linked to it, absent on baselines frozen
before 2026-10-19) put those photos beside the row when it is opened. The
reference checks `inspectionScope` on the check-in itself, since conducting a check-out
is no access to its check-in. It is for reading only: nothing is ever written from it. A room
reaches `REVIEWED` only through `markRoomReviewed`, which needs at least one item or the
inspector's explicit confirmation that there is nothing to record (`{ nothingToRecord:
true }`, which the report then states), and stamps `Capture.processedAt` on every capture
the room was reviewed with. That stamp is what the shared report filters photos on, so a
capture that lands after Send never joins what was agreed, and `completeReview` refuses
while any capture is unstamped.

**A capture is never lost.** Media is written to IndexedDB (`src/lib/offline-queue.ts`)
the instant it is taken and only leaves the queue once storage confirms it; a failed
upload increments `attempts` and is retried, never discarded. Inspectors work where the
signal is worst, and losing a walkthrough is the failure that loses you the agent.

**Authorization lives in the data layer, not the proxy.** `src/proxy.ts` refreshes the
session and redirects signed-out visitors, and Next's own docs say proxy must not be
used as an authorization solution. The boundary is `src/lib/auth.ts`: every server
action calls `requireAgent()` then `authorizeInspection` / `authorizeRoom`, and every
page query is filtered by `inspectionScope`. Server actions are public HTTP endpoints
and every id they take is attacker-controlled, so none of them may trust one. A refusal
returns the same error as a missing row, so the API cannot be used to enumerate ids.
New tenancies are private to their lead agent. `TenancyCollaborator` grants full working
access to one tenancy; `actsAsAgent` is the single rule for the lead and these explicit
collaborators. `Team` membership (set with `pnpm team:set`) groups billing only and never
changes sharing. `InspectionAccessGrant` preserves an older conductor's access to that
specific inspection, without granting sibling reports or repairs; new `conductedById`
values are attribution only. Landlords and tenants read a report through `authorizeReport`,
never through the agent rules.

The lead or an agency owner/manager manages sharing by email on the web or
app (`tenancy-access-actions.ts`), under the tenancy row lock. An unclaimed address
uses the existing verified sign-in claim.
Adding access queues a `PROPERTY_SHARED` notification; removal deletes both full and
historical grants while keeping saved work. Scoped inbox, email and push messages recheck
access, and signed PDF delivery rechecks the recipient before sending. Sharing does not
include another tenancy on the same property. A lead or agency manager starts a renewal;
its sharing checkbox is off by default and explicitly copies current full collaborators
when checked.

Operational teams use `Agency` and `AgencyMembership`, separately from the billing
`Team`. An invitation must be accepted by its verified account before membership
becomes active. Owners and managers oversee agency-owned tenancies; ordinary agents
work only their explicit assignments. Existing personal tenancies remain personal
until their lead explicitly moves them into an agency. `managedTenancies` includes
the lead and active agency managers; `actsAsAgent` adds collaborators.
Membership changes and handover are serialized in `agency-actions.ts`, remove full
and historical agency grants on departure, and preserve personal work elsewhere.
An agency must retain an active owner. Historical `conductedById` never changes.

Home and the inspection portfolio default to an active team workspace when there is
one, with Personal available alongside it. New check-ins inherit that selection;
existing personal properties never move automatically. Workspace preferences belong
to the signed-in account and are checked against current membership. The Personal
filter means no agency; All my work retains assigned and historical report access
across workspaces. These filters only narrow authorization, and unfiltered API calls
keep their existing behavior for installed app builds.

`Inspection.reportAgentId` and `reportAgentFrozen` pin the report's agent at Send.
`reportAgent` is the shared reading rule for fingerprints, web/app reports, PDF and
signing emails, so responsible-agent handover cannot rewrite an agreed report.
Legacy reports sent during a rolling deployment are frozen before any handover.

Property settings are at `/properties/[id]/settings` and in the app. Archive removes
the property from active work while retaining access to reports. Delete moves only
draft-only properties into Recently deleted for 30 days; sent/signed/shared reports,
published history, repairs and assets prevent deletion. Lifecycle management requires
control over every tenancy: its personal lead, or an agency owner/manager. An agency's
ordinary lead agent cannot delete the agency's property. Trashed properties deny all
working access; recovery uses the separate management scope. The daily property-trash
cron deletes expired eligible drafts and retries durable `StoragePurge` manifests.
Never remove queued phone media as part of these actions.

Keep lock order consistent: agency (shared for ordinary work, exclusive for membership
changes), property, tenancy, inspection, then child rows. Property lifecycle takes a
property update lock; operations that can add children to that property take a key-share
lock before locking its tenancy/inspection. Recheck authorization after acquiring locks.

**Rooms are independent.** Finishing, reviewing and re-shooting are all scoped to one
room, so re-shooting the kitchen cannot touch a bedroom someone already reviewed. A new
capture sends only its own room back to `REVIEW`. Anything that deletes or resets across
an inspection rather than a room is a bug.

## Stack

- Next.js 16 App Router (Turbopack), React 19, TypeScript 5.9, Tailwind v4
- Postgres via local Supabase, Prisma 7 with the `@prisma/adapter-pg` driver adapter
- Supabase Storage for captures: **private bucket, signed URLs only**
- PWA: `src/app/manifest.ts`, `public/sw.js` (network-first pages, cache-first build
  assets), IndexedDB upload queue read through `useSyncExternalStore`
- Vitest for unit tests

## Local setup

```bash
supabase start          # ports remapped to 563xx (543xx/553xx are other projects)
pnpm setup:storage      # creates the private `captures` bucket (idempotent)
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Verification, run before claiming done

- `pnpm typecheck`: `prisma generate && next typegen && tsc --noEmit`. The typegen step
  is required: `PageProps` / `LayoutProps` are generated, so a bare `tsc` fails.
- `pnpm lint`: ESLint, zero warnings tolerated
- `pnpm build`: production build
- `pnpm test`: Vitest, hermetic and fast
- `pnpm test:integration`: Vitest against the local Postgres. Needs `supabase start`.
  Kept separate so a stopped stack does not look like a broken build.
- `pnpm test:e2e`: Playwright, the whole check-in on a phone viewport: sign in with the
  emailed code (read back from mailpit), create the deal, capture, write the inventory,
  review, send for signature, both signatures, share link with no session, revoke, and
  a second agent getting 404. Needs `supabase start`; starts its own dev server on port
  3111. Everything in the run is the real path. First run: `pnpm exec playwright
  install chromium`.

## Auth

Supabase Auth, emailed six digit code rather than a magic link: a link opens the phone's
default browser, so an installed PWA would send the agent to Safari with no session in
the app. On first sign-in an agent claims an existing Stakeholder with the same verified
address, or gets a new one, so someone already named on a deal keeps their tenancies
instead of becoming a duplicate. That only works if there is one row to claim, so
`Stakeholder.email` is unique and stored lowercase, and `createInspection` reuses the
person on file rather than creating another (pinned by `deal-parties.integration.test.ts`).

Locally the code arrives in mailpit on port 56324; the message body is readable through
its API at `/api/v1/messages`.

**Who sends that email depends on the environment.** Supabase's built-in mailer is capped
at two messages an hour project wide, which is unusable for a demo, so in production a
Send Email Hook POSTs the code to `src/app/api/auth/send-email/route.ts` and we deliver it
through Resend, with the wording in `src/lib/email.ts`. Supabase still mints the code,
sets its expiry, validates it on `verifyOtp`, and rate limits it, so the hook is a mail
transport and not an authorization boundary; `signInWithOtp` in the login form is
unchanged. The hook is deliberately left **off locally**, so the built-in mailer keeps
delivering to mailpit and `pnpm test:e2e` reads the code back exactly as before. That is
also why there is no environment branch in the sending code.

The hook request carries no session, so `SEND_EMAIL_HOOK_SECRET` is the only thing
separating Supabase from anyone who finds the URL. Verify it before reading the payload,
and keep `src/proxy.ts` off `/api/**`: a webhook has no cookie and would be redirected to
`/login`.

## Layout split

`src/app/(app)/` is everything an inspector sees and carries the header, the upload
queue, and the service worker. `src/app/reports/[token]/` and `src/app/sign/[inspectionId]/`
sit outside that group so a report renders as a clean document; both draw it with
`src/components/report-document.tsx`. A landlord following a link is not a user of
this app and should never meet an install prompt. The root layout is deliberately bare
for the same reason.

Server actions live in `src/lib/actions.ts` rather than a route folder, since components
across several routes import them.

`/` is the public landing page, static and outside `(app)`; the inspector's list is at
`/inspections`. `/login` and `/offline` also sit outside `(app)` and are static. `/offline` in particular must
render identically with or without a session, because it is what the service worker
caches at install and serves when a navigation fails.

## Sharing a report

`shareToken` on Inspection is an unguessable bearer credential (32 random bytes,
base64url) and the only thing guarding a document naming both parties and their unit.
The report page is `noindex`, and an unknown or revoked token 404s exactly like a report
that never existed. Signed storage URLs are minted per render, so links keep working
without any object becoming public.

## Why photos as well as video

A phone video is compressed hard enough that a serial plate or meter dial is unreadable
in a frame of it. Identifiers come from deliberate stills instead, which is why
`Capture.kind` exists and why the capture screens lead with photos.

## Two clients, one boundary

The inspector exists twice: the PWA under `src/app/(app)`, and a Flutter app in
`mobile/`. They share a backend, and more importantly they share the *authorization*
boundary, because a second one would have to be kept correct forever.

`currentAgent()` in `src/lib/auth.ts` is where that happens. A browser sends a session
cookie; the app sends its Supabase access token in an `Authorization` header. Both are
verified against the auth server (`getUser(jwt)` is a real `GET /user`, not a local
decode) and both resolve to the same `Stakeholder`, so **every server action works
unchanged from either transport** and nothing below that line knows which client it is
serving. It is memoized with React `cache()` per request, because a render resolves the
agent in the layout and again in the page.

A header cannot be used to escalate: holding a valid token for a user is what being that
user means. `src/lib/api/route.ts` is transport only, holds no authorization logic, and
returns the same 404 body for a refusal and a missing row so the API cannot enumerate ids.
The endpoints under `src/app/api/v1/` are thin delegations to the same functions the PWA
calls. `e2e/api.spec.ts` drives them with no browser and no cookie at all.

Keep `src/proxy.ts` off `/api/**`, which it already is: a request with a bearer and no
cookie would otherwise be redirected to `/login`.

## History and the bin

Agents asked never to lose property data silently (`plans/property-history.md`). Two
pieces answer that.

**`PropertyEvent` is an append-only history.** `recordEvent` / `recordBurst` in
`src/lib/property-history.ts` are called inside the same transaction as the change, so a
change and its record commit together. A burst of one person's edits to one thing within
15 minutes folds into a single line, keeping the first `from` and the latest `to`. Any new
action that changes or deletes property data must record an event. `propertyHistory` lets
anyone working a tenancy at the property read it (`actsAsAgent` or `managedTenancies`);
an exact old-inspection grant sees that inspection's lines only. Landlords and tenants
read signed reports, not the working log. Web: `/properties/[id]/history`. App:
`PropertyHistoryScreen`. API: `GET /api/v1/properties/[id]/history`.

**Deletes from a working report go to a 30-day bin; they are not flags.** `deleteRoom`,
`deleteItem`, `deleteCapture` and `deleteFinding` copy the removed rows, exactly as they
were, into `BinItem.rows` (`src/lib/bin.ts`), then delete them as before. Because the rows
are really gone, none of the ~95 report, fingerprint, PDF and API reads needs a `deletedAt`
filter. Never replace this with a soft-delete column. The deleted media's `StoragePurge`
tombstone is due at the bin's expiry instead of three hours, so the bytes survive until
Restore is no longer possible. `restoreFromBin` (`POST /api/v1/bin/[id]/restore`) is
authorized and locked like the delete was, reinserts with the original ids, relinks
surviving links, cancels the tombstone, and records `*_RESTORED`. A sent or signed report's
rooms, lines and photos never come back (`restoreAllowed`); a finding can. A line or photo
restored into a reviewed room sends that room back to `REVIEW`, and a restored photo is
unstamped. The daily `/api/internal/property-trash` cron deletes expired bin items; the
history line stays. Draft-update deletions are recorded but not yet restorable.

**Every action stays visible.** An agent sees Archive, Delete, Invite, Assign, collaborator
and member controls; tapping one they cannot take explains who can and names them
(`LockedAction` on web, `showLockedAction` in the app, `askNames` in the property and
tenancy-access responses). The client decides this from the `canManage*` flags, never from
the server's deliberately uniform "not found". The server stays the authority.

## A signed report stops moving

Sending for signature is the moment the report stops being a working document and becomes
the thing two people are agreeing to. `/reports/[token]` renders rooms, items and photo
captures at `AWAITING_SIGNATURE` and `COMPLETED`, so every action that changes what it
says calls `assertOpen` and refuses from that point: rooms, items, captions, marks,
deletes, and `finishRoomCapture` and `markRoomReviewed`, which move a room's status. The capture page's status filter is a convenience, not the control; a server
action is a public HTTP endpoint and the guard has to be in the action.

New bytes are the one exception, via `assertNotCountersigned`. A capture taken before the
agent tapped Send may still be draining out of the phone's queue, and refusing it would
strand it there forever, which is exactly what the capture invariant forbids. So
`requestUploadUrl` and `registerCapture` are allowed until countersignature and refused
after it. Signing, findings and sharing are deliberately not guarded, since they are what
happens *after* the freeze. Pinned by `src/lib/signature-freeze.integration.test.ts`.

## Choosing a check-out finding

The native Add finding flow is a full-page item chooser followed by its form
(`mobile/lib/screens/finding_editor_screen.dart`). Search and room filters use stable
room/item IDs; the chosen item keeps its condition comparison, serial/meter details,
notes and linked photos in view. The form saves before closing and keeps its draft on
failure. Photo navigation is disabled while saving, and completion closes its own route.

`finding-comparables.ts` enriches the existing inspection API's `checkOutItems` and
`checkInItems` additively; `id` and `label` stay for older builds. It reads the check-in
through its own `inspectionScope`, then uses frozen `Room.baseline` lines and `photoIds`
for comparisons. Photos are item-linked, room-local, PHOTO, stamped at review and signed
in one bounded batch (two per source/item). An older snapshot without line `photoIds`
never guesses from all room photos. Agreed retired original rows are excluded from the
missing-item choices only when frozen room ownership is known; deleting a whole
check-out room must not be mistaken for retiring its original inventory.

## Signing

There are three ways to sign, and all of them end in `recordSignature`: on the agent's
phone (`signInspection`), and as yourself (`signOwnReport`, behind
`authorizeOwnSignature`) from the app or from the web page an email links to.

**The emailed link is not a credential.** Send queues a "please review and sign" email to
each party with an address, and the agent can send it again per party (`emailSigningLink`,
`POST /api/v1/inspections/[id]/signing-email`). It links to `/sign/[inspectionId]?email=`,
which sits outside `(app)` like a shared report. The `email` only fills in the login form;
the visitor signs in with the emailed code, and since sign-in claims the Stakeholder
holding that verified address, a landlord who already uses Kivilo or the app lands on the
same account. The page answers only the landlord and tenant (`signingRole`); anyone else,
the agent included, and an id that does not exist get one identical "Nothing to sign here"
with a sign-out-and-switch button. `/sign` is in the proxy matcher for session refresh, and
the proxy carries `email` on to `/login`.

**Every signature records a content fingerprint.** `Signature.contentHash` is a sha256
over the frozen content (`src/lib/report-fingerprint.ts`): tenancy, parties, rooms, items
and the captures stamped `processedAt`. It is computed under the row lock inside
`recordSignature`, so no signing path can skip it, and it is printed short beside each
signature on the report page and the PDF. Null on signatures from before it existed.

**Report emails go through an outbox.** `ReportEmail` rows are written in the same
transaction as Send (requests) and as the second signature (the signed PDF, attached, to
landlord, tenant and the conducting agent, once each by `dedupeKey`). The
`/api/internal/report-emails` cron delivers them every minute and backs off on failure;
a request whose party has signed meanwhile is withdrawn, not sent. No email ever carries
a `/reports/` URL or a signed storage URL, since both are credentials. A PDF over
`MAX_ATTACHMENT_BYTES` (25 MB; Resend caps a message at 40 MB after base64's third) is
linked instead of attached: to `/sign/[inspectionId]` for a party, where a completed
report has a Download PDF, and to `/inspections/[id]` for the agent, both behind sign-in.
The link's origin is `KIVILO_APP_URL`. Pinned by `src/lib/email-signing.integration.test.ts` and
`e2e/sign-by-email.spec.ts`.

## The deposit statement

A completed check-out's published assessment is also a deposit statement: the deposit,
frozen into the snapshot at publish (`deposit`), less every tenant-liable finding's
cost (`depositStatement` in `src/lib/assessment-schema.ts`, in cents). Publishing a
version asks the landlord and tenant through a `REPORT_UPDATED` notification linking to
`/sign/[inspectionId]`, where each agrees or disputes with a reason, as themselves
(`answerDepositStatement`) or on the agent's phone (`answerDepositStatementInPerson`),
or through `POST /api/v1/inspections/[id]/deposit-statement`. Every answer names the
version it was given to and is refused on anything but the latest, so nobody agrees to a
revision they have not read; one `AssessmentResponse` per party per version, never
edited, holding that version's `contentHash`. A version from before deposits were frozen
has no statement and cannot be answered until the agent publishes again. Kivilo records
the answers and never holds or moves the deposit. The report and PDF draw the statement
and both answers, a party who has not answered as "not answered yet". The app does not
show it yet. Pinned by `src/lib/statement-actions.integration.test.ts`.

## Checking a report

`/verify` lets anyone holding a report PDF check it is one Kivilo issued, byte for byte.
The browser hashes the file and posts only the SHA-256 to `POST /api/verify`; the file
never leaves the device. `storedReportPdf` records every file it stores in
`IssuedReportFile` before uploading it, and records a stored copy from before the table
the next time it serves it. Rows outlive the file (a new render replaces it, revoking a
link deletes it), because a genuine copy stays genuine; a later row only adds "a newer
copy exists". A match shows what the file already says (property, signers, times, the
fingerprints), and an unknown hash is one answer whatever the reason
(`src/lib/report-verification.ts`). Like `/support`, it is public and outside `(app)` and
the proxy matcher.

## Updating a signed report

A countersigned check-in still changes: a dishwasher is replaced, a fixture removed. That
is an addendum (`ReportAddendum`, plan in `plans/report-addenda.md`), a dated, numbered
record beside the signed report, never an edit to it; the freeze guards above are
untouched. The agent (or an authorized collaborator, through `authorizeAddendum`) drafts entries that add,
replace or remove a line, with photos uploaded straight to storage under
`addenda/<addendumId>/` or reused from a resolved repair's evidence by reference.
Publishing (`src/lib/addendum-actions.ts`) freezes the draft into `snapshot` with
`contentHash` (SHA-256 of the key-sorted JSON, so it is recomputable from the stored
row), registers or retires appliances in the asset register, and queues a
`REPORT_UPDATED` notification whose email links to `/updates/[addendumId]`, built from
`KIVILO_APP_URL`.

It counts only once both parties acknowledge it, as themselves (`acknowledgeAddendum`,
the same rule as `signOwnReport`: the party is the session, never an id from the
request), on `/updates/[addendumId]` or `POST /api/v1/addenda/[id]/acknowledgement`.
That stamps `acknowledgedAt`, which is what `startCheckOut` and the property timeline
read. A replacement or removal names its line by key (`item:<id>` or `entry:<id>`);
`applyAddenda` in `src/lib/addenda-state.ts` is the one place the current state is
computed. The report page and the PDF draw published addenda after the signatures,
pending ones marked so.

A party who is with the agent, or has no email, acknowledges **in person** on the agent's
device, as `signInspection` takes a signature: `acknowledgeAddendumInPerson(addendumId,
stakeholderId)` behind `authorizeAddendum`, with the party id checked against the
tenancy under the row lock (anyone else is the same "Addendum not found"). Web: the
agent opens `/updates/[addendumId]`, which offers each pending party the button. App:
the report screen (`acknowledgeInPerson` on each addendum in the report API). Both ways
end in `recordAcknowledgement`, which stores `AddendumAcknowledgement.method`
(`OWN_ACCOUNT` or `IN_PERSON`, null on older rows), and the report, `/updates` and the
PDF say "acknowledged in person". `discardAddendum` deletes a draft and queues a delayed
`StoragePurge` of its `addenda/<id>` prefix, including unfinished uploads. Entry deletion
purges its durable upload intents. Neither ever purges repair evidence it references.

The app authors updates with the same functions (`AddendaScreen`). `addendaWorkspace`
(`src/lib/addenda-workspace.ts`) is what both the web panel and `GET
/api/v1/inspections/[id]/addenda` read, and the routes under `/api/v1/addenda/[id]/`
are thin delegations to `addendum-actions.ts`. App photos go through the shared durable
capture queue with owner `addendum:<addendumId>` and the entry id as the room
(`HttpAddendumPhotoBackend`), so a photo taken offline is kept and retried like a room
capture; one whose draft was discarded or published meanwhile stays in the queue
failing, by design, rather than being dropped. Storage takes JPEG, PNG and WebP only:
the web re-encodes anything else (an iPhone's HEIC) with `downscale(file, { always:
true })`, and the app relies on `image_picker`'s `imageQuality` re-encode and checks the
file's magic bytes, not its name (Android keeps `.heic` on the JPEG it writes). A push
for an update opens its report directly (`notificationScreen` in
`mobile/lib/services/notification_route.dart`).

## Tenant handover and move-in defects

After the tenant's first check-in signature, `queueTenantHandover` queues their deadline
email and `/api/v1/inspections/[id]/handover` supplies the QR. The QR opens
`/handover/[inspectionId]`, requires the tenant's own account, and contains no bearer
credential. `Tenancy.defectWindowDays` defaults to 30 inclusive Singapore calendar days;
0 disables it. The landlord or agent can change it only before the tenant signs.

`move-in-defects.ts` records a tenant's timely intent on their repair, pinning the signed
check-in and server filing time. Publishing freezes text and selected BEFORE photos in
an addendum snapshot, including its filing time and deadline. The tenant acknowledges
by publishing; only the landlord's own account can agree or dispute, with a reason for a
dispute. Agent in-person acknowledgement is forbidden. Pending/disputed notices stay on
the report and PDF but never enter the agreed baseline. The immutable snapshot's
`moveInDefect` provenance is authoritative even if retention removes its source FK.

A condition notice keeps the physical item's key and identifiers. Two notices about
one appliance cannot create two appliances. If an agreed replacement or removal retired
its target, landlord acceptance refuses it. Responses and check-out copying lock the
same check-in row, so the agreed inventory and photos are copied together. See
`plans/m5-invites.md` for the full contract.

## Marking up a photo

The inspector can circle a chip or point an arrow at a crack, on the phone, in the
capture Viewer. **The marks are data beside the photograph, never painted into it.** The
capture is the evidence, and a report whose photographs have been rewritten is worth less
than one whose photographs have not; the report footer says so, because that is what makes
the mark admissible rather than suspicious.

Geometry is normalized 0..1 against the image's upright intrinsic box, stored with that
box's size on `Capture.annotations` (`src/lib/annotations.ts`). Everything renders it
through `MarkOverlay`: an `<svg viewBox="0 0 w h" preserveAspectRatio="xMidYMid meet">`
occupying the same CSS box as the `<img>`. `xMidYMid meet` **is** `object-fit: contain`
with centred position, so the browser does the identical letterbox arithmetic for the
picture and for the marks and they cannot drift apart. Two rules follow: the `<img>` under
an overlay must be `object-contain` or unconstrained, never `object-cover`, and the
positioned box must wrap the image alone, never the image plus its caption, and never a
box that can grow past it. Two ways it grows: a flex or grid item stretches to its row
(the evidence strip needs `self-start`), and `max-h-full max-w-full` does not scale an
image up, so a picture smaller than its container leaves the element shrunk while the
overlay still spans the box. Both were measured at over 100px of drift before they were
fixed, and both are guarded by the alignment assertions in `e2e/check-in.spec.ts`.

Drawing reads pointer positions through `svg.getScreenCTM().inverse()`, not
`getBoundingClientRect()` as `signature-pad.tsx` does. The rect is the element's box, but
the picture inside it is letterboxed, so the rect puts every mark in the wrong place on any
photo whose aspect does not match its container.

Marks stop once the inspection is `AWAITING_SIGNATURE`: a red ring is a stronger claim
than a caption, and the report is the artefact both parties are signing.

## Billing

Plans and limits are decided only in `src/lib/plan.ts` (`plans/billing.md`). Stripe is the
truth about what was paid; the `Subscription` row is a copy, written only by
`syncSubscription` in `src/lib/billing.ts`, which re-reads the subscription from Stripe
every time, so a replayed or out-of-order event is harmless. It refuses to replace a
workspace's different live subscription and throws, which error tracking alerts on.
Checkout and the portal are server actions in `src/lib/billing-actions.ts`; the portal
opens only for the member in `managedById`. `/account` syncs when Stripe sends the agent
back, and `src/app/api/stripe/webhook/route.ts` verifies the signature on the raw body
before reading anything. `pnpm team:set` refuses to move an agent paying for Pro on their
own onto a team, or the `managedById` of their team's live subscription off it: there is
no handing billing over, so they cancel in Manage billing and move once it has ended.

`pnpm billing:setup [base URL]` creates or updates the product, the price (lookup key
`kivilo_pro_seat_monthly`), the portal configuration and, given a URL, the webhook
endpoint, printing its secret only when it creates it. Env: `STRIPE_SECRET_KEY` and
`STRIPE_WEBHOOK_SECRET` (server only). Locally, `stripe listen --forward-to` supplies the
webhook secret. Comps (`pnpm plan:set`) never touch a Stripe-paid row.

**Production sells only on a live key.** The Vercel Marketplace provisioned a Stripe
sandbox, and its test keys are in every environment, production included. A sandbox key
in production would sell Pro to anyone holding Stripe's public test card, so
`checkoutOpen()` in `src/lib/stripe.ts` hides Upgrade and refuses `startCheckout` there
until `STRIPE_SECRET_KEY` is `sk_live_`/`rk_live_`; `/account` falls back to "email us".
Going live: a Singapore Stripe account, its live key in Vercel production, then
`pnpm billing:setup <production URL>` with that key and its `whsec_` as
`STRIPE_WEBHOOK_SECRET`.

**Store rule:** agents buy on the web only. The Flutter app and `/api/v1` never show a
price, an upgrade button, or where to buy.

## Error tracking

Errors go to our own `ErrorEvent` table, not a third-party tool (`plans/telemetry.md`).
The server records what it throws through `onRequestError` in `src/instrumentation.ts`,
plus `authed`'s own 500s, which Next never sees. An agent's browser posts the rest to
`/api/v1/errors` from `src/lib/error-reporter.ts`, holding them in `localStorage` until
the server confirms. The browser skips anything with a `digest`, because the server already
recorded it under that digest, and the digest is the "Reference" an agent sees on screen.
The app does the same from `mobile/lib/services/error_reporter.dart`, with its bearer and a
file in place of `localStorage`: Flutter's and the platform's uncaught errors, and whatever
`plainError` turns into "Something went wrong". It never reports an `ApiFailure`, a
`DioException` or a lost connection, because the server records its own failures and no
signal is not a bug. Signed storage URLs quote their token as a JWT, so `redactSecrets`
cuts JWTs from every message and stack before they are stored or mailed.
Every 15 minutes `/api/internal/errors` emails `ERROR_ALERT_TO` once per new fingerprint,
then deletes anything over 90 days, as the privacy page promises. Never store a
`/reports/[token]` path unredacted: `redactPath` is the guard.

Usage events use the strict screen-category allowlist in `product-event-keys.ts`, never
paths, ids or free text. The native reporter in `product_events.dart` partitions its
bounded durable queue by Supabase auth user id and resolves the corresponding
Stakeholder through `/api/v1/me` before supplying `x-kivilo-owner`. It pins every bearer
to that account, including requests delayed by an interceptor. Route visibility and
selected tabs record visits; rebuilds and hidden tabs do not. `/admin` aggregates web,
iOS and Android behind the data-layer admin allowlist.

## Dev scripts

Image generation goes through Based AI (`src/lib/based-ai.ts`, OpenAI-compatible
`ai.based.one/v1`, needs `BASED_AI_API_KEY`). Nothing in the product calls it yet; try it with:

```bash
pnpm exec tsx scripts/dev-generate-image.ts "a tidy studio flat, wide angle" out.png
```

`scripts/dev-seed-report.ts <manifest.json>` seeds a countersigned check-in on the local
stack from a folder of photos (shape in the file), for working on the report and its PDF
against something the size of a real one. It refuses any non-local database.

## The report PDF

The bar is a real agency report (`plans/report-pdf.md`): photos three across, a header
and "Page X of Y" on every page, the room heading on every page, red defect captions. The
web page cannot meet it when printed, so the PDF is its own A4 document drawn with
`@react-pdf/renderer` (`src/lib/report-pdf/`): `model.ts` turns the database rows into
plain data, `document.tsx` draws it, `render.tsx` fetches the photos and stores the file.
It shares the evidence rules with the page, not the markup: only `COMPLETED` reports, only
photos stamped `processedAt`, marks drawn as vectors over an untouched photograph with the
same `markPath`, and no URL anywhere in the document, since the URL is the credential.

Photos are downloaded and shrunk with `sharp`, `.rotate()` first so EXIF orientation is
applied before the marks, which are stored against the upright picture, are drawn. The
file is far past the 4.5 MB a function may return, so it is written to
`reports/<inspectionId>/<hash>.pdf` and handed out as a 10-minute signed URL. The hash
covers everything drawn plus `RENDER_VERSION`, so a stored copy is correct by
construction; **bump `RENDER_VERSION` whenever the layout changes**, or every report
keeps serving its old drawing. Revoking a share link deletes the prefix.

Three ways in: `GET /reports/[token]/pdf` for anyone holding the link, `POST
/api/v1/inspections/[id]/pdf` for the agent, which needs no link to exist (the web
inspection page and the app both use it), and `GET /sign/[inspectionId]/pdf` for the
signed-in landlord or tenant (`signingRole`), refusing everyone else, and anything not yet
`COMPLETED`, with the 404 of a missing id. Each is in `outputFileTracingIncludes`. The header is the tenancy agent's
`AgentBranding` (agency name, licence, CEA number, phone, logo); with none set the report
reads as Kivilo's. Logos are stored as PNG whatever arrives, since the PDF draws only PNG
and JPEG, and the agent can set the name printed beside them.

## Plans and billing

A plan belongs to a workspace: the agent's team, or the agent alone (`plans/billing.md`).
Free holds 1 active property; Pro is per seat with 10 each, pooled. A property counts once
against its lead's billing workspace, including private properties, and sharing does not
charge the collaborator's workspace. **`src/lib/plan.ts`
is the only place a limit is decided**, and `createInspection`, the only place a property
is made, calls its guard; the API answers 403 `plan_limit`. An active property is one
whose tenancy runs and whose check-out is not signed, counted through `agentTenancies` so
there is still one rule for who an agent is. Nothing is locked over the limit. The app
shows the plan and never a price or a way to buy, because store rules forbid steering to
an outside purchase. Comps go through `pnpm plan:set`; buying is under "Billing" above.

## Lessons

- Prisma 7 dropped `url` from the `datasource` block. The connection string lives in
  `prisma.config.ts`, and `PrismaClient` needs an explicit `PrismaPg` adapter. `@prisma/client-runtime-utils`
  is a peer the generated client imports. It is not installed transitively, and the
  build fails with 21 module-not-found errors until you add it.
- Lint the generated client out (`src/generated/**` in `eslint.config.mjs`) or ESLint
  reports ~400 errors in code nobody wrote.
- Restart `next dev` after a migration. The running server holds the previously
  generated Prisma client, so a new field fails with "Unknown field … for include
  statement" even though `prisma generate` has run.
- Prisma 7 rejects a nested `select` inside an `include` (`rooms: { include: { items:
  { select: … } } }`). Use `_count`, or include the relation whole.
- Keep Prisma's `omit` on each query that needs it. Setting it on the shared client
  changes inferred payload types throughout the app and breaks unrelated queries.
- `prisma migrate reset` has no `--skip-seed` flag in Prisma 7. Passing it silently
  prints help instead of running. It also refuses to run for an agent without
  `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`; ask the user rather than routing around it.
- Vitest 4 fails a test when a module mock is left with a persistently throwing
  `mockImplementation`, even if the code under test catches it. Use
  `mockImplementationOnce` to scope the throw to the call it is meant for.
- `prisma migrate dev` aborts non-interactively whenever it has a warning to confirm,
  such as adding a unique index. Hand-write the migration SQL and `prisma migrate deploy`.
- Turbopack caches Tailwind's generated CSS in `.next` in a way that survives a dev
  server restart. If a class you just wrote has no effect, `rm -rf .next` before
  debugging the config; check a production build first, which regenerates from scratch.
- Next sets its own `Cache-Control` on dynamic routes and it overrides both
  `next.config.ts` headers and anything the proxy sets.
- Supabase's session pooler (port 5432) caps the whole project at 15 clients, and a
  Fluid Compute instance holds its own pg pool, so a couple of warm instances take every
  slot and pages start failing with a digest and no stack. Runtime belongs on the
  transaction pooler (6543). It shows up on the heaviest page first, because Prisma
  issues a query per relation: `/inspections` fires 4, `/inspections/[id]` fires 16.
- Vercel's default function region is `iad1` (Virginia) and the database is in
  Singapore, so without `vercel.json` pinning `regions` to `sin1` every server action
  and every dynamic render crosses the Pacific twice; `/inspections/[id]` at 16 queries
  a render cost 3 to 4 s of pure latency. Check with the `x-vercel-id` response header
  on a dynamic route: it reads `edge::function`, and the function half must be `sin1`.
- A server action that calls `revalidatePath` returns the current page's fresh RSC
  payload in its own response, whatever path it revalidated. That is why the review
  editor and the capture grid update without a `router.refresh()`; add one only for
  changes that never went through an action, such as a queue write on the phone.
- A nullable Prisma `Json?` column needs `Prisma.DbNull` to write SQL NULL. Plain `null`
  is a type error, and `Prisma.JsonNull` writes a JSON null that reads back as a row of
  the wrong shape. `Prisma` has to be a value import, not a type-only one.
- EXIF orientation is applied by both Chromium and WebKit everywhere it could matter:
  `<img>` layout, `naturalWidth`/`naturalHeight`, `drawImage`, and `createImageBitmap`
  in either `imageOrientation` mode. So a canvas re-encode outputs an upright, tagless
  image and no rotation compensation belongs anywhere in this codebase. Verified with a
  probe, not assumed. The gap: `downscale()` returns null for a photo already under
  2048px, so that one goes up with its EXIF intact. Harmless while every consumer is a
  browser; it must lose that early return before anything ever flattens server side.
- Video never goes through a server action or route handler. The browser uploads
  straight to Supabase Storage with a signed URL. A 10-minute walkthrough is far past
  the serverless body cap.
- Released app builds read `/api/v1` responses with required casts (`as int`, `as bool`),
  so removing a response field crashes every installed build that reads it, including
  the ones sitting in store review. Removing AI dropped `newSinceDraft` and an item's
  `editedByHuman` and broke builds 12 to 19 until they were restored. Before removing or
  renaming any response field or route, check the model in the oldest build still on a
  track (`git show <source>:mobile/lib/models/...`, sources are in `mobile/RELEASE.md`)
  and keep a constant in its place until that build is retired.
- The Vercel git integration can stop deploying silently: after `4fb1b31` errored with
  no build log, later pushes to `main` produced no deployment at all. After pushing,
  confirm with `vercel ls` and, if nothing appeared, deploy from a clean `git worktree`
  of the commit with `vercel deploy --prod` (a plain deploy from the repo would upload
  the untracked `.claude/` worktrees).
- The `captures` bucket enforces an allowed MIME list, and `pnpm setup:storage` used to
  return early on an existing bucket, so types added later never reached it: WebP and
  PDF maintenance evidence the app offered were refused by storage with a 415. The script
  now updates an existing bucket. Adding a stored file type means adding it there and
  running it once per environment, production included.
- `@react-pdf/renderer` 4.9 has two silent failure modes, both pinned by
  `src/lib/report-pdf/document.test.tsx`. A `lineHeight` on a page style stops every
  `render` text (page numbers, "continued") and every bottom-anchored fixed element from
  drawing at all. And a component returning a fragment of fixed elements draws only the
  first, which is why the running header and footer are separate components.
- `@react-pdf/hyphenate` ships an ESM-only entry, so anything loading the renderer as
  CommonJS (a plain `tsx` script, Playwright's spec loader) fails with
  `ERR_PACKAGE_PATH_NOT_EXPORTED`. Next and Vitest load it as ESM and are fine; probe the
  document through a Vitest test, not a script.
- Supabase Storage encodes a signed URL's `download` file name twice in
  `Content-Disposition`, so a `#` or `,` reaches the reader's disk as `%23` or `%2C`.
  Report file names are letters, digits, spaces, dots and hyphens only.
- The first PDF drawn in production failed with `Cannot find module .../pdfkit/js/standard-fonts/Helvetica.cjs`.
  pdfkit loads its built-in fonts through its package's `#standard-fonts/*` import alias,
  which Vercel's file tracing cannot follow, and nothing local catches it because local
  runs read `node_modules` directly. Both PDF routes now list the fonts in
  `outputFileTracingIncludes`, as `standard-fonts/**` because every font requires a
  shared chunk in a subfolder (the first fix missed it and failed the same way); a new
  route that draws a PDF needs the same entry. Included files are not traced in turn,
  so to prove a fix, copy only the files in the route's
  `.next/server/app/<route>/route.js.nft.json` to a temp tree and render from there.
- A Shorebird patch compiles the working tree as it is at that moment, not a commit.
  Editing files during a patch build, or another session merging into the shared
  checkout, ships that code to phones. Build patches from a `git worktree` pinned to the
  commit; `mobile/RELEASE.md` has the commands.
- `prisma format` and `dart format` rewrite the whole file, so running either on a file
  with a small edit buries it in hundreds of lines of realignment nobody asked for. Format
  only the lines you wrote, or check `git diff --stat` and redo the edit on a clean copy.
  Never `dart format lib test`: it rewrote 14 untouched files and split one-line `if`
  returns into new `curly_braces_in_flow_control_structures` lints. Name the new files.
- The app never uses Material's `DropdownButton`, `DropdownMenu`, `PopupMenuButton` or
  `showMenu`. Their menu is placed once, in its own overlay, from where the field was;
  in a drawer, tapping the field closes the keyboard, the drawer slides down, and the
  menu floats unstyled and full width above it (the team invite Role on 23 October).
  Use `KiviloSegmentedControl` for a few options or `KiviloSelectField` for a list,
  both in `mobile/lib/ui/kivilo_components.dart`. `test/no_platform_menus_test.dart`
  fails on any of them.
- A web-only look at a feature misses what the Flutter app and the PDF already do. The
  2026-10-18 UX review called photo-to-line linking missing when the app's edit sheet
  and the PDF both had it, and called the list unreachable when the logo links to it.
  Before calling anything missing, grep `mobile/lib` and `src/lib/report-pdf/` too.
