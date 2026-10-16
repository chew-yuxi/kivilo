import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { addendumReadScope, currentStakeholder } from '@/lib/auth'
import { addendumView } from '@/lib/addenda'
import { propertyLabel } from '@/lib/format'
import { AddendumSection } from '@/components/addendum-section'
import { AcknowledgeButton } from '@/components/acknowledge-button'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Update to your condition report',
  robots: { index: false, follow: false, nocache: true },
}

const dateFormat = new Intl.DateTimeFormat('en-SG', { dateStyle: 'long', timeZone: 'Asia/Singapore' })

/// Where the "report was updated" email lands. Outside `(app)`, so it reads as a clean
/// document like the shared report, but unlike it there is no bearer token: the reader
/// signs in, and acknowledges as whoever they signed in as. A signed-out visitor is sent
/// to sign in and back here (the proxy does it first; this is the boundary).
export default async function UpdatePage({ params }: PageProps<'/updates/[addendumId]'>) {
  const { addendumId } = await params
  const viewer = await currentStakeholder()
  if (!viewer) redirect(`/login?next=${encodeURIComponent(`/updates/${addendumId}`)}`)

  // Scoped rather than found-then-checked: a draft, someone else's tenancy, and an id
  // that never existed are the same 404.
  const row = await db.reportAddendum.findFirst({
    where: { AND: [{ id: addendumId }, addendumReadScope(viewer.id)] },
    include: {
      acknowledgements: true,
      inspection: {
        select: {
          conductedAt: true,
          tenancy: { include: { property: true, landlord: true, tenant: true } },
        },
      },
    },
  })
  if (!row) notFound()
  const { tenancy, conductedAt } = row.inspection
  const addendum = addendumView(row, tenancy)
  const role = viewer.id === tenancy.landlordId ? 'Landlord' : viewer.id === tenancy.tenantId ? 'Tenant' : null
  const mine = addendum.acknowledgements.find((ack) => ack.role === role)

  return (
    <article className="mx-auto max-w-3xl bg-white p-5 sm:p-10">
      <header className="border-b border-gray-300 pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Kivilo condition report</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Update to the check-in report</h1>
        <p className="mt-1 text-sm text-gray-600">{propertyLabel(tenancy.property)}</p>
        <p className="mt-3 text-sm text-gray-700">
          The check-in report{conductedAt && ` of ${dateFormat.format(conductedAt)}`} was signed by{' '}
          {tenancy.landlord.name} and {tenancy.tenant.name}. Since then the agent has recorded the
          change below. It counts as part of the report once both of you have acknowledged it.
        </p>
      </header>

      <div className="mt-8">
        <AddendumSection addendum={addendum} />
      </div>

      {mine && (
        <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-5 print:hidden">
          {mine.acknowledgedAt ? (
            <p className="text-sm text-emerald-800">You have acknowledged this update.</p>
          ) : (
            <AcknowledgeButton addendumId={addendumId} />
          )}
        </div>
      )}
    </article>
  )
}
