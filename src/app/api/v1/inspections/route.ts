import { z } from 'zod'
import { db } from '@/lib/db'
import { inspectionScope } from '@/lib/auth'
import { propertyLabel } from '@/lib/format'
import { createInspection } from '@/lib/actions'
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

const newInspection = z.object({
  line1: z.string().trim().min(1),
  unit: z.string().trim().nullable().default(null),
  postalCode: z.string().trim().min(1),
  propertyType: z.enum(['HDB', 'PRIVATE_NON_LANDED', 'LANDED', 'COMMERCIAL']),
  landlordName: z.string().trim().min(1),
  landlordEmail: z.email().nullable().default(null),
  tenantName: z.string().trim().min(1),
  tenantEmail: z.email().nullable().default(null),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  monthlyRent: z.string().min(1),
  deposit: z.string().min(1),
})

/// Creates the property, both stakeholders, the tenancy and the check-in in one call,
/// exactly as the web form does. The signed-in agent is put on the tenancy, which is
/// what makes the result visible to them and to nobody else.
export const POST = authed(async (_agent, _params, request) => {
  const input = newInspection.parse(await request.json())
  return { id: await createInspection(input) }
})
