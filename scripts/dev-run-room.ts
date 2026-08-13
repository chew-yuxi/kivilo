import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { db } from '../src/lib/db'
import { uploadBytes } from '../src/lib/storage'
import { processRoom } from '../src/lib/inspection/process'

/// Dev-only: pushes local media through one room's real pipeline, standing in for
/// the phone. Usage: tsx scripts/dev-run-room.ts "<Room name>" <file> [file...]
/// Files ending .jpg/.png are registered as PHOTO captures, everything else VIDEO.
async function main() {
  const [roomName, ...files] = process.argv.slice(2)
  if (!roomName || files.length === 0) {
    throw new Error('Usage: tsx scripts/dev-run-room.ts "<Room name>" <file> [file...]')
  }

  const inspection = await db.inspection.findFirstOrThrow({ where: { kind: 'CHECK_IN' } })
  const existing = await db.room.findFirst({
    where: { inspectionId: inspection.id, name: roomName },
  })
  const last = await db.room.findFirst({
    where: { inspectionId: inspection.id },
    orderBy: { order: 'desc' },
    select: { order: true },
  })
  const room =
    existing ??
    (await db.room.create({
      data: { inspectionId: inspection.id, name: roomName, order: (last?.order ?? -1) + 1 },
    }))

  for (const file of files) {
    const isPhoto = /\.(jpe?g|png)$/i.test(file)
    const bytes = new Uint8Array(readFileSync(file))
    const extension = file.split('.').pop()
    const storagePath = `${room.id}/dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`
    await uploadBytes(storagePath, bytes, isPhoto ? 'image/jpeg' : 'video/mp4')
    await db.capture.create({
      data: {
        roomId: room.id,
        kind: isPhoto ? 'PHOTO' : 'VIDEO',
        storagePath,
        mimeType: isPhoto ? 'image/jpeg' : 'video/mp4',
        sizeBytes: bytes.byteLength,
      },
    })
  }

  await processRoom(room.id)

  const result = await db.room.findUniqueOrThrow({
    where: { id: room.id },
    include: { items: { orderBy: { createdAt: 'asc' } } },
  })
  console.log(`\n${result.name}: ${result.status}`)
  for (const item of result.items) {
    console.log(`  ${item.name} [${item.condition}]${item.identifier ? `  ⟨${item.identifier}⟩` : ''}`)
    if (item.meterReading) console.log(`      reading: ${item.meterReading}`)
    if (item.notes) console.log(`      ${item.notes}`)
  }
  await db.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
