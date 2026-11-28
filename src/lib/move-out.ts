import { createHash } from 'node:crypto'
import { markRoomReviewedInTransaction } from '@/lib/room-review'
import { z } from 'zod'
import type { Prisma } from '@/generated/prisma'
import { inspectionPlace, recordEvent } from '@/lib/property-history'

export const moveOutVisit = z
  .object({
    issues: z
      .array(
        z.object({
          id: z.uuid(),
          label: z.string().trim().min(1).max(160),
          change: z.enum(['DAMAGE', 'MISSING', 'WEAR']),
          note: z.string().trim().max(1000),
        }),
      )
      .max(200),
    noIssues: z.boolean(),
    visitedAt: z.iso.datetime().optional(),
    photoIds: z.array(z.uuid()).max(2000).optional(),
  })
  .refine((visit) => visit.noIssues === (visit.issues.length === 0), {
    message: 'Record an issue or confirm that the walkthrough found none',
  })
  .refine((visit) => !visit.noIssues || !visit.photoIds?.length, {
    message: 'Attach each walkthrough photo to an issue',
  })
  .refine((visit) => new Set(visit.issues.map((issue) => issue.id)).size === visit.issues.length, {
    message: 'Each issue needs its own identity',
  })

export function moveOutHash(visit: z.infer<typeof moveOutVisit>, tenancy: unknown) {
  return createHash('sha256')
    .update(
      JSON.stringify([
        tenancy,
        visit.issues,
        visit.noIssues,
        visit.visitedAt,
        [...(visit.photoIds ?? [])].sort(),
      ]),
    )
    .digest('hex')
}

export type MoveOutVisit = z.infer<typeof moveOutVisit>

/// Each observation is an editable report line until the visit is sent for signature.
export async function createMoveOutRoom(
  tx: Prisma.TransactionClient,
  inspectionId: string,
  actorId: string,
  visit: MoveOutVisit,
) {
  const room = await tx.room.create({
    data: {
      id: `walk-${inspectionId}`,
      inspectionId,
      order: 0,
      status: 'REVIEW',
      expectedWalkthroughPhotos: [...new Set(visit.photoIds)],
      name: 'Move-out walkthrough',
    },
  })
  const place = await inspectionPlace(tx, inspectionId)
  await recordEvent(tx, {
    ...place,
    actorId,
    kind: 'CHECK_OUT_STARTED',
    summary: 'started a check-out without a Kivilo check-in',
  })
  if (visit.issues.length) {
    const now = Date.now()
    const rows = visit.issues.map((issue, index) => ({
      id: `${room.id}-${issue.id}`,
      roomId: room.id,
      name: issue.label,
      notes: issue.note || null,
      category: 'OTHER' as const,
      condition: ({ MISSING: 'MISSING', WEAR: 'WORN', DAMAGE: 'DAMAGED' } as const)[issue.change],
      editedByHuman: true,
      createdAt: new Date(now + index),
    }))
    await tx.inspectionItem.createMany({ data: rows })
    await recordEvent(tx, {
      ...place,
      actorId,
      kind: 'ITEM_ADDED',
      summary: `recorded ${rows.length} move-out ${rows.length === 1 ? 'issue' : 'issues'}`,
    })
  }
  if (!visit.photoIds?.length)
    await markRoomReviewedInTransaction(tx, inspectionId, room.id, actorId, visit.noIssues)
}

/// Seed deposit decisions from exactly the observations that were sent for signature.
/// An issue corrected or deleted during review must not survive as a draft deduction.
export async function prepareMoveOutFindings(
  tx: Prisma.TransactionClient,
  inspectionId: string,
  actorId: string,
) {
  const items = await tx.inspectionItem.findMany({
    where: { room: { inspectionId }, condition: { in: ['DAMAGED', 'WORN', 'MISSING'] } },
    orderBy: [{ room: { order: 'asc' } }, { createdAt: 'asc' }],
  })
  if (!items.length) return
  await tx.finding.createMany({
    data: items.map((item) => ({
      inspectionId,
      itemId: item.id,
      changeType: item.condition === 'MISSING' ? 'MISSING' : item.condition === 'WORN' ? 'WEAR' : 'DAMAGE',
      verdict: 'UNDECIDED',
      rationale: item.notes || item.name,
      editedByHuman: true,
      createdAt: item.createdAt,
    })),
  })
  await recordEvent(tx, {
    ...(await inspectionPlace(tx, inspectionId)),
    actorId,
    kind: 'FINDING_ADDED',
    summary: 'opened the recorded move-out issues for deposit assessment',
  })
}
