import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { currentStakeholder, signingRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { inspectionHandover } from '@/lib/handover'
import { propertyLabel } from '@/lib/format'
import { reportInclude } from '@/lib/report'
import { ReportDocument } from '@/components/report-document'
import { SignOut } from '@/components/sign-out'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Your tenant handover',
  robots: { index: false, follow: false, nocache: true },
}

/// A QR or emailed URL is only a way to reach this page. Reading the handover still
/// requires the tenant's own verified account, including when the landlord has signed.
export default async function HandoverPage({ params, searchParams }: PageProps<'/handover/[inspectionId]'>) {
  const { inspectionId } = await params
  const { email } = await searchParams
  const invited = typeof email === 'string' ? email : null
  const here = `/handover/${inspectionId}`
  const login = `/login?${new URLSearchParams({ next: here, ...(invited && { email: invited }) })}`
  const viewer = await currentStakeholder()
  if (!viewer) redirect(login)

  let handover = null
  if (await signingRole(inspectionId, viewer.id) === 'TENANT') {
    try {
      handover = await inspectionHandover(inspectionId, viewer.id)
    } catch (error) {
      if (!(error instanceof Error && error.message === 'Report not found')) throw error
    }
  }
  if (!handover) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="text-sm font-semibold">Kivilo</p>
        <h1 className="mt-6 text-lg font-semibold">No tenant handover here</h1>
        <p className="mt-2 text-sm text-gray-600">There is no handover for this account. If your tenancy uses another email address, sign out and sign in with that one.</p>
        <div className="mt-6 flex justify-center"><SignOut email={null} then={login} /></div>
      </main>
    )
  }

  const inspection = await db.inspection.findUniqueOrThrow({ where: { id: inspectionId }, include: reportInclude })
  return (
    <main className="mx-auto max-w-3xl bg-white">
      <header className="space-y-4 border-b border-gray-200 p-5 sm:p-10">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">Kivilo</p>
          <SignOut email={null} then={login} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Your tenant handover</h1>
          <p className="mt-1 text-sm text-gray-600">{propertyLabel(inspection.tenancy.property)}</p>
          <p className="mt-1 text-xs text-gray-500">Signed in as {viewer.email ?? viewer.name}</p>
        </div>
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm">
          {handover.deadline ? (
            <>
              <p className="font-medium">Move-in defect deadline: {handover.deadline}</p>
              <p className="mt-1">Your tenancy has a {handover.windowDays}-day period, counted from its first day. Report anything that was already wrong when you moved in by the end of this date in Singapore.</p>
            </>
          ) : <p>The early move-in defect period is disabled for this tenancy. You can still report repairs in Kivilo.</p>}
          <p className="mt-2 text-xs text-gray-600">The signed check-in stays unchanged. Your dated move-in report is separate and needs the landlord&apos;s acknowledgement before it counts as agreed.</p>
        </div>
        <div className="space-y-2 text-sm">
          <h2 className="font-medium">Report a problem in the app</h2>
          <p>Open Kivilo and sign in with {viewer.email ?? 'the same email as this tenancy'}. Choose this tenancy, open Repairs and report the problem. If it was already present when you moved in, select that option and include photos.</p>
          <div className="flex flex-wrap gap-4 text-brand-700">
            <a href="https://apps.apple.com/app/id6821514302" className="font-medium underline">Get Kivilo for iPhone or iPad</a>
            <a href="https://play.google.com/store/apps/details?id=one.kivilo.kivilo" className="font-medium underline">Get Kivilo for Android</a>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          {inspection.status === 'COMPLETED'
            ? 'Both parties have signed. Your signed PDF is sent separately and is also available below.'
            : 'You have signed. The landlord has not signed yet; your signed PDF will be emailed once both signatures are in.'}
          {' '}<Link href={`/sign/${inspectionId}`} className="text-brand-700 underline">Open the signing page</Link>
        </p>
        <p className="text-sm print:hidden">
          <Link href={`/tenancies/${inspection.tenancyId}/documents`} className="font-medium text-brand-700 underline">Documents</Link>
          <span className="ml-2 text-gray-500">Tenancy agreement and other private files</span>
        </p>
      </header>
      <ReportDocument inspection={inspection} pdfHref={inspection.status === 'COMPLETED' ? `/sign/${inspectionId}/pdf` : null} />
    </main>
  )
}
