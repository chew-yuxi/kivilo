import Link from 'next/link'
import type { Metadata } from 'next'
import { FREE_ACTIVE_PROPERTIES, FREE_CLIENT_CHECKS } from '@/lib/plan-limits'

export const metadata: Metadata = {
  title: 'Terms of service | Kivilo',
  description:
    'The terms for using Kivilo: accounts, condition reports and signatures, client checks, plans and payment, and responsibilities.',
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: true },
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-gray-800">
      <Link href="/" className="text-sm text-brand-600 hover:underline">← Kivilo</Link>
      <h1 className="mt-8 text-3xl font-semibold">Terms of service</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated 1 November 2026</p>

      <p className="mt-6 leading-relaxed">
        These terms are an agreement between you and NotTooSweetLabs Pte. Ltd., the Singapore
        company that operates Kivilo (&ldquo;we&rdquo;). By creating an account or using Kivilo,
        including signing a report or sending your details through it, you agree to them. Our{' '}
        <Link href="/privacy" className="text-brand-600 underline">privacy policy</Link> explains
        how we handle personal data.
      </p>

      <Section title="What Kivilo is">
        <p>
          Kivilo helps property agents, landlords and tenants record a property&apos;s condition,
          agree and sign condition reports, manage repairs and supporting documents, and carry out
          client checks. We provide the tools. We are not a party to any tenancy, we do not act as
          anyone&apos;s agent, and we never hold or move deposits or rent. Nothing in Kivilo is
          legal, financial or compliance advice.
        </p>
      </Section>

      <Section title="Your account">
        <p>
          You sign in with a code sent to your email address. Keep access to that address secure,
          because whoever can read it can sign in as you, and you are responsible for what is done
          in your account. You must be at least 18. Agents must hold the registration or licence the
          law requires for the work they do in Kivilo.
        </p>
      </Section>

      <Section title="Reports and signatures">
        <p>
          A condition report records what the people preparing it saw and wrote. The agent or other
          person who prepares a report is responsible for its accuracy. When a report is sent for
          signature its content is frozen, and each signature is recorded with a fingerprint of that
          content, the signer and the time. You agree that signing in Kivilo is your electronic
          signature and is as valid as signing on paper. Updates after signing are made as dated
          addenda, never by changing the signed report.
        </p>
      </Section>

      <Section title="Client checks (CEA due diligence)">
        <p>
          Kivilo helps estate agents meet the customer due diligence rules of the Council for
          Estate Agencies. It collects a client&apos;s particulars, screens them against the United
          Nations Security Council Consolidated List, the First Schedule of the Terrorism
          (Suppression of Financing) Act and a politically exposed persons database, and keeps a
          record of the agent&apos;s decisions.
        </p>
        <p>
          The agent and their agency remain responsible for their legal obligations, including
          verifying identity, deciding whether a possible match is the client, assessing risk,
          keeping records, and reporting suspicious transactions to the authorities. Kivilo does
          not report to the authorities on anyone&apos;s behalf. Screening sources can be
          incomplete or out of date, and name matching can miss a listed person or flag someone
          who is not. Review every result yourself.
        </p>
        <p>
          When you use client checks for your clients, we process their particulars on your behalf
          and only to provide the check. You must have a lawful basis to collect them, tell your
          clients how their data is used, and not use Kivilo to tell anyone that they have been
          screened or reported.
        </p>
      </Section>

      <Section title="Your content and data">
        <p>
          You keep ownership of the photos, notes, documents and other content you add. You give us
          permission to store, process and display it as needed to run Kivilo for you and the people
          you share it with. You must have the right to upload what you add, including other
          people&apos;s personal data, and have given any notice or obtained any consent the law
          requires for it.
        </p>
      </Section>

      <Section title="Plans and payment">
        <p>
          The Free plan includes up to {FREE_ACTIVE_PROPERTIES} active properties and{' '}
          {FREE_CLIENT_CHECKS} client checks per agent. Pro is charged per agent seat each month.
          Plans bought on our website are paid through Stripe; plans bought in the app are paid
          through Google Play or the Apple App Store, under their terms. A plan renews until it is
          cancelled where it was bought, and stays active until the end of the paid period. Fees
          are not refundable except where the law or the store&apos;s policy requires. We will give
          notice before changing the price of a plan you pay for.
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>
          Do not use Kivilo to break the law, to record or share anyone&apos;s personal data without
          the right to, to mislead anyone about a property&apos;s condition, or to harass anyone. Do
          not try to access accounts, reports or data that are not yours, test or bypass our
          security, overload the service, or copy it by scraping or reverse engineering.
        </p>
      </Section>

      <Section title="Availability and changes">
        <p>
          We work to keep Kivilo available and your records safe, but it may sometimes be
          unavailable, and we may change or remove features. The mobile app keeps unsent captures
          on your device until they upload.
        </p>
      </Section>

      <Section title="Suspension and ending">
        <p>
          You can stop using Kivilo at any time and ask to{' '}
          <Link href="/delete-account" className="text-brand-600 underline">delete your account</Link>.
          We may suspend or close an account that breaks these terms or puts others at risk. Records
          shared with other people, and records the law requires us or an agent to keep, can remain
          after an account ends, as our privacy policy explains.
        </p>
      </Section>

      <Section title="Liability">
        <p>
          Kivilo is provided as it is. To the extent the law allows, we are not liable for indirect
          or consequential loss, lost profits, or loss arising from the content you or others add,
          and our total liability to you for any claim is limited to the fees you paid us in the 12
          months before it arose. Nothing in these terms limits liability that cannot be limited by
          law, including for death or personal injury caused by negligence, or for fraud.
        </p>
      </Section>

      <Section title="Changes to these terms">
        <p>
          We may update these terms. We will show the date of the latest version here and tell
          account holders by email or in the app before a significant change takes effect.
          Continuing to use Kivilo after that means you accept the updated terms.
        </p>
      </Section>

      <Section title="Law">
        <p>
          These terms are governed by the laws of Singapore, and the courts of Singapore have
          jurisdiction over any dispute about them.
        </p>
      </Section>

      <p className="mt-10 border-t border-gray-200 pt-6 text-sm">
        Questions about these terms? Email{' '}
        <a className="text-brand-600 underline" href="mailto:hello@nottoosweetlabs.com">hello@nottoosweetlabs.com</a>{' '}
        or <Link href="/support" className="text-brand-600 underline">contact support</Link>.
      </p>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 space-y-3 leading-relaxed">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  )
}
