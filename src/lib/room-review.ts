import type { Prisma } from '@/generated/prisma'
import { inspectionPlace, recordEvent } from '@/lib/property-history'

/// Called under the open inspection's lock, or while creating its first walkthrough.
export async function markRoomReviewedInTransaction(
  tx: Prisma.TransactionClient,
  inspectionId: string,
  roomId: string,
  actorId: string,
  nothingToRecord: boolean,
) {
  const current = await tx.room.findUniqueOrThrow({
    where: { id: roomId },
    select: { expectedWalkthroughPhotos: true, status: true, _count: { select: { items: true } } },
  })
  if (current.expectedWalkthroughPhotos.length)
    throw new Error('Walkthrough photos are still uploading. Open the visit on the device that took them.')
  if (current.status !== 'REVIEW' && current.status !== 'REVIEWED') {
    throw new Error('Finish capturing this room before reviewing it')
  }
  if (current._count.items === 0 && !nothingToRecord) {
    throw new Error(
      'Add at least one item, or confirm there is nothing to record, before reviewing this room',
    )
  }
  // processedAt marks a capture a person has reviewed the room with. The report only
  // shows those, so a photo that lands after Send never joins what was agreed.
  await tx.capture.updateMany({ where: { roomId, processedAt: null }, data: { processedAt: new Date() } })
  const reviewed = await tx.room.update({ where: { id: roomId }, data: { status: 'REVIEWED' } })
  await recordEvent(tx, {
    ...(await inspectionPlace(tx, inspectionId)),
    actorId,
    kind: 'ROOM_REVIEWED',
    summary:
      nothingToRecord && current._count.items === 0
        ? `reviewed ${reviewed.name}: nothing to record`
        : `reviewed ${reviewed.name}`,
  })
}
