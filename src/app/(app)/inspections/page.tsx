import Link from 'next/link'
import { db } from '@/lib/db'
import { requireAgent, inspectionScope } from '@/lib/auth'
import { propertyLabel } from '@/lib/format'
import { StatusBadge } from '@/components/status-badge'

export const dynamic = 'force-dynamic'

export default async function InspectionsPage() {
  const agent = await requireAgent()

  const inspections = await db.inspection.findMany({
    where: inspectionScope(agent.id),
    orderBy: { createdAt: 'desc' },
    include: {
      tenancy: { include: { property: true, tenant: true } },
      _count: { select: { rooms: true } },
    },
  })

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inspections</h1>
          <p className="mt-1 text-sm text-gray-500">
            Record a walkthrough; the condition report drafts itself. You review and both
            parties countersign.
          </p>
        </div>
        <Link
          href="/inspections/new"
          className="shrink-0 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          New check-in
        </Link>
      </div>

      {inspections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm font-medium">Nothing here yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
            Start a check-in when you next hand over a unit. You walk the rooms narrating
            what you see, and the inventory is drafted for you to review.
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
          {inspections.map((inspection) => (
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
                </div>
                <StatusBadge status={inspection.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
