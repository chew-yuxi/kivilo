import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { addendumReadScope, currentStakeholder } from '@/lib/auth'
import { addendumView } from '@/lib/addenda'
import { propertyLabel } from '@/lib/format'
import { AddendumSection } from '@/components/addendum-section'
import { AcknowledgeButton } from '@/components/acknowledge-button'
import { MoveInDefectResponse } from '@/components/move-in-defect-response'
import { formatDate, messages } from '@/lib/i18n'
import { requestLocale } from '@/lib/i18n/request'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: messages(await requestLocale(await currentStakeholder())).web.updates.pageTitle,
    robots: { index: false, follow: false, nocache: true },
  }
}

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
          checkOut: { select: { status: true } },
          tenancy: { include: { property: true, landlord: true, tenant: true } },
        },
      },
    },
  })
  if (!row) notFound()
  const locale = await requestLocale(viewer)
  const m = messages(locale)
  const w = m.pwa
  const words = m.web.updates
  const { tenancy, conductedAt } = row.inspection
  const addendum = addendumView(row, tenancy)
  const role = viewer.id === tenancy.landlordId ? w.landlord : viewer.id === tenancy.tenantId ? w.tenant : null
  const mine = addendum.acknowledgements.find((ack) => ack.role === role)
  const isMoveInDefect = addendum.source === 'MOVE_IN_DEFECT'
  const checkOutComplete = row.inspection.checkOut?.status === 'COMPLETED'

  return (
    <article className="mx-auto max-w-3xl bg-white p-5 sm:p-10">
      <header lang={locale} className="border-b border-gray-300 pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">{words.eyebrow}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {isMoveInDefect ? words.moveInTitle : words.updateTitle}
        </h1>
        <p className="mt-1 text-sm text-gray-600">{propertyLabel(tenancy.property)}</p>
        <p className="mt-3 text-sm text-gray-700">
          {words.signedBy(
            conductedAt && formatDate(m, conductedAt, { dateStyle: 'long' }),
            tenancy.landlord.name,
            tenancy.tenant.name,
          )}{' '}
          {isMoveInDefect ? words.moveInBody : words.updateBody}
        </p>
      </header>

      <div className="mt-8">
        <AddendumSection addendum={addendum} />
      </div>

      {/* Anyone else the read scope admits is the deal's agent or a teammate, on whose
          device a party who is present acknowledges in person. */}
      {!role && !isMoveInDefect && addendum.acknowledgements.filter((ack) => !ack.acknowledgedAt).map((ack) => (
        <div key={ack.role} lang={locale} className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-5 print:hidden">
          <AcknowledgeButton
            addendumId={addendumId}
            inPerson={{ stakeholderId: ack.stakeholderId, name: ack.name, role: m.party[ack.role === 'Landlord' ? 'LANDLORD' : 'TENANT'] }}
            locale={locale}
          />
        </div>
      ))}

      {mine && !isMoveInDefect && (
        <div lang={locale} className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-5 print:hidden">
          {mine.acknowledgedAt ? (
            <p className="text-sm text-emerald-800">{words.acknowledged}</p>
          ) : (
            <AcknowledgeButton addendumId={addendumId} locale={locale} />
          )}
        </div>
      )}
      {isMoveInDefect && role === 'Landlord' && !addendum.acknowledgedAt && !addendum.dispute && (
        <div lang={locale} className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-5 print:hidden">
          {checkOutComplete
            ? <p className="text-sm text-gray-700">{words.checkOutSigned}</p>
            : <MoveInDefectResponse addendumId={addendumId} locale={locale} />}
        </div>
      )}
    </article>
  )
}
