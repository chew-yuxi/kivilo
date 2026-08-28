import { db } from '@/lib/db'
import { inspectionScope } from '@/lib/auth'
import { propertyLabel } from '@/lib/format'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

/// Same query and same scope as the web list at src/app/(app)/inspections/page.tsx.
export const GET = authed(async (agent) => {
  const inspections = await db.inspection.findMany({
    where: inspectionScope(agent.id),
    orderBy: { createdAt: 'desc' },
    include: {
      tenancy: { include: { property: true, tenant: true } },
      _count: { select: { rooms: true } },
    },
  })

  return inspections.map((inspection) => ({
    id: inspection.id,
    kind: inspection.kind,
    status: inspection.status,
    property: propertyLabel(inspection.tenancy.property),
    tenant: inspection.tenancy.tenant.name,
    rooms: inspection._count.rooms,
    conductedAt: inspection.conductedAt?.toISOString() ?? null,
  }))
})
