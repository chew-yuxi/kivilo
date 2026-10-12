import { randomUUID } from 'node:crypto'
import { db } from '@/lib/db'
import { downloadCapture } from '@/lib/storage'
import { extractRoom, type CaptureInput } from './extract'
import { diffAgainstBaseline } from './diff'
import { propertyLabel } from '@/lib/format'

/// Turns one room's captures into that room's draft items. Scoped deliberately: an
/// inspector who re-shoots the kitchen must not lose the bedroom they already reviewed.
export async function processRoom(roomId: string, attemptId?: string) {
  const jobId = attemptId ?? randomUUID()
  const room = await db.room.findUniqueOrThrow({
    where: { id: roomId },
    include: {
      captures: { orderBy: { createdAt: 'asc' } },
      inspection: { include: { tenancy: { include: { property: true } } } },
    },
  })

  if (attemptId && (room.processingAttemptId !== jobId || room.status !== 'PROCESSING')) {
    return
  }
  if (!attemptId) {
    await db.room.update({
      where: { id: roomId },
      data: {
        status: 'PROCESSING',
        processingAttemptId: jobId,
        processingStartedAt: new Date(),
        processingError: null,
      },
    })
  }

  if (room.captures.length === 0) {
    await db.room.updateMany({
      where: { id: roomId, processingAttemptId: jobId, status: 'PROCESSING' },
      data: { status: 'FAILED', processingError: 'No captures to process', processingAttemptId: null, processingStartedAt: null },
    })
    throw new Error(`Room ${roomId} has no captures to process`)
  }

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

    // A row a person has edited is theirs, not the model's, and a re-read (a photo added
    // to a reviewed room, say) must not throw it away. Those rows stay; the model's own
    // rows are replaced, minus any that would duplicate a kept row by name.
    await db.$transaction(async (tx) => {
      // Lock and claim the room first. A later re-shoot, a completed review, or a
      // signature makes an old extraction's result ineligible to replace any row.
      const claimed = await tx.room.updateMany({
        where: {
          id: roomId,
          status: 'PROCESSING',
          processingAttemptId: jobId,
          inspection: { status: { notIn: ['AWAITING_SIGNATURE', 'COMPLETED'] } },
        },
        data: { status: 'REVIEW', processingAttemptId: null, processingStartedAt: null },
      })
      if (claimed.count === 0) return

      const kept = await tx.inspectionItem.findMany({
        where: { roomId, editedByHuman: true },
        select: { name: true },
      })
      const keptNames = new Set(kept.map((item) => item.name.trim().toLowerCase()))
      const fresh = extraction.items.filter(
        (item) => !keptNames.has(item.name.trim().toLowerCase()),
      )

      // Only this room's model-authored rows are replaced.
      await tx.inspectionItem.deleteMany({ where: { roomId, editedByHuman: false } })
      await tx.capture.updateMany({
        where: { id: { in: [...captureIds] } },
        data: { processedAt: now },
      })
      await tx.capture.update({
        where: { id: room.captures[0].id },
        data: { transcript: extraction.transcript },
      })
      await tx.inspectionItem.createMany({
        data: fresh.map((item) => ({
          roomId,
          name: item.name,
          category: item.category,
          condition: item.condition,
          quantity: item.quantity,
          notes: item.notes || null,
          identifier: item.identifier,
          meterReading: item.meterReading,
          sourceCaptureId: captureIds.has(item.sourceCaptureRef) ? item.sourceCaptureRef : null,
          sourceTimestampSec: item.sourceTimestampSec,
          confidence: item.confidence,
        })),
      })
      const sourcedItems = await tx.inspectionItem.findMany({
        where: {
          roomId,
          editedByHuman: false,
          sourceCaptureId: { not: null },
        },
        select: { id: true, sourceCaptureId: true },
      })
      if (sourcedItems.length > 0) {
        await tx.itemEvidence.createMany({
          data: sourcedItems.map((item) => ({
            itemId: item.id,
            captureId: item.sourceCaptureId!,
          })),
        })
      }
    })
  } catch (error) {
    await db.room.updateMany({
      where: { id: roomId, processingAttemptId: jobId, status: 'PROCESSING' },
      data: {
        status: 'FAILED',
        processingAttemptId: null,
        processingStartedAt: null,
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

  await db.$transaction(async (tx) => {
    // An agent may already have corrected an earlier draft while a second request
    // was in flight. Never regenerate by deleting their work. Serializable isolation
    // makes concurrent first generations compete rather than silently overwrite.
    const current = await tx.inspection.findUniqueOrThrow({
      where: { id: inspectionId },
      select: { summary: true, _count: { select: { findings: true } } },
    })
    if (current.summary !== null || current._count.findings > 0) {
      throw new Error('Findings already exist; edit the draft instead of regenerating it')
    }
    await tx.finding.createMany({
      data: diff.findings.map((finding) => ({
        inspectionId,
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
    })
    await tx.inspection.update({
      where: { id: inspectionId },
      data: { summary: diff.summary },
    })
  }, { isolationLevel: 'Serializable' })
}
