import { z } from 'zod'
import { db } from '@/lib/db'
import { inspectionScope } from '@/lib/auth'
import { createDownloadUrl } from '@/lib/storage'
import { toAnnotations, type StoredAnnotations } from '@/lib/annotations'
import type { StateRoom } from '@/lib/addenda-state'
import type { Prisma } from '@/generated/prisma'
import { CONDITIONS } from '@/lib/inspection/schema'

/// What `startCheckOut` freezes on each check-out room it copies, in `Room.baseline`:
/// the room as the check-out began from it (the signed check-in with every acknowledged
/// addendum), its lines and every photo both parties agreed to of it. Frozen, so
/// renaming the room, two rooms sharing a name, or an addendum acknowledged later can
/// never change what the inspector compares against. Rows are read strictly, so changing
/// this shape means migrating the rows already stored.
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
      /// Added or replaced by an acknowledged addendum, not signed at check-in.
      update: z.boolean(),
      /// The photos below that the check-in inspector said show this line, so the
      /// check-out inspector sees them beside it. Absent on baselines frozen before it.
      photoIds: z.array(z.string()).optional(),
    }),
  ),
  photos: z.array(
    z.object({
      id: z.string(),
      storagePath: z.string(),
      /// What the photo is of, as the report captions it: the inspector's note on a
      /// check-in capture, or an addendum photo's label and note ("Before: cracked basin").
      caption: z.string().nullable(),
      /// From an addendum acknowledged after the check-in, not the check-in itself.
      update: z.boolean(),
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
  photos: { id: string; caption: string | null; update: boolean; annotations: StoredAnnotations | null }[]
}

/// The baseline for each of `rooms`, the check-in's current state as `startCheckOut`
/// copies it. Photos follow the report's rules: the check-in room's captures stamped at
/// review, then the photos of the addendum entries `applyAddenda` applied to the room,
/// so a replaced appliance's new picture sits beside its new line.
export async function roomBaselines(rooms: StateRoom[], client: Prisma.TransactionClient = db) {
  const captures = await client.capture.findMany({
    where: {
      roomId: { in: rooms.flatMap((room) => (room.roomId ? [room.roomId] : [])) },
      kind: 'PHOTO',
      processedAt: { not: null },
    },
    orderBy: { createdAt: 'asc' },
  })
  const evidence = await client.itemEvidence.findMany({
    where: { captureId: { in: captures.map((capture) => capture.id) } },
    select: { itemId: true, captureId: true },
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
      // `currentState` names the lines addenda bring `entry:<id>`.
      update: line.updatedByAddendum === true || line.key.startsWith('entry:'),
      // Only a signed check-in line has photos linked to it; an addendum's photos are
      // the room's, as the report shows them.
      photoIds: evidence
        .filter((row) => line.key === `item:${row.itemId}`)
        .map((row) => row.captureId),
    })),
    photos: [
      ...captures
        .filter((capture) => capture.roomId === room.roomId)
        .map((capture) => ({
          id: capture.id,
          storagePath: capture.storagePath,
          caption: capture.note,
          update: false,
          annotations: toAnnotations(capture.annotations),
        })),
      ...room.addendumPhotos.map((photo) => ({
        id: photo.id,
        storagePath: photo.storagePath,
        caption: [photo.label, photo.note].filter(Boolean).join(': ') || null,
        update: true,
        annotations: null,
      })),
    ],
  }))
}

/// The frozen baseline of a check-out room and the check-in it came from. Null on a
/// check-in, on a room added during the check-out, and for an agent who may not see the
/// check-in: conducting a check-out admits you to it (`inspectionScope`), not to the
/// check-in it was copied from. The caller has already authorized the room.
async function frozenBaseline(roomId: string, agentId: string) {
  // The check-in whose check-out holds this room, in one query with the room's baseline.
  const checkIn = await db.inspection.findFirst({
    where: { AND: [{ checkOut: { rooms: { some: { id: roomId } } } }, inspectionScope(agentId)] },
    select: {
      id: true,
      conductedAt: true,
      checkOut: { select: { rooms: { where: { id: roomId }, select: { baseline: true } } } },
    },
  })
  const baseline = checkIn?.checkOut?.rooms[0]?.baseline
  if (!checkIn || baseline === undefined || baseline === null) return null
  return { checkIn, baseline: roomBaselineSchema.parse(baseline) }
}

/// A check-out room as it was at check-in, for the inspector walking it again, with
/// `frozenBaseline`'s nulls. Photos carry no URL: a signed URL lasts an hour and the
/// panel may be opened long after the page rendered, so they are minted when it opens
/// (`checkInPhotoUrls`), and never on the renders every capture and edit cause.
///
/// It reads only, and never writes a line: the inspector still writes every one.
export async function checkInReference(roomId: string, agentId: string): Promise<CheckInReference | null> {
  const frozen = await frozenBaseline(roomId, agentId)
  return frozen && referenceOf(frozen)
}

/// Finding comparisons use the state copied at check-out, including agreed condition
/// notices. The immutable original InspectionItem may have an older condition.
export async function findingCheckInConditions(checkOutId: string, agentId: string) {
  const checkIn = await db.inspection.findFirst({
    where: { AND: [{ checkOut: { id: checkOutId } }, inspectionScope(agentId)] },
    select: { checkOut: { select: { rooms: { select: { baseline: true } } } } },
  })
  const conditions = new Map<string, CheckInLine['condition']>()
  for (const room of checkIn?.checkOut?.rooms ?? []) {
    if (room.baseline === null) continue
    for (const line of roomBaselineSchema.parse(room.baseline).lines) conditions.set(line.key, line.condition)
  }
  return conditions
}

/// The same, with a signed URL on each photo, for the app, which keeps a URL per photo
/// itself and so is handed them up front.
export async function signedCheckInReference(roomId: string, agentId: string) {
  const frozen = await frozenBaseline(roomId, agentId)
  if (!frozen) return null
  const urls = await signPhotos(frozen.baseline.photos)
  const reference = referenceOf(frozen)
  return { ...reference, photos: reference.photos.map((photo) => ({ ...photo, url: urls[photo.id] })) }
}

/// A signed URL for each of a check-out room's check-in photos, by photo id. Empty
/// wherever `checkInReference` is null.
export async function checkInPhotoUrls(roomId: string, agentId: string): Promise<Record<string, string>> {
  const frozen = await frozenBaseline(roomId, agentId)
  return frozen ? signPhotos(frozen.baseline.photos) : {}
}

function referenceOf({ checkIn, baseline }: NonNullable<Awaited<ReturnType<typeof frozenBaseline>>>): CheckInReference {
  return {
    baselineId: checkIn.id,
    conductedAt: checkIn.conductedAt?.toISOString() ?? null,
    lines: baseline.lines,
    photos: baseline.photos.map((photo) => ({
      id: photo.id,
      caption: photo.caption,
      update: photo.update,
      annotations: toAnnotations(photo.annotations),
    })),
  }
}

async function signPhotos(photos: RoomBaseline['photos']) {
  return Object.fromEntries(
    await Promise.all(photos.map(async (photo) => [photo.id, await createDownloadUrl(photo.storagePath)] as const)),
  )
}
