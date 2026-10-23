import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAgent } from '@/lib/auth'
import { propertyOverview } from '@/lib/property-work'
import { StatusBadge } from '@/components/status-badge'
import { PropertyStagePill } from '@/components/property-stage-pill'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Property' }

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' })

/// Everything at one address the viewer works, as the app's property page: every term's
/// reports, newest first, and the way to its documents, history and settings.
export default async function PropertyPage({ params }: PageProps<'/properties/[id]'>) {
  const agent = await requireAgent()
  const { id } = await params
  let property
  try {
    property = await propertyOverview(id, agent.id)
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) notFound()
    throw error
  }
  const current = property.terms[0]

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link href="/properties" className="text-link inline-flex min-h-11 items-center text-sm">
          ← Properties
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight break-words">{property.address}</h1>
        <p className="mt-1 text-sm text-gray-500">{current.tenant} · {current.agencyName ?? 'Personal'}</p>
        <div className="mt-3">
          <PropertyStagePill stage={property.stage} label={property.stageLabel} />
        </div>
        {property.nextInspectionId && property.state !== 'TRASHED' && (
          <Link href={`/inspections/${property.nextInspectionId}`} className="action-primary mt-4 flex w-full sm:inline-flex sm:w-auto">
            Open {property.nextInspectionKind === 'CHECK_OUT' ? 'check-out' : 'check-in'}
          </Link>
        )}
      </div>

      {property.terms.map((term) => (
        <section key={term.tenancyId} aria-label={term === current ? 'Current tenancy' : 'Earlier tenancy'}>
          <h2 className="font-semibold">{term === current ? 'Current tenancy' : 'Earlier tenancy'}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {term.tenant} · {shortDate(term.startDate)} to {shortDate(term.endDate)}
            {term.leadAgentName && ` · ${term.leadAgentName}`}
          </p>
          <ul className="mt-3 divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white">
            {term.reports.map((report) => (
              <li key={report.id}>
                <Link href={`/inspections/${report.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50">
                  <span className="min-w-0 flex-1 text-sm font-medium">
                    {report.kind === 'CHECK_IN' ? 'Check-in' : 'Check-out'}
                  </span>
                  <StatusBadge status={report.status} />
                  <span aria-hidden="true" className="text-xl text-gray-500">›</span>
                </Link>
              </li>
            ))}
          </ul>
          {term.canOpenDocuments && (
            <Link href={`/tenancies/${term.tenancyId}/documents`} className="action-secondary mt-3 flex w-full sm:inline-flex sm:w-auto">
              Documents
            </Link>
          )}
        </section>
      ))}

      <section aria-label="More">
        <h2 className="font-semibold">More</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <Link href={`/properties/${property.id}/history`} className="action-secondary">History</Link>
          <Link href={`/properties/${property.id}/settings`} className="action-secondary">Settings and danger zone</Link>
        </div>
      </section>
    </div>
  )
}
