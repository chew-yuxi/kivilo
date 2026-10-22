import Link from 'next/link'
import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'
import { inspectionWorkScope } from '@/lib/inspection-work'
import { propertyLabel } from '@/lib/format'
import { StatusBadge } from '@/components/status-badge'
import { RenewalCards } from '@/components/renewal-cards'
import { dueRenewals } from '@/lib/renewals'

export const dynamic = 'force-dynamic'

export default async function InspectionsPage() {
  const agent = await requireAgent()
  const renewals = await dueRenewals(agent.id)

  const inspections = await db.inspection.findMany({
    where: inspectionWorkScope(agent.id, { mine: true }),
    orderBy: { createdAt: 'desc' },
    include: {
      tenancy: {
        include: {
          property: true,
          tenant: true,
          agent: { select: { id: true, name: true } },
          collaborators: {
            orderBy: { createdAt: 'asc' },
            select: { stakeholderId: true, stakeholder: { select: { name: true } } },
          },
        },
      },
      accessGrants: { select: { stakeholderId: true, stakeholder: { select: { name: true } } } },
      _count: { select: { rooms: true } },
    },
  })

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inspections</h1>
          <p className="mt-1 text-sm text-gray-500">
            Record a walkthrough and write the inventory room by room. Both parties
            countersign on your phone.
          </p>
        </div>
        <Link
          href="/inspections/new"
          className="shrink-0 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          New check-in
        </Link>
      </div>

      <RenewalCards renewals={renewals} />

      {inspections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm font-medium">Nothing here yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
            Start a check-in when you next hand over a unit. You walk the rooms narrating
            what you see, and write the inventory against it.
          </p>
          <Link
            href="/inspections/new"
            className="mt-6 inline-block rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            New check-in
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {inspections.map((inspection) => {
            const { tenancy } = inspection
            const fullAccess = new Set([tenancy.agentId, ...tenancy.collaborators.map((person) => person.stakeholderId)])
            const inspectionOnly = inspection.accessGrants.filter((person) => !fullAccess.has(person.stakeholderId))
            const sharedWith = [
              ...(tenancy.agent && tenancy.agent.id !== agent.id ? [tenancy.agent.name] : []),
              ...tenancy.collaborators.filter((person) => person.stakeholderId !== agent.id)
                .map((person) => person.stakeholder.name),
            ]
            const accessLabel = !fullAccess.has(agent.id)
              ? 'Access to previous reports'
              : tenancy.collaborators.length
                ? sharedWith.length ? `Shared with ${sharedWith.join(', ')}` : 'Shared tenancy'
                : inspectionOnly.length
                  ? `Previous report shared with ${inspectionOnly.map((person) => person.stakeholder.name).join(', ')}`
                  : 'Private'
            return (
              <li key={inspection.id}>
                <Link
                  href={`/inspections/${inspection.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {propertyLabel(inspection.tenancy.property)}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {inspection.kind === 'CHECK_IN' ? 'Check-in' : 'Check-out'} ·{' '}
                      {inspection.tenancy.tenant.name}
                      {inspection._count.rooms > 0 &&
                        ` · ${inspection._count.rooms} room${inspection._count.rooms === 1 ? '' : 's'}`}
                    </p>
                    <span className="mt-2 inline-block rounded-md bg-gray-100 px-2 py-1 text-xs break-words text-gray-600">
                      {accessLabel}
                    </span>
                  </div>
                  <StatusBadge status={inspection.status} />
                  <span aria-hidden="true" className="text-xl text-gray-500">›</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
