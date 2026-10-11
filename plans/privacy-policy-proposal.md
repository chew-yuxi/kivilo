# Kivilo privacy notice — approved text and operating commitments

The company approved this purpose-based notice and the disclosures about processor
retention, overseas processing, Firebase installation IDs and local app storage on
11 October 2026. The public URL is
`https://kivilo.nottoosweetlabs.com/privacy`.

## Public text

**Effective date: 11 October 2026**

Kivilo is operated by NotTooSweetLabs Pte. Ltd. in Singapore. Contact us about
privacy, your account, or a deletion request at **hello@nottoosweetlabs.com**.

We collect the information needed to produce property condition reports and manage
maintenance: account name and email; names and contact details of tenancy parties;
property address, tenancy dates and financial terms; photos, narrated video, audio,
notes, annotations, inventory entries and meter or serial readings; signatures and the
signing IP address; maintenance descriptions, evidence, visits and comments; and the
device token and notification history used for optional push alerts. The mobile app
saves unsent captures and pending edits on your device so work can continue without a
connection. It stores the sign-in session on the device.

We use this information to authenticate users, upload and organize evidence, draft and
review inspections, record signatures, provide private report links, compare check-out
with check-in, manage maintenance, send account and service messages, and handle support
and deletion requests. We do not send inspection content to AI providers until an
inspector grants permission for that inspection. Google Gemini then receives the room's
photos, video, narration, notes and property label to draft its inventory. For a
check-out, Gemini also receives the reviewed check-in and check-out inventories,
property label and tenancy length to draft a comparison. A person reviews AI drafts
before a report is signed or an assessment is published.

Supabase provides authentication, database and private media storage. Its primary
database, authentication and media for our project are hosted in Singapore. Database
backups, where available on our plan, follow the selected project region. Support
access, service logs and media delivery can occur elsewhere.
Vercel hosts the web service in a Singapore function region, while its platform
operations and backups may process data in other countries. Resend carries sign-in
and service emails and stores their content and delivery logs in the United States.
Firebase Cloud Messaging and Apple Push Notification service route optional mobile
notifications; Firebase may process data globally. Google's paid Gemini service may
process or cache inspection content globally. Under its paid terms, Google does not
use that content to improve its products, but retains prompts and responses for 55
days for abuse monitoring.
We do not make the media bucket public. A shared report can be viewed by anyone who
holds its private link; the inspector can revoke that link. Report photos are served
through expiring signed URLs.

**Retention.** We keep signed condition reports, their evidence, signatures,
published assessments, and related tenancy records while needed to provide the
parties with a reliable handover record, resolve tenancy claims or disputes, or meet
another legal or business obligation. We keep unsigned inspections involving another
party while needed to complete or review their shared handover or resolve a related
claim. We keep maintenance history and evidence while needed to coordinate or verify
work or resolve a related claim. We review whether these purposes still apply when a
tenancy ends, when we handle a deletion request, and in regular record reviews; once
none applies, we delete the data or remove its link to an identifiable person.

Working drafts that belong only to a requesting account are removed during account
deletion; their stored media is removed after outstanding upload links expire and
absence is verified. We keep a limited record of the request and its completion
while needed to demonstrate fulfillment or resolve a complaint, then remove or
de-identify it. Some processor copies can outlast deletion from Kivilo's active
records: Gemini's 55-day safety logs, Resend's email and delivery logs (30 days on
its standard plans, with seven-day backups), Supabase's plan-dependent database
backups, and platform security logs. Firebase can retain a device installation ID
until its separate deletion API is called, with removal from live and backup systems
within 180 days after that call; Kivilo does not currently make that call on account
deletion.
On the phone, we remove saved capture files only after their upload and registration
are confirmed. Previously viewed inspection data, unsent captures and pending edits
remain in app storage after sign-out or an account-deletion request, isolated by
account. To remove them from that phone, clear Kivilo's app storage or uninstall it;
doing so permanently discards any unsent evidence.

You can request account deletion in **Settings** or at
`https://kivilo.nottoosweetlabs.com/delete-account`; if you cannot sign in, email us
from your account address. We acknowledge the request and aim to complete it within
30 days. On fulfillment, we remove the Supabase sign-in account, account contact and
identity fields, device push registrations, and account-specific notification history.
We remove unsigned inspections only when the requester conducted them and is every
party on the tenancy. Signed reports and unsigned records involving another party may
retain the requester's name and contributions while the purposes above still apply.
The completion email notes that shared records may remain under this policy; contact
us to ask which of your records remain.
Contact us to ask for access, correction, or more information about your data.

## Approved operating commitments

1. The company approved retaining signed reports, evidence, signatures, assessments,
   shared unsigned work and maintenance/tenancy records only while a stated purpose
   applies. The code has no automatic expiry for these records. The owner will review
   completed tenancies, retained shared records and completed deletion-request logs at
   least quarterly, document the ongoing purpose, then delete or de-identify records
   when no purpose remains.
2. The company owner will check the deletion queue and run the Storage purge worker
   daily, and fulfill deletion requests within 30 days. A request can remain PROCESSING
   while signed upload URLs expire and deleted-room Storage prefixes are verified empty.
   `vercel.json` schedules only the notification outbox; these reviews and purges are
   manual operational duties. `hello@nottoosweetlabs.com` is monitored for Kivilo.
3. The company accepted the explicit notice that sign-out and deletion requests do
   not erase account-isolated unsent captures, pending edits or read caches on a phone,
   and that Kivilo does not currently request Firebase installation-ID deletion. The
   operator removes Kivilo's push registration during server-side fulfillment.
4. The company reports its Gemini project is Tier 1 postpay and the corresponding key
   was saved in Vercel Production. The owner remains responsible for confirming
   processor agreements and cross-border safeguards, plus the exact production
   Supabase backup and Resend plans; this notice makes no unsupported plan claim.

## Code evidence

This draft is based on `prisma/schema.prisma`, `src/lib/inspection/extract.ts`,
`src/lib/inspection/diff.ts`, `src/lib/ai-consent.ts`, `src/lib/storage.ts`,
`src/app/reports/[token]/page.tsx`, `scripts/fulfill-account-deletion.ts`,
`scripts/purge-storage.ts`, `mobile/lib/services/capture_store.dart`, and
`mobile/lib/screens/settings_screen.dart`. Processor locations and retention above
are based on current official notices:

- Supabase: https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq
- Vercel: https://vercel.com/legal/dpa
- Resend: https://resend.com/security/gdpr
- Firebase: https://firebase.google.com/support/privacy/
- Gemini: https://ai.google.dev/gemini-api/terms and
  https://ai.google.dev/gemini-api/docs/usage-policies

This draft does not assert an unverified exact Supabase backup plan, Apple Push
Notification retention, or region-limited processing by any provider.
