import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { db } from '../src/lib/db'
import { uploadBytes } from '../src/lib/storage'
import { processInspection } from '../src/lib/inspection/process'

/// Dev-only: pushes a local video through the real pipeline for the first
/// inspection in the database. Usage: tsx scripts/dev-run-pipeline.ts <video>
async function main() {
  const file = process.argv[2]
  const inspection = await db.inspection.findFirstOrThrow({ where: { kind: 'CHECK_IN' } })
  const bytes = new Uint8Array(readFileSync(file))
  const storagePath = `${inspection.id}/dev-${Date.now()}.mp4`

  await uploadBytes(storagePath, bytes, 'video/mp4')
  await db.capture.create({
    data: {
      inspectionId: inspection.id,
      storagePath,
      mimeType: 'video/mp4',
      sizeBytes: bytes.byteLength,
      durationSec: 34,
    },
  })

  await processInspection(inspection.id)

  const result = await db.inspection.findUniqueOrThrow({
    where: { id: inspection.id },
    include: { rooms: { include: { items: true }, orderBy: { order: 'asc' } } },
  })
  console.log(`status=${result.status}`)
  console.log(`summary: ${result.summary}`)
  for (const room of result.rooms) {
    console.log(`  ${room.name}: ${room.items.map((i) => `${i.name} [${i.condition}]`).join(', ')}`)
  }
  console.log(`\n${result.id}`)
  await db.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
