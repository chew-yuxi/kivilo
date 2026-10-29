import { z } from 'zod'
import { db } from '@/lib/db'
import { inspectionWorkScope } from '@/lib/inspection-work'
import { propertyState } from '@/lib/property-management'
import { propertyLabel } from '@/lib/format'
import { createInspection } from '@/lib/actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

/// Same query and same scope as the web list at src/app/(app)/inspections/page.tsx.
export const GET = authed(async (agent, _params, request) => {
  const query = new URL(request.url).searchParams
  const filters = z.object({
    agencyId: z.string().min(1).optional(),
    personal: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
    assigneeId: z.string().min(1).optional(),
    mine: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
    state: z.enum(['active', 'archived']).optional(),
    status: z.enum(['DRAFT', 'CAPTURING', 'PROCESSING', 'REVIEW', 'AWAITING_SIGNATURE', 'COMPLETED', 'FAILED']).optional(),
  }).parse(Object.fromEntries(query))
  const inspections = await db.inspection.findMany({
    where: inspectionWorkScope(agent.id, filters),
    orderBy: { createdAt: 'desc' },
    include: {
      tenancy: { include: {
        property: true, tenant: true,
        agency: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true } },
        collaborators: { where: { stakeholderId: agent.id }, select: { id: true } },
      } },
      _count: { select: { rooms: true } },
    },
  })

  return inspections.map((inspection) => ({
    id: inspection.id,
    tenancyId: inspection.tenancyId,
    propertyId: inspection.tenancy.propertyId,
    propertyState: propertyState(inspection.tenancy.property),
    agency: inspection.tenancy.agency,
    agencyId: inspection.tenancy.agencyId,
    agencyName: inspection.tenancy.agency?.name ?? null,
    leadAgent: inspection.tenancy.agent,
    leadAgentId: inspection.tenancy.agentId,
    leadAgentName: inspection.tenancy.agent?.name ?? null,
    assignedToMe: inspection.tenancy.agentId === agent.id || inspection.tenancy.collaborators.length > 0,
    kind: inspection.kind,
    status: inspection.status,
    property: propertyLabel(inspection.tenancy.property),
    tenant: inspection.tenancy.tenant.name,
    rooms: inspection._count.rooms,
    conductedAt: inspection.conductedAt?.toISOString() ?? null,
  }))
})

const newInspection = z.object({
  clientId: z.uuid().optional(),
  agencyId: z.string().min(1).optional(),
  line1: z.string().trim().min(1),
  unit: z.string().trim().nullable().default(null),
  postalCode: z.string().trim().min(1),
  propertyType: z.enum(['HDB', 'PRIVATE_NON_LANDED', 'LANDED', 'COMMERCIAL']),
  // Older app builds send only this Boolean. The action maps it onto the new enum.
  fullyFurnished: z.boolean().default(true),
  furnishingLevel: z.enum(['FULLY_FURNISHED', 'PARTIALLY_FURNISHED', 'UNFURNISHED']).optional(),
  landlordName: z.string().trim().min(1),
  landlordEmail: z.email().nullable().default(null),
  tenantName: z.string().trim().min(1),
  tenantEmail: z.email().nullable().default(null),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  monthlyRent: z.string().min(1),
  deposit: z.string().min(1),
  rooms: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
})

/// Creates the property, both stakeholders, the tenancy and the check-in in one call,
/// exactly as the web form does. The signed-in agent is put on the tenancy, which is
/// what makes the result visible to them and to nobody else.
export const POST = authed(async (_agent, _params, request) => {
  const input = newInspection.parse(await request.json())
  return { id: await createInspection(input) }
})
