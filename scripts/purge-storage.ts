import 'dotenv/config'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from '@/lib/db'
import { CAPTURE_BUCKET, captureExists, serviceClient } from '@/lib/storage'
import type { StoragePurge } from '@/generated/prisma'

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

async function purgePrefix(prefix: string) {
  // Room and addendum uploads are direct children of their prefix. Restart at offset
  // zero as the folder shrinks, then verify an empty listing before completion.
  for (let pass = 0; pass < 100; pass++) {
    const { data, error } = await storage.list(prefix, { limit: 1000, offset: 0 })
    if (error) throw error
    const objects = data ?? []
    if (objects.length === 0) return
    if (objects.some((object) => object.id === null)) {
      throw new Error(`Prefix ${prefix} has a nested Storage folder; inspect it before deleting`)
    }
    const paths = objects.map((object) => `${prefix}/${object.name}`)
    for (let start = 0; start < paths.length; start += 100) {
      const removed = await storage.remove(paths.slice(start, start + 100))
      if (removed.error) throw removed.error
    }
  }
  throw new Error(`Prefix ${prefix} still has Storage objects after 100 cleanup passes`)
}

export async function purgeStorageEntry(purge: StoragePurge) {
  // Enforce the delay against both timestamps, even if readyAt was set too early.
  if (purge.readyAt.getTime() > Date.now() || purge.createdAt.getTime() + uploadWindow > Date.now()) {
    return 'waiting'
  }
  if (purge.isPrefix) {
    const addendumId = /^addenda\/([A-Za-z0-9]+)$/.exec(purge.path)?.[1]
    const inUse = () => addendumId
      ? db.reportAddendum.findUnique({ where: { id: addendumId }, select: { id: true } })
      : db.room.findUnique({ where: { id: purge.path }, select: { id: true } })
    if (await inUse()) {
      throw new Error(`Prefix ${purge.path} still belongs to a report; refusing prefix purge`)
    }
    await purgePrefix(purge.path)
    if (await inUse()) {
      throw new Error(`Prefix ${purge.path} reappeared during prefix purge`)
    }
  } else {
    // The path may be a video's poster or a draft update's photo.
    const inUse = async () =>
      await db.capture.findFirst({
        where: { OR: [{ storagePath: purge.path }, { posterPath: purge.path }] },
        select: { id: true },
      }) ?? await db.reportAddendumPhoto.findFirst({
        where: { storagePath: purge.path }, select: { id: true },
      })
    if (await inUse()) {
      throw new Error(`Object ${purge.path} still belongs to a report; refusing object purge`)
    }
    await purgeObject(purge.path)
    if (await inUse()) {
      throw new Error(`Object ${purge.path} reappeared during object purge`)
    }
  }
  await db.storagePurge.updateMany({
    where: { id: purge.id, completedAt: null },
    data: { completedAt: new Date() },
  })
  return 'completed'
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
      try {
        if (await purgeStorageEntry(purge) === 'waiting') waiting++
        else completed++
      } catch (error) {
        failed++
        console.error(`Storage purge ${purge.id} failed:`, error)
      }
    }
  }

  console.log(`Storage purges: ${completed} completed, ${waiting} waiting, ${failed} failed`)
  if (failed > 0) process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
    .finally(async () => db.$disconnect())
}
