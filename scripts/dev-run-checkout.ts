import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { db } from '../src/lib/db'
import { uploadBytes } from '../src/lib/storage'
import { processInspection, generateFindings } from '../src/lib/inspection/process'

/// Dev-only: drives a check-out through capture → extraction → diff against the
/// completed check-in. Usage: tsx scripts/dev-run-checkout.ts <video>
async function main() {
  const file = process.argv[2]
  const baseline = await db.inspection.findFirstOrThrow({
    where: { kind: 'CHECK_IN', status: 'COMPLETED' },
  })

  const existing = await db.inspection.findFirst({ where: { baselineId: baseline.id } })
  const checkOut =
    existing ??
    (await db.inspection.create({
      data: {
        tenancyId: baseline.tenancyId,
        kind: 'CHECK_OUT',
        baselineId: baseline.id,
        conductedById: baseline.conductedById,
      },
    }))

  const bytes = new Uint8Array(readFileSync(file))
  const storagePath = `${checkOut.id}/dev-${Date.now()}.mp4`
  await uploadBytes(storagePath, bytes, 'video/mp4')
  await db.capture.create({
    data: {
      inspectionId: checkOut.id,
      storagePath,
      mimeType: 'video/mp4',
      sizeBytes: bytes.byteLength,
      durationSec: 48,
    },
  })

  await processInspection(checkOut.id)
  await db.inspection.update({
    where: { id: checkOut.id },
    data: { status: 'AWAITING_SIGNATURE' },
  })

  await generateFindings(checkOut.id)

  const result = await db.inspection.findUniqueOrThrow({
    where: { id: checkOut.id },
    include: {
      findings: { include: { item: true, baselineItem: true }, orderBy: { createdAt: 'asc' } },
    },
  })

  console.log(`\n${result.summary}\n`)
  for (const f of result.findings) {
    const label = f.item?.name ?? f.baselineItem?.name ?? '(unmatched)'
    const cost = f.estimatedCost ? ` — S$${f.estimatedCost}` : ''
    console.log(`[${f.changeType}] ${label} → ${f.verdict}${cost}`)
    console.log(`    ${f.rationale}`)
  }
  console.log(`\n${result.id}`)
  await db.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
