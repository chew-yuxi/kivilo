import { z } from 'zod'
import { db } from '@/lib/db'
import { tenancyScope, type TenancyRole } from '@/lib/auth'
import { activeNotificationRecipients } from '@/lib/notification-recipients'
import { addendumHash, addendumSnapshotSchema, currentState, type AddendumSnapshot } from '@/lib/addenda'
import { CATEGORIES, CONDITIONS } from '@/lib/inspection/schema'
import { moveInDefectWindow, singaporeCalendarDate } from '@/lib/move-in-defect-window'
import type { Prisma } from '@/generated/prisma'
import { toAnnotations } from '@/lib/annotations'
import { lockAgencyTenancy } from '@/lib/agency'

export class MoveInDefectStaleTargetError extends Error {
  constructor() {
    super('The item in this move-in notice has since been replaced or removed. It cannot be acknowledged; you can still dispute the notice.')
    this.name = 'MoveInDefectStaleTargetError'
  }
}

type WindowTenancy = {
  id: string
  startDate: Date
  defectWindowDays: number
  tenantId: string
}

export const moveInDefectInput = z.object({
  targetKey: z.string().regex(/^(item|entry):[A-Za-z0-9]+$/).nullable().default(null),
  roomName: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(200).optional(),
  category: z.enum(CATEGORIES).optional(),
  condition: z.enum(CONDITIONS),
  evidenceIds: z.array(z.string().min(1)).max(50).default([]),
}).refine((input) => input.targetKey !== null || (input.name && input.category), {
  message: 'Name and categorize the item this notice adds',
  path: ['name'],
})

export const disputeMoveInDefectInput = z.object({
  reason: z.string().trim().min(1).max(2000),
})

/// The same lock order as signing and property lifecycle: tenancy, then check-in, then the
/// notice. Settings and new notices cannot race a tenant signature or each other.
export async function lockMoveInDefectTenancy(
  tx: Prisma.TransactionClient,
  inspectionId: string,
  tenancyId: string,
) {
  await lockAgencyTenancy(tenancyId, tx)
  await tx.$queryRaw`SELECT "id" FROM "Inspection" WHERE "id" = ${inspectionId} FOR UPDATE`
}

export async function assertNoSignedCheckOut(tx: Prisma.TransactionClient, tenancyId: string) {
  if (await tx.inspection.findFirst({
    where: { tenancyId, kind: 'CHECK_OUT', status: 'COMPLETED' },
    select: { id: true },
  })) throw new Error('Move-in notices are closed after the check-out is signed')
}

/// A recorded intent pins the completed check-in and the server's report time. The
/// tenant can finish its durable photo uploads after the window without backdating it.
export async function moveInDefectIntent(
  tx: Prisma.TransactionClient,
  tenancy: WindowTenancy,
  stakeholderId: string,
) {
  if (stakeholderId !== tenancy.tenantId) throw new Error('Tenancy not found')
  const inspection = await tx.inspection.findFirst({
    where: { tenancyId: tenancy.id, kind: 'CHECK_IN', status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  if (!inspection) throw new Error('Move-in notices require a countersigned check-in')
  await lockMoveInDefectTenancy(tx, inspection.id, tenancy.id)
  const current = await tx.tenancy.findUniqueOrThrow({ where: { id: tenancy.id } })
  if (!moveInDefectWindow(current).open) throw new Error('The move-in defect window is closed')
  await assertNoSignedCheckOut(tx, tenancy.id)
  return inspection.id
}

/// Form choices are read from the agreed state only. A pending/disputed tenant notice
/// is never a target for another notice or an agent's working update.
export async function moveInDefectOptions(
  tenancy: WindowTenancy,
  role: TenancyRole,
  pinnedInspectionId?: string | null,
) {
  const window = moveInDefectWindow(tenancy)
  const [inspection, tenantSigned, signedCheckOut] = await Promise.all([
    db.inspection.findFirst({
      where: {
        tenancyId: tenancy.id, kind: 'CHECK_IN', status: 'COMPLETED',
        ...(pinnedInspectionId === undefined ? {} : { id: pinnedInspectionId ?? '' }),
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    }),
    db.signature.findFirst({
      where: { stakeholderId: tenancy.tenantId, inspection: { tenancyId: tenancy.id, kind: 'CHECK_IN' } },
      select: { id: true },
    }),
    db.inspection.findFirst({
      where: { tenancyId: tenancy.id, kind: 'CHECK_OUT', status: 'COMPLETED' },
      select: { id: true },
    }),
  ])
  const state = inspection ? await currentState(inspection.id, { acknowledgedOnly: true }) : []
  return {
    windowDays: window.windowDays,
    opensAt: singaporeCalendarDate(window.opensAt),
    deadline: window.deadline ? singaporeCalendarDate(window.deadline) : null,
    canSubmit: role === 'TENANT' && window.open && Boolean(inspection) && !signedCheckOut,
    canEditWindow: role !== 'TENANT' && !tenantSigned && !signedCheckOut,
    checkInId: inspection?.id ?? null,
    targets: state.flatMap((room) => room.lines.map((line) => ({
      key: line.key, roomName: room.name, name: line.name, category: line.category, condition: line.condition,
    }))),
    checkOutSigned: Boolean(signedCheckOut),
  }
}

/// Publish the tenant's own repair report beside the signed check-in. This path never
/// edits signed inventory or touches the asset register: acknowledging a scratch is
/// not replacing the appliance. Only registered photos the tenant selected are frozen.
export async function publishMoveInDefect(caseId: string, stakeholderId: string, raw: unknown) {
  const input = moveInDefectInput.parse(raw)
  const authorized = await db.maintenanceCase.findFirst({
    where: { id: caseId, tenancy: tenancyScope(stakeholderId) },
    select: { tenancyId: true, reportedById: true, moveInDefectInspectionId: true, tenancy: { select: { tenantId: true } } },
  })
  if (!authorized || authorized.reportedById !== stakeholderId || authorized.tenancy.tenantId !== stakeholderId) {
    throw new Error('Maintenance case not found')
  }
  const inspectionId = authorized.moveInDefectInspectionId
  if (!inspectionId) throw new Error('This repair was not recorded as a move-in defect')

  return db.$transaction(async (tx) => {
    await lockMoveInDefectTenancy(tx, inspectionId, authorized.tenancyId)
    await tx.$queryRaw`SELECT "id" FROM "MaintenanceCase" WHERE "id" = ${caseId} FOR UPDATE`
    const item = await tx.maintenanceCase.findUniqueOrThrow({
      where: { id: caseId },
      include: {
        tenancy: true,
        reportedBy: { select: { name: true } },
        evidence: { orderBy: { createdAt: 'asc' } },
        moveInDefectAddendum: { select: { id: true, inspectionId: true } },
      },
    })
    if (!item.wasPresentAtMoveIn || item.reportedById !== stakeholderId || item.tenancy.tenantId !== stakeholderId) {
      throw new Error('Maintenance case not found')
    }
    // A lost response is safe to retry, including after the window or check-out closes.
    if (item.moveInDefectAddendum) {
      return { addendumId: item.moveInDefectAddendum.id, inspectionId: item.moveInDefectAddendum.inspectionId }
    }
    const inspection = await tx.inspection.findFirst({
      where: { id: inspectionId, tenancyId: item.tenancyId, kind: 'CHECK_IN', status: 'COMPLETED' },
      select: { id: true },
    })
    if (!inspection) throw new Error('Move-in notices require a countersigned check-in')
    const window = moveInDefectWindow(item.tenancy, item.createdAt)
    if (!window.open) throw new Error('The move-in defect window is closed')
    await assertNoSignedCheckOut(tx, item.tenancyId)

    const evidenceIds = new Set(input.evidenceIds)
    const photos = item.evidence.filter((photo) => evidenceIds.has(photo.id))
    if (photos.length !== evidenceIds.size || photos.some((photo) =>
      photo.uploadedById !== stakeholderId || photo.purpose !== 'BEFORE' || !['image/jpeg', 'image/png', 'image/webp'].includes(photo.mimeType),
    )) throw new Error('Move-in notice photo not found')

    const state = await currentState(inspectionId, { acknowledgedOnly: true }, tx)
    const targetRoom = input.targetKey ? state.find((room) => room.lines.some((line) => line.key === input.targetKey)) : null
    const target = targetRoom?.lines.find((line) => line.key === input.targetKey)
    if (input.targetKey && !target) throw new Error('Check-in item not found')
    const latest = await tx.reportAddendum.aggregate({ where: { inspectionId }, _max: { number: true } })
    const number = (latest._max.number ?? 0) + 1
    const publishedAt = new Date()
    const notes = [target?.notes, `Reported present at move-in: ${item.description}`].filter(Boolean).join('\n')
    const addendum = await tx.reportAddendum.create({
      data: {
        inspectionId, number, title: `Move-in defect: ${item.title}`,
        reason: 'The tenant reported this condition as present at move-in. It changes the agreed baseline only if the landlord acknowledges it.',
        effectiveDate: item.createdAt, createdById: stakeholderId,
        publishedAt, publishedById: stakeholderId, sourceMaintenanceCaseId: item.id,
      },
    })
    const entry = await tx.reportAddendumEntry.create({
      data: {
        addendumId: addendum.id, change: target ? 'REPLACED' : 'ADDED', roomName: targetRoom?.name ?? input.roomName,
        targetKey: target?.key ?? null, name: target?.name ?? input.name!, category: target?.category ?? input.category!,
        condition: input.condition, quantity: target?.quantity ?? 1, identifier: target?.identifier ?? null,
        notes, propertyAssetId: target?.propertyAssetId ?? null, maintenanceCaseId: item.id,
        photos: {
          create: photos.map((photo) => ({
            storagePath: photo.storagePath, mimeType: photo.mimeType, sizeBytes: photo.sizeBytes,
            note: photo.note, label: 'Reported at move-in', maintenanceEvidenceId: photo.id,
            annotations: toAnnotations(photo.annotations) ?? undefined,
          })),
        },
      },
      include: { photos: { orderBy: { createdAt: 'asc' } } },
    })
    const snapshot: AddendumSnapshot = {
      schemaVersion: 1, number, title: addendum.title, reason: addendum.reason,
      effectiveDate: item.createdAt.toISOString(), publishedAt: publishedAt.toISOString(), publishedBy: item.reportedBy.name,
      moveInDefect: { caseId: item.id, reportedAt: item.createdAt.toISOString(), deadline: singaporeCalendarDate(window.deadline!) },
      entries: [{
        id: entry.id, change: entry.change, roomName: entry.roomName, notes,
        target: target ? {
          key: target.key, name: target.name, condition: target.condition,
          quantity: target.quantity, identifier: target.identifier, notes: target.notes,
        } : null,
        line: {
          key: target?.key ?? `entry:${entry.id}`, name: entry.name!, category: entry.category!, condition: entry.condition!,
          quantity: entry.quantity, identifier: entry.identifier, notes, propertyAssetId: entry.propertyAssetId,
          meterReading: target?.meterReading ?? null,
        },
        maintenanceCase: { id: item.id, title: item.title },
        photos: entry.photos.map((photo) => ({
          id: photo.id, storagePath: photo.storagePath, mimeType: photo.mimeType, note: photo.note, label: photo.label,
          annotations: toAnnotations(photo.annotations),
        })),
      }],
    }
    const contentHash = addendumHash(snapshot)
    await tx.reportAddendum.update({ where: { id: addendum.id }, data: { snapshot, contentHash } })
    await tx.addendumAcknowledgement.create({
      data: { addendumId: addendum.id, stakeholderId, contentHash, method: 'OWN_ACCOUNT' },
    })
    const recipients = await activeNotificationRecipients(tx, [item.tenancy.landlordId])
    await tx.notification.createMany({
      data: recipients.map((recipientId) => ({
        recipientId, tenancyId: item.tenancyId, kind: 'REPORT_UPDATED' as const, title: addendum.title,
        body: 'The tenant reported this condition as present at move-in. Please acknowledge or dispute the dated notice.',
        href: `/updates/${addendum.id}`, dedupeKey: `move-in-defect:${addendum.id}:${recipientId}`,
      })),
      skipDuplicates: true,
    })
    return { addendumId: addendum.id, inspectionId }
  })
}

/// A disagreement is dated beside the immutable notice, rather than rewriting it or
/// silently promoting it into the check-out baseline. Only the landlord may answer.
export async function disputeMoveInDefect(addendumId: string, stakeholderId: string, raw: unknown) {
  const input = disputeMoveInDefectInput.parse(raw)
  const authorized = await db.reportAddendum.findFirst({
    where: { id: addendumId, publishedAt: { not: null }, inspection: { tenancy: { landlordId: stakeholderId } } },
    select: { inspectionId: true, inspection: { select: { tenancyId: true } } },
  })
  if (!authorized) throw new Error('Addendum not found')
  await db.$transaction(async (tx) => {
    await lockMoveInDefectTenancy(tx, authorized.inspectionId, authorized.inspection.tenancyId)
    await tx.$queryRaw`SELECT "id" FROM "ReportAddendum" WHERE "id" = ${addendumId} FOR UPDATE`
    const row = await tx.reportAddendum.findUniqueOrThrow({
      where: { id: addendumId },
      include: { inspection: { select: { tenancy: true } }, acknowledgements: true },
    })
    const snapshot = addendumSnapshotSchema.parse(row.snapshot)
    if (row.inspection.tenancy.landlordId !== stakeholderId || !snapshot.moveInDefect || !row.publishedAt) {
      throw new Error('Addendum not found')
    }
    if (row.disputedAt) {
      if (row.disputeReason !== input.reason) throw new Error('This move-in notice already has a final response')
      return
    }
    if (row.acknowledgedAt || row.acknowledgements.some((ack) => ack.stakeholderId === stakeholderId)) {
      throw new Error('This move-in notice already has a final response')
    }
    await assertNoSignedCheckOut(tx, row.inspection.tenancy.id)
    await tx.reportAddendum.update({
      where: { id: addendumId },
      data: { disputedAt: new Date(), disputedById: stakeholderId, disputeReason: input.reason },
    })
    const recipients = await activeNotificationRecipients(tx, [row.inspection.tenancy.tenantId])
    await tx.notification.createMany({
      data: recipients.map((recipientId) => ({
        recipientId, tenancyId: row.inspection.tenancy.id, kind: 'REPORT_UPDATED' as const, title: snapshot.title,
        body: `The landlord disputed the move-in notice: ${input.reason}`,
        href: `/updates/${addendumId}`, dedupeKey: `move-in-defect-disputed:${addendumId}:${recipientId}`,
      })),
      skipDuplicates: true,
    })
  })
  return { inspectionId: authorized.inspectionId }
}
