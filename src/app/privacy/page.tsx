import Link from 'next/link'

export const metadata = { title: 'Kivilo privacy policy' }

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-gray-800">
      <Link href="/" className="text-sm text-brand-600 hover:underline">← Kivilo</Link>
      <h1 className="mt-8 text-3xl font-semibold">Privacy policy</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated 11 October 2026</p>

      <p className="mt-6 leading-relaxed">
        Kivilo is operated by NotTooSweetLabs Pte. Ltd. in Singapore. For privacy
        questions, access or correction requests, or help deleting an account, email{' '}
        <a className="text-brand-600 underline" href="mailto:hello@nottoosweetlabs.com">
          hello@nottoosweetlabs.com
        </a>.
      </p>

      <section className="mt-8 space-y-3 leading-relaxed">
        <h2 className="text-xl font-semibold">Information we handle</h2>
        <p>
          To provide property condition reports and maintenance records, we handle
          account names and email addresses; tenancy parties&apos; names, contact details
          and identity information; property addresses, tenancy dates and financial
          terms; photos, narrated video, audio, notes, annotations, inventory entries,
          meter readings and serial numbers; signatures and signing IP addresses; and
          maintenance descriptions, evidence, visits and comments. Optional push
          notifications use a device token and notification history.
        </p>
        <p>
          The mobile app saves unsent captures, pending edits and previously viewed
          inspection data on your device so you can work without a connection. It also
          stores your sign-in session there.
        </p>
      </section>

      <section className="mt-8 space-y-3 leading-relaxed">
        <h2 className="text-xl font-semibold">How we use it</h2>
        <p>
          We use this information to sign users in, preserve and organize evidence,
          draft and review inspections, record signatures, provide private report links,
          compare check-out with check-in, manage maintenance, send account and service
          messages, and handle support and deletion requests.
        </p>
        <p>
          We send inspection content to Google Gemini only after an inspector permits
          AI processing for that inspection. Gemini receives each room&apos;s photos,
          video, narration, notes and property label to draft an inventory. For a
          check-out, it also receives the reviewed check-in and check-out inventories,
          property label and tenancy length to draft a comparison. A person reviews
          these drafts before a report is signed or an assessment is published.
        </p>
      </section>

      <section className="mt-8 space-y-3 leading-relaxed">
        <h2 className="text-xl font-semibold">Service providers and sharing</h2>
        <p>
          Supabase provides authentication, database and private media storage. Its
          primary database, authentication service and media for our project are hosted
          in Singapore. Database backups, where available on our plan, follow the
          selected project region. Support access, service logs and media delivery can
          occur elsewhere. Vercel hosts the web service in a Singapore
          function region, while its platform operations and backups may process data
          in other countries. Resend carries sign-in and service emails and stores
          their content and delivery logs in the United States. Firebase Cloud
          Messaging and Apple Push Notification service route optional mobile
          notifications; Firebase may process data globally.
        </p>
        <p>
          Google&apos;s paid Gemini service may process or cache inspection content
          globally. Under its paid terms, Google does not use that content to improve
          its products, but retains prompts and responses for 55 days for abuse
          monitoring. We keep report media in a private bucket. Anyone who holds a
          private report link can view that report until the inspector revokes the
          link; report photos use expiring signed URLs.
        </p>
      </section>

      <section className="mt-8 space-y-3 leading-relaxed">
        <h2 id="retention" className="text-xl font-semibold">Retention</h2>
        <p>
          We keep signed condition reports, their evidence, signatures, published
          assessments and related tenancy records while needed to provide the parties
          with a reliable handover record, resolve a tenancy claim or dispute, or meet
          another legal or business obligation. We keep unsigned inspections involving
          another party while needed to complete or review their shared handover or
          resolve a related claim. We keep maintenance history and evidence while
          needed to coordinate or verify work or resolve a related claim.
        </p>
        <p>
          We review those purposes when a tenancy ends, when we handle a deletion
          request, and in regular record reviews. When none applies, we delete the
          information or remove its link to an identifiable person. We keep a limited
          record of a deletion request while needed to demonstrate fulfillment or
          resolve a complaint, then remove or de-identify it.
        </p>
        <p>
          Some service-provider copies can remain after deletion from Kivilo&apos;s
          active records. Gemini retains safety logs for 55 days; Resend retains email
          and delivery logs for 30 days on its standard plans, with seven-day backups;
          Supabase&apos;s database backup period depends on its plan. Firebase can keep
          a device installation ID until a separate deletion request is made to it,
          then remove it from live and backup systems within 180 days. Kivilo does not
          currently request that separate deletion when an account is closed.
        </p>
      </section>

      <section className="mt-8 space-y-3 leading-relaxed">
        <h2 className="text-xl font-semibold">Account and device deletion</h2>
        <p>
          Request account deletion in the app&apos;s Settings or on our{' '}
          <Link href="/delete-account" className="text-brand-600 underline">
            account deletion page
          </Link>. If you cannot sign in, email us from your account address. We
          acknowledge requests and aim to complete them within 30 days. When we
          fulfill a request, we remove the sign-in account, contact and identity
          fields, our push-device registration, and account-specific notification
          history. We remove unsigned drafts that belong solely to the requesting
          account and verify that their stored media is removed after outstanding
          upload links expire.
        </p>
        <p>
          Signed reports and unsigned work involving another party may retain your
          name and contributions while the purposes above still apply. Our completion
          email notes that shared records may remain; contact us to ask which of your
          records remain.
        </p>
        <p>
          Signing out or requesting account deletion does not currently erase unsent
          captures, pending edits or previously viewed inspection data from your phone.
          Those files are kept in app storage separately for each account. Clear
          Kivilo&apos;s app storage or uninstall it to remove them from that device;
          doing so permanently discards any evidence that has not uploaded.
        </p>
      </section>

      <p className="mt-10 border-t border-gray-200 pt-6 text-sm">
        Questions about this policy?{' '}
        <Link href="/support" className="text-brand-600 underline">Contact support</Link>.
      </p>
    </main>
  )
}
