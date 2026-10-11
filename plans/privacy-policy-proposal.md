# Kivilo privacy notice — company review draft

**Do not publish this draft.** The choices under “Company decisions” must be approved,
the deletion operator and Storage purge must be operational, and the final notice must
match the released app and configured processors. The proposed public URL is
`https://kivilo.nottoosweetlabs.com/privacy`.

## Proposed public text

**Effective date: [approve date]**

Kivilo is operated by NotTooSweetLabs Pte. Ltd. in Singapore. Contact us about
privacy, your account, or a deletion request at **hello@nottoosweetlabs.com**
[confirm this mailbox is monitored for Kivilo].

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
check-out, Anthropic Claude receives the reviewed check-in and check-out inventory and
property label to draft a comparison. A person reviews AI drafts before a report is
signed or an assessment is published.

Supabase provides authentication, database and private media storage. Vercel hosts the
web service. Resend carries sign-in and service emails. Firebase Cloud Messaging and
Apple Push Notification service route optional mobile notifications. Google and
Anthropic process the inspection content described above only after that inspection's
AI permission is granted. These providers may process information outside Singapore
[confirm provider regions, contracts and transfer safeguards]. We do not make the media
bucket public. A shared report can be viewed by anyone who holds its private link;
the inspector can revoke that link. Report photos are served through expiring signed
URLs.

**Retention.** We retain signed condition reports, their evidence, signatures,
published assessments, and related tenancy records for **[approved period and start
event]** because they document a record shared by the parties. We retain unsigned
inspections involving another party for **[approved period and start event]** and
maintenance history and evidence for **[approved period and start event]**. Working
drafts that belong only to a requesting account are removed during account deletion;
their stored media is removed after outstanding upload links have expired and absence
has been verified. We retain deletion-request status records for **[approved period]**
and service logs and backups according to **[approved schedules]**. Unsent captures
and edits remain on the device until uploaded or removed from that device [approve
precise local-data instructions].

You can request account deletion in **Settings** or at
`https://kivilo.nottoosweetlabs.com/delete-account`; if you cannot sign in, email us
from your account address. We acknowledge the request and aim to complete it within
30 days. On fulfillment, we remove the Supabase sign-in account, account contact and
identity fields, device push registrations, and account-specific notification history.
We remove unsigned inspections only when the requester conducted them and is every
party on the tenancy. Signed reports and unsigned records involving another party may
retain the requester's name and contributions for the periods above; we will explain
what was retained when confirming completion [approve the exact retained-data notice].
Contact us to ask for access, correction, or more information about your data.

## Company decisions before publication

1. Approve the legal basis and exact retention period/trigger for signed inventories,
   source media, signatures, and immutable published assessments. The code currently
   has no automatic expiry for these records.
2. Approve retaining **all shared unsigned work**, including an agent's draft where
   landlord or tenant is someone else, and its identifiable party names and media;
   set its expiry. The deletion script intentionally does not erase these records.
3. Set maintenance-history/evidence and property/tenancy retention, including records
   contributed by someone whose account is deleted.
4. Set a purge period for completed `AccountDeletionRequest` audit rows and specify
   backup, log and processor retention. The current operator leaves request metadata
   indefinitely, and provider-side schedules have not been verified.
5. Confirm processor agreements, international transfers, AI-provider data-use terms,
   and which contact acts as the company's privacy point of contact. Confirm
   `hello@nottoosweetlabs.com` accepts Kivilo mail.
6. Approve the precise on-device cleanup statement: the app currently isolates local
   captures by account and removes a capture after confirmed handover, but does not
   automatically erase pending local captures when an account is deleted or signs out.
7. Assign an operator and monitor deletion due dates and the Storage purge worker.
   `vercel.json` schedules the notification outbox only. Without an operator, the
   public 30-day promise is not yet operationally verified.

## Code evidence

This draft is based on `prisma/schema.prisma`, `src/lib/inspection/extract.ts`,
`src/lib/inspection/diff.ts`, `src/lib/ai-consent.ts`, `src/lib/storage.ts`,
`src/app/reports/[token]/page.tsx`, `scripts/fulfill-account-deletion.ts`,
`scripts/purge-storage.ts`, `mobile/lib/services/capture_store.dart`, and
`mobile/lib/screens/settings_screen.dart`. It does not assert unverified processor
retention, training, encryption, or regional promises.
