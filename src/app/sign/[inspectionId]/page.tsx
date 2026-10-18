import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { currentStakeholder, signingRole } from '@/lib/auth'
import { signOwnReport } from '@/lib/actions'
import { reportInclude } from '@/lib/report'
import { reportFingerprint, shortFingerprint } from '@/lib/report-fingerprint'
import { ReportDocument } from '@/components/report-document'
import { SignatureCanvas } from '@/components/signature-pad'
import { SignOut } from '@/components/sign-out'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Review and sign',
  robots: { index: false, follow: false, nocache: true },
}

/// Where the "please review and sign" email lands. The link is not a credential: it
/// names the report and suggests an address, and the visitor must sign in as the
/// landlord or tenant before seeing anything. Outside `(app)`, like a shared report, so
/// it is a document with no install prompt or upload queue.
export default async function SignPage({ params, searchParams }: PageProps<'/sign/[inspectionId]'>) {
  const { inspectionId } = await params
  const { email } = await searchParams
  const invited = typeof email === 'string' ? email : null
  const here = `/sign/${inspectionId}`
  const login = `/login?${new URLSearchParams({ next: here, ...(invited && { email: invited }) })}`

  const signer = await currentStakeholder()
  if (!signer) redirect(login)

  const role = await signingRole(inspectionId, signer.id)
  // Someone else's report, one not yet sent, and one that never existed all read the
  // same, so the page cannot be used to find out which ids are real.
  if (!role) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <Brand />
        <h1 className="mt-6 text-lg font-semibold">Nothing to sign here</h1>
        <p className="mt-2 text-sm text-gray-600">
          There is no report waiting for {signer.email ?? 'this account'}. If the email was
          sent to a different address, sign out and sign in with that one.
        </p>
        <div className="mt-6 flex justify-center">
          <SignOut email={null} then={login} />
        </div>
      </div>
    )
  }

  const inspection = await db.inspection.findUniqueOrThrow({
    where: { id: inspectionId },
    include: reportInclude,
  })
  const { tenancy } = inspection
  const mine = inspection.signatures.find((signature) => signature.stakeholderId === signer.id)
  const other = role === 'LANDLORD' ? tenancy.tenant : tenancy.landlord
  const awaitingMe = inspection.status === 'AWAITING_SIGNATURE' && !mine
  const kind = inspection.kind === 'CHECK_OUT' ? 'check-out' : 'check-in'
  const roleLabel = role === 'LANDLORD' ? 'landlord' : 'tenant'

  return (
    <div className="mx-auto max-w-3xl">
      <header className="flex items-center justify-between gap-4 px-5 pt-5 sm:px-10 print:hidden">
        <Brand />
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="truncate">Signed in as {signer.email ?? signer.name}</span>
          <SignOut email={null} then={login} />
        </div>
      </header>

      <div className="mx-5 mt-5 rounded-lg border px-4 py-3 text-sm sm:mx-10 print:hidden">
        {awaitingMe && (
          <p>
            <span className="font-medium">Awaiting your signature.</span> This {kind} report
            has been sent to you to sign as {roleLabel}. Read it through, then sign at the end.
          </p>
        )}
        {inspection.status === 'AWAITING_SIGNATURE' && mine && (
          <p>
            <span className="font-medium">You signed</span> on{' '}
            {mine.signedAt.toLocaleString('en-SG')}. Waiting for {other.name} to sign; once
            they have, we will email you the signed report as a PDF.
          </p>
        )}
        {inspection.status === 'COMPLETED' && (
          <p>
            <span className="font-medium">Completed.</span> Both parties have signed this
            report{signer.email ? ', and the signed PDF has been emailed to you' : ''}. You
            can also download it here.
          </p>
        )}
      </div>

      {role === 'TENANT' && mine && inspection.kind === 'CHECK_IN' && (
        <p className="mx-5 mt-4 text-sm sm:mx-10 print:hidden">
          <Link href={`/handover/${inspectionId}`} className="font-medium text-brand-700 underline">Your handover and move-in defect deadline</Link>
        </p>
      )}

      <ReportDocument
        inspection={inspection}
        pdfHref={inspection.status === 'COMPLETED' ? `${here}/pdf` : null}
      />

      {awaitingMe && (
        <section className="space-y-3 px-5 pb-12 sm:px-10 print:hidden">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Your signature</h2>
          <p className="text-sm text-gray-600">
            By signing you agree that this report records the property as it was inspected.
            Your signature records the report&apos;s content fingerprint,{' '}
            <span className="font-mono">{shortFingerprint(await reportFingerprint(db, inspectionId))}</span>,
            so any later copy can be checked against what you signed.
          </p>
          <SignatureCanvas
            label={
              <>
                {signer.name} <span className="font-normal text-gray-500">({roleLabel})</span>
              </>
            }
            onSign={signOwnReport.bind(null, inspectionId)}
          />
        </section>
      )}
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center justify-center gap-2">
      <span className="size-2.5 rounded-full bg-brand-500" />
      <span className="text-sm font-semibold tracking-tight">Kivilo</span>
    </div>
  )
}
