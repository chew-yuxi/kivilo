import Link from 'next/link'
import { db } from '@/lib/db'
import { propertyLabel } from '@/lib/format'
import { StatusBadge } from '@/components/status-badge'

export const dynamic = 'force-dynamic'

export default async function InspectionsPage() {
  const inspections = await db.inspection.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      tenancy: { include: { property: true, tenant: true } },
      _count: { select: { rooms: true } },
    },
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Inspections</h1>
        <p className="mt-1 text-sm text-gray-500">
          Record a walkthrough; the condition report drafts itself. You review and both
          parties countersign.
        </p>
      </div>

      {inspections.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          No inspections yet. Run <code className="font-mono">pnpm db:seed</code> to create one.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {inspections.map((inspection) => (
            <li key={inspection.id}>
              <Link
                href={`/inspections/${inspection.id}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {propertyLabel(inspection.tenancy.property)}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {inspection.kind === 'CHECK_IN' ? 'Check-in' : 'Check-out'} ·{' '}
                    {inspection.tenancy.tenant.name}
                    {inspection._count.rooms > 0 && ` · ${inspection._count.rooms} rooms`}
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
