import { db } from '@/lib/db'
import { lockPropertyRecords, protectedPropertyHistory } from '@/lib/property-management'
import { purgeStorageEntry } from '@/lib/storage-purge'

// Moving to trash never deletes bytes. Only expiry cascades the draft rows, and
// durable media tombstones survive that cascade for independent, verified retries.
export async function purgeExpiredProperty(propertyId: string, now = new Date()) {
  return db.$transaction(async (tx) => {
    await lockPropertyRecords(tx, propertyId)
    const expired = await tx.property.findFirst({
      where: { id: propertyId, trashedAt: { not: null }, trashExpiresAt: { lte: now } },
      select: { id: true },
    })
    if (!expired) return 'not_due' as const
    if (await tx.property.findFirst({
      where: { AND: [{ id: propertyId }, protectedPropertyHistory] }, select: { id: true },
    })) return 'protected' as const

    const rooms = await tx.room.findMany({
      where: { inspection: { tenancy: { propertyId } } }, select: { id: true },
    })
    const photos = await tx.findingPhoto.findMany({
      where: { draft: { inspection: { tenancy: { propertyId } } } }, select: { storagePath: true },
    })
    const readyAt = new Date(now.getTime() + 3 * 3600_000)
    await tx.storagePurge.createMany({
      data: [
        ...rooms.map(({ id }) => ({ path: id, isPrefix: true, readyAt })),
        ...photos.map(({ storagePath }) => ({ path: storagePath, isPrefix: false, readyAt })),
      ],
      skipDuplicates: true,
    })
    await tx.property.delete({ where: { id: propertyId } })
    return 'deleted' as const
  }, { timeout: 15000 })
}

export async function emptyExpiredPropertyTrash(now = new Date()) {
  const expired = await db.property.findMany({
    where: { trashedAt: { not: null }, trashExpiresAt: { lte: now } },
    orderBy: [{ trashExpiresAt: 'asc' }, { id: 'asc' }], take: 50, select: { id: true },
  })
  const result = { deleted: 0, protected: 0, mediaDeleted: 0, failed: [] as string[] }
  for (const property of expired) {
    try {
      const outcome = await purgeExpiredProperty(property.id, now)
      if (outcome === 'deleted') result.deleted++
      if (outcome === 'protected') result.protected++
    } catch (error) {
      console.error('Property trash cleanup failed:', property.id, error)
      result.failed.push(property.id)
    }
  }
  const media = await db.storagePurge.findMany({
    where: { completedAt: null, readyAt: { lte: now }, createdAt: { lte: new Date(now.getTime() - 3 * 3600_000) } },
    orderBy: [{ readyAt: 'asc' }, { id: 'asc' }], take: 100,
  })
  for (const purge of media) {
    try {
      if (await purgeStorageEntry(purge) === 'completed') result.mediaDeleted++
    } catch (error) {
      console.error('Property media cleanup failed:', purge.id, error)
      result.failed.push(purge.id)
    }
  }
  return result
}
