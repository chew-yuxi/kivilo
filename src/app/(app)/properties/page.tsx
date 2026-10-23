import Link from 'next/link'
import { requireAgent } from '@/lib/auth'
import { propertyWork, type PropertyStage } from '@/lib/property-work'
import { dueRenewals } from '@/lib/renewals'
import { RenewalCards } from '@/components/renewal-cards'
import { PropertyStagePill } from '@/components/property-stage-pill'
import { chosenWorkspace, WorkspaceSection } from '@/components/workspace-section'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Properties' }

/// The same filters as the app's Properties tab. Stage filters narrow the active list;
/// Archived and Recently deleted are lists of their own.
const filters = [
  { key: 'all', label: 'All' },
  { key: 'in-progress', label: 'In progress', stages: ['CHECK_IN_IN_PROGRESS', 'CHECK_OUT_IN_PROGRESS'] },
  { key: 'awaiting', label: 'Awaiting signatures', stages: ['CHECK_IN_AWAITING', 'CHECK_OUT_AWAITING'] },
  { key: 'check-out-due', label: 'Check-out due', stages: ['CHECK_OUT_DUE'] },
  { key: 'running', label: 'Running', stages: ['RUNNING'] },
  { key: 'ended', label: 'Ended', stages: ['ENDED'] },
  { key: 'archived', label: 'Archived', state: 'archived' },
  { key: 'trash', label: 'Recently deleted', state: 'trash' },
] as const satisfies readonly { key: string; label: string; stages?: PropertyStage[]; state?: 'archived' | 'trash' }[]

const longDate = (iso: string) => new Date(iso).toLocaleDateString('en-SG', { dateStyle: 'long', timeZone: 'Asia/Singapore' })

export default async function PropertiesPage({ searchParams }: PageProps<'/properties'>) {
  const agent = await requireAgent()
  const query = await searchParams
  const chosen = await chosenWorkspace(agent.id, query.workspace)
  const filter = filters.find((option) => option.key === query.filter) ?? filters[0]
  const search = typeof query.q === 'string' ? query.q.trim() : ''
  const state = 'state' in filter ? filter.state : 'active'
  const [rows, renewals] = await Promise.all([
    propertyWork(agent.id, { ...chosen.filters, state }),
    dueRenewals(agent.id, new Date(), chosen.filters),
  ])
  const needle = search.toLowerCase()
  const properties = rows.filter((row) =>
    (!('stages' in filter) || (filter.stages as readonly string[]).includes(row.stage)) &&
    (!needle || [row.address, row.tenant, row.leadAgentName ?? ''].some((text) => text.toLowerCase().includes(needle))))
  const href = (key: string) => {
    const params = new URLSearchParams({ ...(key !== 'all' && { filter: key }), ...(search && { q: search }) })
    return `/properties${params.size ? `?${params}` : ''}`
  }

  return (
    <div>
      <WorkspaceSection agentId={agent.id} chosen={chosen} path="/properties" />
      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
          <p className="mt-1 text-sm text-gray-500">Every address you work, at the stage of its current tenancy.</p>
        </div>
        <Link href={chosen.newHref} className="action-primary shrink-0">New check-in</Link>
      </div>

      <RenewalCards renewals={renewals} />

      <form action="/properties" className="mb-3 flex gap-2" role="search">
        {filter.key !== 'all' && <input type="hidden" name="filter" value={filter.key} />}
        <label className="sr-only" htmlFor="property-search">Search properties</label>
        <input id="property-search" name="q" defaultValue={search} placeholder="Address, tenant or agent" className="field min-w-0 flex-1" />
        <button type="submit" className="action-secondary">Search</button>
      </form>
      <nav aria-label="Property stage" className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {filters.map((option) => (
          <Link
            key={option.key}
            href={href(option.key)}
            aria-current={filter.key === option.key ? 'page' : undefined}
            className={`${filter.key === option.key ? 'action-primary' : 'action-secondary'} shrink-0 whitespace-nowrap`}
          >
            {option.label}
          </Link>
        ))}
      </nav>
      {filter.key === 'trash' && (
        <p className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Deleted properties can be restored for 30 days. After that, their draft records and stored
          media are permanently removed.
        </p>
      )}

      {properties.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm font-medium">
            {search ? 'No properties match your search' : filter.key === 'all' ? 'No properties yet' : `Nothing in ${filter.label}`}
          </p>
          {filter.key === 'all' && !search && (
            <>
              <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
                Start a check-in when you next hand over a unit. The property appears here.
              </p>
              <Link href={chosen.newHref} className="action-primary mt-6 inline-flex">New check-in</Link>
            </>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {properties.map((property) => (
            <li key={property.id}>
              <Link
                href={property.state === 'TRASHED' ? `/properties/${property.id}/settings` : `/properties/${property.id}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium break-words">{property.address}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {property.tenant} · {property.agencyName ?? 'Personal'}
                    {property.leadAgentName && ` · ${property.leadAgentName}`}
                  </p>
                  {property.trashExpiresAt && (
                    <p className="mt-1 text-xs text-red-700">Restore before {longDate(property.trashExpiresAt)}</p>
                  )}
                  <p className="mt-2"><PropertyStagePill stage={property.stage} label={property.stageLabel} /></p>
                </div>
                <span aria-hidden="true" className="text-xl text-gray-500">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
