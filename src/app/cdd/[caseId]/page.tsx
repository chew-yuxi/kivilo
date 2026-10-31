import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { currentStakeholder } from '@/lib/auth'
import { caseForClient } from '@/lib/cdd/cases'
import { createDownloadUrl } from '@/lib/storage'
import { CddParticularsForm } from '@/components/cdd-particulars-form'
import { SignOut } from '@/components/sign-out'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Verify your identity',
  robots: { index: false, follow: false, nocache: true },
}

/// Where a client fills in their CEA due-diligence particulars, from the agent's email or
/// WhatsApp link. Like `/sign`, the link is not a credential: the visitor signs in as
/// themselves first. Outside `(app)`, so there is no install prompt or upload queue. It
/// says only whether the form is still wanted, never anything about screening.
export default async function ParticularsPage({ params, searchParams }: PageProps<'/cdd/[caseId]'>) {
  const { caseId } = await params
  const { email } = await searchParams
  const invited = typeof email === 'string' ? email : null
  const here = `/cdd/${caseId}`
  const login = `/login?${new URLSearchParams({ next: here, ...(invited && { email: invited }) })}`

  const client = await currentStakeholder()
  if (!client) redirect(login)

  const found = await caseForClient(caseId, client.id).catch((error: Error) => {
    if (error.message === 'Case not found') return null
    throw error
  })
  const logoUrl = found?.logoPath ? await createDownloadUrl(found.logoPath, 60 * 60) : null
  const requestedBy = found && [found.agentName, found.agencyName].filter(Boolean).join(', ')

  return (
    <main className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 pb-12 pt-8">
        {found && (
          <header className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- a signed storage URL
              <img src={logoUrl} alt="" className="size-12 shrink-0 rounded-xl object-contain" />
            ) : (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-lg font-bold text-brand-700">
                {(found.agencyName ?? found.agentName).charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-900">{found.agencyName ?? found.agentName}</p>
              <p className="truncate text-sm text-gray-500">
                {[found.agencyName && found.agentName, found.ceaRegistration && `CEA ${found.ceaRegistration}`, found.agencyLicence && `Licence ${found.agencyLicence}`]
                  .filter(Boolean)
                  .join(' · ') || 'Property agent'}
              </p>
            </div>
          </header>
        )}

        {!found ? (
          <section className="mt-2">
            <Brand />
            <h1 className="mt-8 text-2xl font-bold text-gray-900">Nothing to fill in here</h1>
            <p className="mt-2 text-gray-600">
              There is no request waiting for {client.email ?? 'this account'}. If the email was sent
              to a different address, sign out and sign in with that one.
            </p>
            <div className="mt-6">
              <SignOut email={null} then={login} />
            </div>
          </section>
        ) : found.submitted ? (
          <section className="mt-10 text-center">
            <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-green-50 ring-8 ring-green-50/60">
              <svg viewBox="0 0 24 24" aria-hidden className="size-10 text-green-700" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
            </span>
            <h1 className="mt-6 text-2xl font-bold text-gray-900">Details sent</h1>
            <p className="mx-auto mt-2 max-w-sm text-gray-600">
              {found.agentName} will check them before your rental goes ahead. There is nothing
              more for you to do.
            </p>
            <dl className="mt-8 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white px-4 text-left text-sm">
              <Fact label="Reference" value={found.reference} mono />
              {found.submittedAt && (
                <Fact
                  label="Sent"
                  value={found.submittedAt.toLocaleString('en-SG', { timeZone: 'Asia/Singapore', dateStyle: 'medium', timeStyle: 'short' })}
                />
              )}
              <Fact label="Sent to" value={requestedBy!} />
              {found.property && <Fact label="Property" value={found.property} />}
            </dl>
            <p className="mt-6 text-sm text-gray-500">Keep the reference if you need to contact {found.agentName} about this.</p>
          </section>
        ) : (
          <section>
            <h1 className="mt-8 text-2xl font-bold text-gray-900">Verify your identity</h1>
            {found.correction && (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
                <span className="font-semibold">{found.agentName} needs you to send your details again.</span>{' '}
                {found.correction.replace(/\.$/, '')}.
              </p>
            )}
            <p className="mt-2 text-gray-600">
              {found.agentName} is your agent{found.property ? ` for ${found.property}` : ''}, acting for you as
              the {found.clientRole === 'LANDLORD' ? 'landlord' : 'tenant'}. Singapore law requires property
              agents to verify who their clients are before a deal. It takes about three minutes.
            </p>
            <ul className="mt-5 grid grid-cols-3 gap-2 text-center text-xs text-gray-600">
              <Trust icon="lock" text="Your ID number is encrypted" />
              <Trust icon="eye" text="Only its last 4 characters are ever shown" />
              <Trust icon="shield" text="Kept 5 years, as the law requires" />
            </ul>
            <div className="mt-6">
              <CddParticularsForm caseId={found.id} agentName={found.agentName} />
            </div>
            <p className="mt-6 text-center text-xs text-gray-400">
              Signed in as {client.email ?? client.name}. Renting as a company? Ask {found.agentName} to
              complete this with you.
            </p>
          </section>
        )}
        <footer className="mt-10 flex justify-center">
          <Brand muted />
        </footer>
      </div>
    </main>
  )
}

function Brand({ muted = false }: { muted?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${muted ? 'text-gray-400' : 'text-gray-900'}`}>
      <span className="size-2.5 rounded-full bg-brand-500" />
      <span className="text-sm font-semibold tracking-tight">{muted ? 'Secured by Kivilo' : 'Kivilo'}</span>
    </div>
  )
}

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`text-right font-medium text-gray-900 ${mono ? 'font-mono tracking-wide' : ''}`}>{value}</dd>
    </div>
  )
}

const ICONS = {
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z',
  eye: 'M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  shield: 'M12 3 5 6v5.5c0 4.5 3 8 7 9.5 4-1.5 7-5 7-9.5V6zM9 12l2 2 4-4',
}

function Trust({ icon, text }: { icon: keyof typeof ICONS; text: string }) {
  return (
    <li className="flex flex-col items-center gap-2 rounded-xl bg-white px-2 py-3 ring-1 ring-gray-200">
      <svg viewBox="0 0 24 24" aria-hidden className="size-5 text-brand-600" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d={ICONS[icon]} />
      </svg>
      <span className="leading-snug">{text}</span>
    </li>
  )
}
