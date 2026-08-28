import { db } from '@/lib/db'
import { authorizeInspection } from '@/lib/auth'
import { propertyLabel } from '@/lib/format'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

/// One inspection with its rooms, in walk order. Authorized through the same helper the
/// server actions use, so an id belonging to another agent is a 404 here exactly as it
/// is everywhere else.
export const GET = authed(async (agent, { id }: { id: string }) => {
  await authorizeInspection(id, agent.id)

  const inspection = await db.inspection.findUniqueOrThrow({
    where: { id },
    include: {
      tenancy: { include: { property: true, landlord: true, tenant: true } },
      rooms: {
        orderBy: { order: 'asc' },
        include: {
          captures: { select: { kind: true, processedAt: true } },
          _count: { select: { items: true } },
        },
      },
    },
  })

  return {
    id: inspection.id,
    kind: inspection.kind,
    status: inspection.status,
    property: propertyLabel(inspection.tenancy.property),
    landlord: inspection.tenancy.landlord.name,
    tenant: inspection.tenancy.tenant.name,
    summary: inspection.summary,
    rooms: inspection.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      status: room.status,
      processingError: room.processingError,
      items: room._count.items,
      photos: room.captures.filter((capture) => capture.kind === 'PHOTO').length,
      videos: room.captures.filter((capture) => capture.kind === 'VIDEO').length,
      newSinceDraft:
        room.status === 'REVIEW' || room.status === 'REVIEWED'
          ? room.captures.filter((capture) => capture.processedAt === null).length
          : 0,
    })),
  }
})
