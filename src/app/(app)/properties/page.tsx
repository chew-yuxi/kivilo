import Link from 'next/link'
import { requireAgent } from '@/lib/auth'
import { managedProperties, type PropertyListState } from '@/lib/property-management'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Properties' }

export default async function PropertiesPage({ searchParams }: PageProps<'/properties'>) {
  const agent = await requireAgent()
  const query = await searchParams
  const state: PropertyListState =
    query.state === 'archived' || query.state === 'trash' ? query.state : 'active'
  const { properties } = await managedProperties(agent.id, state)
  const views = [
    { state: 'active', label: 'Active' },
    { state: 'archived', label: 'Archived' },
    { state: 'trash', label: 'Recently deleted' },
  ] as const
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
        <p className="mt-2 text-sm text-gray-600">
          Open a property&apos;s settings to manage its records, archive it, or delete a draft.
        </p>
      </div>
      <nav aria-label="Property status" className="flex flex-wrap gap-2">
        {views.map((view) => (
          <Link
            key={view.state}
            href={`/properties?state=${view.state}`}
            className={state === view.state ? 'action-primary' : 'action-secondary'}
            aria-current={state === view.state ? 'page' : undefined}
          >
            {view.label}
          </Link>
        ))}
      </nav>
      {state === 'trash' && (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Deleted properties can be restored for 30 days. After that, their draft records and stored
          media are permanently removed.
        </p>
      )}
      {properties.length ? (
        <ul className="space-y-3">
          {properties.map((property) => (
            <li key={property.id}>
              <Link href={`/properties/${property.id}/settings`} className="nav-row">
                <span className="min-w-0">
                  <span className="block break-words">{property.label}</span>
                  <span className="mt-1 block text-xs font-normal text-gray-600">
                    {property.tenancyCount} {property.tenancyCount === 1 ? 'tenancy' : 'tenancies'}{' '}
                    · {property.inspectionCount}{' '}
                    {property.inspectionCount === 1 ? 'inspection' : 'inspections'}
                  </span>
                  {property.trashExpiresAt && (
                    <span className="mt-1 block text-xs font-normal text-red-700">
                      Restore before{' '}
                      {new Date(property.trashExpiresAt).toLocaleDateString('en-SG', {
                        dateStyle: 'long',
                      })}
                    </span>
                  )}
                  <span className="mt-2 block text-sm text-brand-700">Property settings</span>
                </span>
                <span aria-hidden="true">›</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">
          {state === 'active'
            ? 'No active properties yet. Start a check-in to add one.'
            : state === 'archived'
              ? 'No archived properties.'
              : 'No recently deleted properties.'}
        </p>
      )}
      {state === 'active' && (
        <Link href="/inspections/new" className="action-primary">
          New check-in
        </Link>
      )}
    </div>
  )
}
