import 'dotenv/config'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from '@/lib/db'
import { purgeStorageEntry } from '@/lib/storage-purge'
export { purgeStorageEntry } from '@/lib/storage-purge'

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
