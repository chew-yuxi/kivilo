import Link from 'next/link'
import { requireAgent } from '@/lib/auth'
import { managedProperties, type PropertyListState } from '@/lib/property-management'
import { formatDate, messages } from '@/lib/i18n'
import { requestLocale } from '@/lib/i18n/request'

export const dynamic = 'force-dynamic'
export async function generateMetadata() {
  return { title: messages(await requestLocale(await requireAgent())).pwa.properties }
}

export default async function PropertiesPage({ searchParams }: PageProps<'/properties'>) {
  const agent = await requireAgent()
  const m = messages(await requestLocale(agent))
  const w = m.pwa
  const query = await searchParams
  const state: PropertyListState =
    query.state === 'archived' || query.state === 'trash' ? query.state : 'active'
  const { properties } = await managedProperties(agent.id, state)
  const views = [
    { state: 'active', label: w.active },
    { state: 'archived', label: w.archived },
    { state: 'trash', label: w.recentlyDeleted },
  ] as const
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{w.properties}</h1>
        <p className="mt-2 text-sm text-gray-600">
          {w.propertiesIntro}
        </p>
      </div>
      <nav aria-label={w.propertyStatus} className="flex flex-wrap gap-2">
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
          {w.trashNote}
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
                    {w.listCounts(property.tenancyCount, property.inspectionCount)}
                  </span>
                  {property.trashExpiresAt && (
                    <span className="mt-1 block text-xs font-normal text-red-700">
                      {w.restoreBefore(formatDate(m, new Date(property.trashExpiresAt), { dateStyle: 'long' }))}
                    </span>
                  )}
                  <span className="mt-2 block text-sm text-brand-700">{w.propertySettings}</span>
                </span>
                <span aria-hidden="true">›</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">
          {state === 'active'
            ? w.noActiveProperties
            : state === 'archived'
              ? w.noArchivedProperties
              : w.noDeletedProperties}
        </p>
      )}
      {state === 'active' && (
        <Link href="/inspections/new" className="action-primary">
          {w.newCheckIn}
        </Link>
      )}
    </div>
  )
}
