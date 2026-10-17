import { z } from 'zod'
import { db } from '@/lib/db'
import { inspectionScope } from '@/lib/auth'
import { createDownloadUrl } from '@/lib/storage'
import { toAnnotations, type StoredAnnotations } from '@/lib/annotations'
import type { StateRoom } from '@/lib/addenda-state'
import { CONDITIONS } from '@/lib/inspection/schema'

/// What `startCheckOut` freezes on each check-out room it copies, in `Room.baseline`:
/// the room as the check-out began from it (the signed check-in with every acknowledged
/// addendum), its lines and every photo both parties agreed to of it. Frozen, so
/// renaming the room, two rooms sharing a name, or an addendum acknowledged later can
/// never change what the inspector compares against.
export const roomBaselineSchema = z.object({
  lines: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      condition: z.enum(CONDITIONS),
      quantity: z.number().int(),
      notes: z.string().nullable(),
      identifier: z.string().nullable(),
      meterReading: z.string().nullable(),
    }),
  ),
  photos: z.array(
    z.object({
      id: z.string(),
      storagePath: z.string(),
      /// Read back through `toAnnotations` like every other stored copy, so marks of an
      /// older shape are dropped rather than breaking the room.
      annotations: z.unknown(),
    }),
  ),
})

export type RoomBaseline = z.infer<typeof roomBaselineSchema>
export type CheckInLine = RoomBaseline['lines'][number]

export type CheckInReference = {
  baselineId: string
  conductedAt: string | null
  lines: CheckInLine[]
  photos: { id: string; url: string; annotations: StoredAnnotations | null }[]
}

/// The baseline for each of `rooms`, the check-in's current state as `startCheckOut`
/// copies it. Photos follow the report's rules: the check-in room's captures stamped at
/// review, then the photos of the addendum entries `applyAddenda` applied to the room,
/// so a replaced appliance's new picture sits beside its new line.
export async function roomBaselines(rooms: StateRoom[]) {
  const captures = await db.capture.findMany({
    where: {
      roomId: { in: rooms.flatMap((room) => (room.roomId ? [room.roomId] : [])) },
      kind: 'PHOTO',
      processedAt: { not: null },
    },
    orderBy: { createdAt: 'asc' },
  })

  return rooms.map((room) => ({
    lines: room.lines.map((line) => ({
      key: line.key,
      name: line.name,
      condition: line.condition,
      quantity: line.quantity,
      notes: line.notes,
      identifier: line.identifier,
      meterReading: line.meterReading,
    })),
    photos: [
      ...captures
        .filter((capture) => capture.roomId === room.roomId)
        .map((capture) => ({
          id: capture.id,
          storagePath: capture.storagePath,
          annotations: toAnnotations(capture.annotations),
        })),
      ...room.addendumPhotos.map((photo) => ({ ...photo, annotations: null })),
    ],
  }))
}

/// A check-out room as it was at check-in, for the inspector walking it again. Null on
/// a check-in, on a room added during the check-out, and for an agent who may not see
/// the check-in: conducting a check-out admits you to it (`inspectionScope`), not to the
/// check-in it was copied from. The caller has already authorized the room.
///
/// It reads only, and never writes a line: the inspector still writes every one.
export async function checkInReference(roomId: string, agentId: string): Promise<CheckInReference | null> {
  const room = await db.room.findUnique({ where: { id: roomId }, select: { baseline: true } })
  if (!room || room.baseline === null) return null

  const checkIn = await db.inspection.findFirst({
    where: { AND: [{ checkOut: { rooms: { some: { id: roomId } } } }, inspectionScope(agentId)] },
    select: { id: true, conductedAt: true },
  })
  if (!checkIn) return null

  const { lines, photos } = roomBaselineSchema.parse(room.baseline)
  return {
    baselineId: checkIn.id,
    conductedAt: checkIn.conductedAt?.toISOString() ?? null,
    lines,
    photos: await Promise.all(
      photos.map(async (photo) => ({
        id: photo.id,
        url: await createDownloadUrl(photo.storagePath),
        annotations: toAnnotations(photo.annotations),
      })),
    ),
  }
}
