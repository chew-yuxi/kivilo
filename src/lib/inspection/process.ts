import { db } from '@/lib/db'
import { downloadCapture } from '@/lib/storage'
import { extractFromCapture } from './extract'
import { diffAgainstBaseline } from './diff'
import { propertyLabel } from '@/lib/format'

/// Turns a capture into a draft report. Runs in the background after upload;
/// the inspection carries its own status so the UI can poll.
export async function processInspection(inspectionId: string) {
  const inspection = await db.inspection.findUniqueOrThrow({
    where: { id: inspectionId },
    include: {
      captures: { orderBy: { createdAt: 'asc' } },
      tenancy: { include: { property: true } },
    },
  })

  const capture = inspection.captures.at(-1)
  if (!capture) throw new Error(`Inspection ${inspectionId} has no capture to process`)

  await db.inspection.update({
    where: { id: inspectionId },
    data: { status: 'PROCESSING', processingError: null },
  })

  try {
    const bytes = await downloadCapture(capture.storagePath)
    const extraction = await extractFromCapture({
      bytes,
      mimeType: capture.mimeType,
      kind: inspection.kind,
      propertyLabel: propertyLabel(inspection.tenancy.property),
    })

    // Re-processing replaces the draft. Rooms cascade to items and media.
    await db.$transaction([
      db.room.deleteMany({ where: { inspectionId } }),
      db.capture.update({
        where: { id: capture.id },
        data: { transcript: extraction.transcript, processedAt: new Date() },
      }),
      ...extraction.rooms.map((room, order) =>
        db.room.create({
          data: {
            inspectionId,
            name: room.name,
            order,
            items: {
              create: room.items.map((item) => ({
                name: item.name,
                category: item.category,
                condition: item.condition,
                quantity: item.quantity,
                notes: item.notes || null,
                meterReading: item.meterReading,
                sourceTimestampSec: item.sourceTimestampSec,
                confidence: item.confidence,
              })),
            },
          },
        }),
      ),
      db.inspection.update({
        where: { id: inspectionId },
        data: { status: 'REVIEW', summary: extraction.summary },
      }),
    ])
  } catch (error) {
    await db.inspection.update({
      where: { id: inspectionId },
      data: {
        status: 'FAILED',
        processingError: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  }
}

/// Compares a check-out against its check-in baseline. Both must have been reviewed
/// by a human first — diffing raw model output against raw model output compounds
/// two sets of errors and hands the agent an argument built on neither party's evidence.
export async function generateFindings(inspectionId: string) {
  const inspection = await db.inspection.findUniqueOrThrow({
    where: { id: inspectionId },
    include: {
      tenancy: { include: { property: true } },
      rooms: { include: { items: true }, orderBy: { order: 'asc' } },
      baseline: { include: { rooms: { include: { items: true }, orderBy: { order: 'asc' } } } },
    },
  })

  if (inspection.kind !== 'CHECK_OUT') {
    throw new Error('Findings are only generated for check-out inspections')
  }
  if (!inspection.baseline) {
    throw new Error('Check-out has no check-in baseline to compare against')
  }

  const flatten = (rooms: { name: string; items: { id: string; name: string; category: string; condition: string; quantity: number; notes: string | null; meterReading: string | null }[] }[]) =>
    rooms.flatMap((room) =>
      room.items.map((item) => ({
        ref: item.id,
        room: room.name,
        name: item.name,
        category: item.category,
        condition: item.condition,
        quantity: item.quantity,
        notes: item.notes,
        meterReading: item.meterReading,
      })),
    )

  const { startDate, endDate } = inspection.tenancy
  const tenancyMonths = Math.max(
    1,
    Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)),
  )

  const diff = await diffAgainstBaseline({
    baseline: flatten(inspection.baseline.rooms),
    current: flatten(inspection.rooms),
    propertyLabel: propertyLabel(inspection.tenancy.property),
    tenancyMonths,
  })

  const knownItemIds = new Set(flatten(inspection.rooms).map((i) => i.ref))
  const knownBaselineIds = new Set(flatten(inspection.baseline.rooms).map((i) => i.ref))

  await db.$transaction([
    db.finding.deleteMany({ where: { inspectionId } }),
    db.finding.createMany({
      data: diff.findings.map((finding) => ({
        inspectionId,
        // The model echoes refs back; drop any it invented rather than failing the FK.
        itemId: finding.itemRef && knownItemIds.has(finding.itemRef) ? finding.itemRef : null,
        baselineItemId:
          finding.baselineItemRef && knownBaselineIds.has(finding.baselineItemRef)
            ? finding.baselineItemRef
            : null,
        changeType: finding.changeType,
        verdict: finding.verdict,
        rationale: finding.rationale,
        estimatedCost: finding.estimatedCost,
        confidence: finding.confidence,
      })),
    }),
    db.inspection.update({
      where: { id: inspectionId },
      data: { summary: diff.summary },
    }),
  ])
}
