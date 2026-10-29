import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { currentStakeholder } from '@/lib/auth'
import { caseForClient } from '@/lib/cdd/cases'
import { CddParticularsForm } from '@/components/cdd-particulars-form'
import { SignOut } from '@/components/sign-out'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your details for your rental',
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

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <div className="flex items-center gap-2">
        <span className="size-2.5 rounded-full bg-brand-500" />
        <span className="text-sm font-semibold tracking-tight">Kivilo</span>
      </div>
      {!found ? (
        <>
          <h1 className="mt-6 text-lg font-semibold">Nothing to fill in here</h1>
          <p className="mt-2 text-sm text-gray-600">
            There is no request waiting for {client.email ?? 'this account'}. If the email was sent
            to a different address, sign out and sign in with that one.
          </p>
          <div className="mt-6">
            <SignOut email={null} then={login} />
          </div>
        </>
      ) : found.submitted ? (
        <>
          <h1 className="mt-6 text-lg font-semibold">Thank you</h1>
          <p className="mt-2 text-sm text-gray-600">
            Your details have been sent to {found.agentName}. There is nothing more to do here.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-6 text-lg font-semibold">Your details for your rental</h1>
          <p className="mt-2 text-sm text-gray-600">
            {found.agentName} is your property agent for this rental, as the {found.clientRole === 'LANDLORD' ? 'landlord' : 'tenant'}.
            Agents in Singapore must confirm who their clients are before a deal, under the
            Council for Estate Agencies’ rules. Enter your details exactly as on your ID.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Your ID number is encrypted, and only its last four characters are ever shown. If you
            are renting as a company, ask {found.agentName} to complete this with you.
          </p>
          <div className="mt-6">
            <CddParticularsForm caseId={found.id} />
          </div>
          <p className="mt-6 text-xs text-gray-400">Signed in as {client.email ?? client.name}</p>
        </>
      )}
    </div>
  )
}
