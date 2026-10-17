import { db } from '@/lib/db'
import { currentState } from '@/lib/addenda'
import { createDownloadUrl } from '@/lib/storage'
import { toAnnotations, type StoredAnnotations } from '@/lib/annotations'
import type { InspectionKind, ItemCondition } from '@/generated/prisma'

export type CheckInLine = {
  key: string
  name: string
  condition: ItemCondition
  quantity: number
  notes: string | null
  identifier: string | null
  meterReading: string | null
}

export type CheckInReference = {
  baselineId: string
  conductedAt: string | null
  /// False when no check-in room has this name, because the inspector renamed the
  /// check-out room or added one the check-in never had.
  matched: boolean
  lines: CheckInLine[]
  photos: { id: string; url: string; annotations: StoredAnnotations | null }[]
}

/// What a check-out room looked like at check-in, for the inspector walking it again:
/// the state the check-out was started from (`startCheckOut` copies the same
/// `currentState`), and the check-in room's photos with the report's rule, stamped at
/// review, so it shows what was agreed and nothing that arrived late. Rooms match by
/// name, case-insensitively, as they did when the check-out was made from it.
///
/// It reads only, and never writes a line: the inspector still writes every one.
/// Callers have already authorized the check-out room; its baseline is the check-in of
/// the same tenancy, so whoever may work the one may read the other.
export async function checkInReference(room: {
  name: string
  inspection: { kind: InspectionKind; baselineId: string | null }
}): Promise<CheckInReference | null> {
  const { baselineId } = room.inspection
  if (room.inspection.kind !== 'CHECK_OUT' || !baselineId) return null

  const name = room.name.trim().toLowerCase()
  const [baseline, state, checkInRoom] = await Promise.all([
    db.inspection.findUniqueOrThrow({ where: { id: baselineId }, select: { conductedAt: true } }),
    currentState(baselineId, { acknowledgedOnly: true }),
    db.room.findFirst({
      where: { inspectionId: baselineId, name: { equals: room.name.trim(), mode: 'insensitive' } },
      orderBy: { order: 'asc' },
      include: {
        captures: { where: { kind: 'PHOTO', processedAt: { not: null } }, orderBy: { createdAt: 'asc' } },
      },
    }),
  ])
  const stateRoom = state.find((each) => each.name.toLowerCase() === name)

  return {
    baselineId,
    conductedAt: baseline.conductedAt?.toISOString() ?? null,
    matched: stateRoom !== undefined,
    lines: (stateRoom?.lines ?? []).map((line) => ({
      key: line.key,
      name: line.name,
      condition: line.condition,
      quantity: line.quantity,
      notes: line.notes,
      identifier: line.identifier,
      meterReading: line.meterReading,
    })),
    photos: await Promise.all(
      (checkInRoom?.captures ?? []).map(async (capture) => ({
        id: capture.id,
        url: await createDownloadUrl(capture.storagePath),
        annotations: toAnnotations(capture.annotations),
      })),
    ),
  }
}
