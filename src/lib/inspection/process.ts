import { db } from '@/lib/db'
import { downloadCapture } from '@/lib/storage'
import { extractRoom, type CaptureInput } from './extract'
import { diffAgainstBaseline } from './diff'
import { propertyLabel } from '@/lib/format'

/// Turns one room's captures into that room's draft items. Scoped deliberately: an
/// inspector who re-shoots the kitchen must not lose the bedroom they already reviewed.
export async function processRoom(roomId: string) {
  const room = await db.room.findUniqueOrThrow({
    where: { id: roomId },
    include: {
      captures: { orderBy: { createdAt: 'asc' } },
      inspection: { include: { tenancy: { include: { property: true } } } },
    },
  })

  if (room.captures.length === 0) {
    throw new Error(`Room ${roomId} has no captures to process`)
  }

  await db.room.update({
    where: { id: roomId },
    data: { status: 'PROCESSING', processingError: null },
  })

  try {
    const captures: CaptureInput[] = await Promise.all(
      room.captures.map(async (capture) => ({
        ref: capture.id,
        kind: capture.kind,
        bytes: await downloadCapture(capture.storagePath),
        mimeType: capture.mimeType,
        note: capture.note,
      })),
    )

    const extraction = await extractRoom({
      captures,
      roomName: room.name,
      kind: room.inspection.kind,
      propertyLabel: propertyLabel(room.inspection.tenancy.property),
    })

    const captureIds = new Set(room.captures.map((c) => c.id))
    const now = new Date()

    await db.$transaction([
      // Only this room's items are replaced.
      db.inspectionItem.deleteMany({ where: { roomId } }),
      db.capture.updateMany({
        where: { roomId },
        data: { processedAt: now },
      }),
      db.capture.update({
        where: { id: room.captures[0].id },
        data: { transcript: extraction.transcript },
      }),
      db.inspectionItem.createMany({
        data: extraction.items.map((item) => ({
          roomId,
          name: item.name,
          category: item.category,
          condition: item.condition,
          quantity: item.quantity,
          notes: item.notes || null,
          identifier: item.identifier,
          meterReading: item.meterReading,
          // Drop a ref the model invented rather than failing the whole room.
          sourceCaptureId: captureIds.has(item.sourceCaptureRef) ? item.sourceCaptureRef : null,
          sourceTimestampSec: item.sourceTimestampSec,
          confidence: item.confidence,
        })),
      }),
      db.room.update({ where: { id: roomId }, data: { status: 'REVIEW' } }),
    ])
  } catch (error) {
    await db.room.update({
      where: { id: roomId },
      data: {
        status: 'FAILED',
        processingError: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  }
}

/// Compares a check-out against its check-in baseline. Both must have been reviewed
/// by a human first. Diffing raw model output against raw model output compounds
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

  const flatten = (
    rooms: {
      name: string
      items: {
        id: string
        name: string
        category: string
        condition: string
        quantity: number
        notes: string | null
        identifier: string | null
        meterReading: string | null
      }[]
    }[],
  ) =>
    rooms.flatMap((room) =>
      room.items.map((item) => ({
        ref: item.id,
        room: room.name,
        name: item.name,
        category: item.category,
        condition: item.condition,
        quantity: item.quantity,
        notes: item.notes,
        identifier: item.identifier,
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
