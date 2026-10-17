import { z } from 'zod'
import { db } from '@/lib/db'
import { createDownloadUrl } from '@/lib/storage'
import { toAnnotations, type StoredAnnotations } from '@/lib/annotations'
import { CONDITIONS } from '@/lib/inspection/schema'
import type { Prisma } from '@/generated/prisma'

/// What `startCheckOut` freezes on each check-out room it copies, in `Room.baseline`:
/// the check-in room's lines as the check-out began from them (the signed check-in with
/// every acknowledged addendum), and its photos stamped at review, by the report's rule.
/// Frozen, so renaming the room, two rooms sharing a name, or an addendum acknowledged
/// later can never change what the inspector compares against.
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
  photoIds: z.array(z.string()),
})

export type RoomBaseline = z.infer<typeof roomBaselineSchema>
export type CheckInLine = RoomBaseline['lines'][number]

export type CheckInReference = {
  baselineId: string
  conductedAt: string | null
  lines: CheckInLine[]
  photos: { id: string; url: string; annotations: StoredAnnotations | null }[]
}

/// A check-out room as it was at check-in, for the inspector walking it again. Null on
/// a check-in, and on a room the check-in never had.
///
/// It reads only, and never writes a line: the inspector still writes every one.
/// Callers have already authorized the check-out room; its baseline is the check-in of
/// the same tenancy, so whoever may work the one may read the other.
export async function checkInReference(room: {
  baseline: Prisma.JsonValue | null
  inspection: { baseline: { id: string; conductedAt: Date | null } | null }
}): Promise<CheckInReference | null> {
  const checkIn = room.inspection.baseline
  if (room.baseline === null || !checkIn) return null

  const { lines, photoIds } = roomBaselineSchema.parse(room.baseline)
  const photos = await db.capture.findMany({
    where: { id: { in: photoIds } },
    orderBy: { createdAt: 'asc' },
  })
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

/// What a caller selects to hand `checkInReference` a room.
export const checkInReferenceSelect = {
  baseline: true,
  inspection: { select: { baseline: { select: { id: true, conductedAt: true } } } },
} satisfies Prisma.RoomSelect
