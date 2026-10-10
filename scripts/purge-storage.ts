import 'dotenv/config'
import { db } from '@/lib/db'
import { CAPTURE_BUCKET, captureExists, serviceClient } from '@/lib/storage'

// Run this operator command again after failures and whenever pending tombstones
// become ready. A signed upload URL can write for two hours after the row was
// deleted, so the extra hour is intentional. Never remove an object earlier.
const uploadWindow = 3 * 60 * 60 * 1000
const storage = serviceClient().storage.from(CAPTURE_BUCKET)

async function purgeObject(path: string) {
  if (await captureExists(path)) {
    const removed = await storage.remove([path])
    if (removed.error) throw removed.error
  }
  if (await captureExists(path)) {
    throw new Error(`Storage object ${path} is still present after removal`)
  }
}

async function purgeRoomPrefix(roomId: string) {
  // Kivilo upload paths are direct children of a room ID. Always restart at offset
  // zero as the folder shrinks, then verify an empty listing before completion.
  for (let pass = 0; pass < 100; pass++) {
    const { data, error } = await storage.list(roomId, { limit: 1000, offset: 0 })
    if (error) throw error
    const objects = data ?? []
    if (objects.length === 0) return
    if (objects.some((object) => object.id === null)) {
      throw new Error(`Room ${roomId} has a nested Storage folder; inspect it before deleting`)
    }
    const paths = objects.map((object) => `${roomId}/${object.name}`)
    for (let start = 0; start < paths.length; start += 100) {
      const removed = await storage.remove(paths.slice(start, start + 100))
      if (removed.error) throw removed.error
    }
  }
  throw new Error(`Room ${roomId} still has Storage objects after 100 cleanup passes`)
}

async function main() {
  const now = new Date()
  let cursor: string | undefined
  let completed = 0
  let failed = 0
  let waiting = 0

  for (;;) {
    const batch = await db.storagePurge.findMany({
      where: {
        completedAt: null,
        readyAt: { lte: now },
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      orderBy: { id: 'asc' },
      take: 100,
    })
    if (batch.length === 0) break
    cursor = batch[batch.length - 1].id

    for (const purge of batch) {
      // Also enforce the delay against the database creation time. A mistakenly
      // early readyAt must not erase a capture while its upload URL still works.
      if (purge.createdAt.getTime() + uploadWindow > Date.now()) {
        waiting++
        continue
      }
      try {
        if (purge.isPrefix) {
          if (await db.room.findUnique({ where: { id: purge.path }, select: { id: true } })) {
            throw new Error(`Room ${purge.path} still exists; refusing prefix purge`)
          }
          await purgeRoomPrefix(purge.path)
          if (await db.room.findUnique({ where: { id: purge.path }, select: { id: true } })) {
            throw new Error(`Room ${purge.path} reappeared during prefix purge`)
          }
        } else {
          if (await db.capture.findUnique({
            where: { storagePath: purge.path },
            select: { id: true },
          })) {
            throw new Error(`Capture ${purge.path} still exists; refusing object purge`)
          }
          await purgeObject(purge.path)
          if (await db.capture.findUnique({
            where: { storagePath: purge.path },
            select: { id: true },
          })) {
            throw new Error(`Capture ${purge.path} reappeared during object purge`)
          }
        }
        await db.storagePurge.updateMany({
          where: { id: purge.id, completedAt: null },
          data: { completedAt: new Date() },
        })
        completed++
      } catch (error) {
        failed++
        console.error(`Storage purge ${purge.id} failed:`, error)
      }
    }
  }

  console.log(`Storage purges: ${completed} completed, ${waiting} waiting, ${failed} failed`)
  if (failed > 0) process.exitCode = 1
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => db.$disconnect())
