import { inspectionPlace, recordEvent } from '@/lib/property-history'
import { templateRows } from '@/lib/room-templates'
import type { FurnishingLevel, Prisma } from '@/generated/prisma'

/// The rooms a new check-in starts with, made exactly as `addRoom` makes one: the
/// standard rows for its name and furnishing, one millisecond apart so they keep the
/// template's order, and a history line per room. Not a server action, so it can only
/// run inside an action that has already authorized and locked the work.
export async function createStarterRooms(
  tx: Prisma.TransactionClient,
  inspectionId: string,
  names: string[],
  furnishing: FurnishingLevel,
  actorId: string,
) {
  const rooms = names.map((name) => name.trim()).filter(Boolean)
  if (rooms.length === 0) return
  const place = await inspectionPlace(tx, inspectionId)
  const now = Date.now()
  for (const [order, name] of rooms.entries()) {
    await tx.room.create({
      data: {
        inspectionId,
        name,
        order,
        items: {
          create: templateRows(name, furnishing).map((row, index) => ({
            ...row,
            condition: 'GOOD',
            editedByHuman: true,
            createdAt: new Date(now + index),
          })),
        },
      },
    })
    await recordEvent(tx, { ...place, actorId, kind: 'ROOM_ADDED', summary: `added the room ${name}` })
  }
}

/// Each property's room names, in order, from its newest check-in that has rooms:
/// offered when the same property starts another term. Names only. Conditions,
/// serials, readings, photos and signatures belong to the report that recorded them
/// and are never carried into a new one. The caller has authorized every property.
export async function previousRoomNames(client: Prisma.TransactionClient, propertyIds: string[]) {
  if (propertyIds.length === 0) return new Map<string, string[]>()
  const checkIns = await client.inspection.findMany({
    where: { kind: 'CHECK_IN', tenancy: { propertyId: { in: propertyIds } }, rooms: { some: {} } },
    orderBy: { createdAt: 'desc' },
    select: {
      tenancy: { select: { propertyId: true } },
      rooms: { orderBy: { order: 'asc' }, select: { name: true } },
    },
  })
  const names = new Map<string, string[]>()
  for (const checkIn of checkIns) {
    if (!names.has(checkIn.tenancy.propertyId)) {
      names.set(checkIn.tenancy.propertyId, checkIn.rooms.map((room) => room.name))
    }
  }
  return names
}
