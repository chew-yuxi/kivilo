'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  authorizeAddendum,
  authorizeInspection,
  authorizeOwnAcknowledgement,
  inspectionScope,
  requireAgent,
  requireStakeholder,
} from '@/lib/auth'
import { authorizeMaintenanceCase } from '@/lib/maintenance'
import { captureExists, createUploadUrl } from '@/lib/storage'
import { propertyLabel } from '@/lib/format'
import { activeNotificationRecipients } from '@/lib/notification-recipients'
import { ADDENDUM_PHOTO_TYPES, addendumHash, addendumSnapshotSchema, currentState, type AddendumSnapshot } from '@/lib/addenda'
import { CATEGORIES, CONDITIONS } from '@/lib/inspection/schema'
import type { StateLine } from '@/lib/addenda-state'
import type { AcknowledgementMethod, ItemCategory, Prisma } from '@/generated/prisma'
import { assertNoSignedCheckOut, lockMoveInDefectTenancy, MoveInDefectStaleTargetError } from '@/lib/move-in-defects'

// Addenda: dated updates to a countersigned check-in, written and published by the agent
// and acknowledged by both parties. They never touch the signed rooms, items, captures
// or signatures, so the freeze guards in actions.ts stay exactly as they are. Every id
// below is attacker-controlled; a refusal throws the same error as a missing row.

function revalidate(inspectionId: string) {
  revalidatePath(`/inspections/${inspectionId}`)
}

async function assertSignedCheckIn(inspectionId: string, agentId: string) {
  const inspection = await authorizeInspection(inspectionId, agentId)
  if (inspection.kind !== 'CHECK_IN' || inspection.status !== 'COMPLETED') {
    throw new Error('Only a countersigned check-in can be updated')
  }
}

/// A published addendum is what both parties acknowledge, so nothing may change it. The
/// row lock orders every draft edit against publishing.
async function editDraft<T>(addendumId: string, edit: (tx: Prisma.TransactionClient) => Promise<T>) {
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ publishedAt: Date | null }[]>`
      SELECT "publishedAt" FROM "ReportAddendum" WHERE "id" = ${addendumId} FOR UPDATE
    `
    if (rows.length !== 1) throw new Error('Addendum not found')
    if (rows[0].publishedAt) throw new Error('This update has been published and can no longer be changed')
    return edit(tx)
  })
}

async function lockInspection(tx: Prisma.TransactionClient, inspectionId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Inspection" WHERE "id" = ${inspectionId} FOR UPDATE`
}

/// The open draft for this check-in, made if there is none. One at a time, so two
/// browser tabs cannot each start an update.
async function openDraft(inspectionId: string, agentId: string, title = '') {
  return db.$transaction(async (tx) => {
    await lockInspection(tx, inspectionId)
    const draft = await tx.reportAddendum.findFirst({
      where: { inspectionId, publishedAt: null },
      select: { id: true },
    })
    if (draft) return draft.id
    const created = await tx.reportAddendum.create({
      data: { inspectionId, title, effectiveDate: new Date(), createdById: agentId },
    })
    return created.id
  })
}

export async function startAddendum(inspectionId: string) {
  const agent = await requireAgent()
  await assertSignedCheckIn(inspectionId, agent.id)
  const id = await openDraft(inspectionId, agent.id)
  revalidate(inspectionId)
  return id
}

const detailsInput = z.object({
  title: z.string().trim().max(200),
  reason: z.string().trim().max(2000).nullable(),
  effectiveDate: z.iso.date(),
})

export async function updateAddendum(addendumId: string, raw: unknown) {
  const agent = await requireAgent()
  const addendum = await authorizeAddendum(addendumId, agent.id)
  const input = detailsInput.parse(raw)
  await editDraft(addendumId, (tx) => tx.reportAddendum.update({
    where: { id: addendumId },
    data: { title: input.title, reason: input.reason || null, effectiveDate: new Date(input.effectiveDate) },
  }))
  revalidate(addendum.inspectionId)
}

const entryInput = z.object({
  change: z.enum(['ADDED', 'REPLACED', 'REMOVED']),
  roomName: z.string().trim().max(120).default(''),
  targetKey: z.string().regex(/^(item|entry):[A-Za-z0-9]+$/).nullable().default(null),
  name: z.string().trim().max(200).nullable().default(null),
  category: z.enum(CATEGORIES).nullable().default(null),
  condition: z.enum(CONDITIONS).nullable().default(null),
  quantity: z.number().int().min(1).max(999).default(1),
  identifier: z.string().trim().max(250).nullable().default(null),
  notes: z.string().trim().max(2000).nullable().default(null),
}).refine((input) => (input.change === 'ADDED') === (input.targetKey === null), {
  message: 'Choose the item this replaces or removes',
  path: ['targetKey'],
}).refine((input) => input.change === 'REMOVED' || (input.name && input.category && input.condition), {
  message: 'Name the new item, with its category and condition',
  path: ['name'],
}).refine((input) => input.change !== 'ADDED' || input.roomName, {
  message: 'Choose the room',
  path: ['roomName'],
})

/// The entry as stored. A targeted entry takes its room from the line it changes, read
/// from the published state, so a key cannot point at a line that is not in the report.
async function entryData(inspectionId: string, raw: unknown, tx: Prisma.TransactionClient) {
  const input = entryInput.parse(raw)
  let roomName = input.roomName
  if (input.targetKey) {
    const room = (await currentState(inspectionId, { acknowledgedOnly: false }, tx))
      .find((candidate) => candidate.lines.some((line) => line.key === input.targetKey))
    if (!room) throw new Error('Item not found')
    roomName = room.name
  }
  const replacing = input.change !== 'REMOVED'
  return {
    change: input.change,
    roomName,
    targetKey: input.targetKey,
    name: replacing ? input.name : null,
    category: replacing ? input.category : null,
    condition: replacing ? input.condition : null,
    quantity: input.quantity,
    identifier: replacing ? input.identifier || null : null,
    notes: input.notes || null,
  }
}

export async function addAddendumEntry(addendumId: string, raw: unknown) {
  const agent = await requireAgent()
  const addendum = await authorizeAddendum(addendumId, agent.id)
  const entry = await editDraft(addendumId, async (tx) =>
    tx.reportAddendumEntry.create({ data: { addendumId, ...(await entryData(addendum.inspectionId, raw, tx)) } }))
  revalidate(addendum.inspectionId)
  return entry.id
}

/// Confirms the entry really is on the addendum the caller named, so a valid entry id
/// cannot be paired with someone else's addendum.
async function authorizeEntry(entryId: string, addendumId: string, agentId: string) {
  const entry = await db.reportAddendumEntry.findUnique({ where: { id: entryId }, select: { addendumId: true } })
  if (!entry || entry.addendumId !== addendumId) throw new Error('Entry not found')
  return authorizeAddendum(addendumId, agentId)
}

export async function updateAddendumEntry(entryId: string, addendumId: string, raw: unknown) {
  const agent = await requireAgent()
  const addendum = await authorizeEntry(entryId, addendumId, agent.id)
  await editDraft(addendumId, async (tx) =>
    tx.reportAddendumEntry.update({ where: { id: entryId }, data: await entryData(addendum.inspectionId, raw, tx) }))
  revalidate(addendum.inspectionId)
}

export async function deleteAddendumEntry(entryId: string, addendumId: string) {
  const agent = await requireAgent()
  const addendum = await authorizeEntry(entryId, addendumId, agent.id)
  await editDraft(addendumId, async (tx) => {
    const entry = await tx.reportAddendumEntry.findUniqueOrThrow({ where: { id: entryId }, select: { uploadPaths: true } })
    const photos = await tx.reportAddendumPhoto.findMany({ where: { entryId }, select: { storagePath: true } })
    await purgeUploads(tx, [...entry.uploadPaths, ...photos.map((photo) => photo.storagePath)])
    await tx.reportAddendumEntry.delete({ where: { id: entryId } })
  })
  revalidate(addendum.inspectionId)
}

/// Throws the draft away: its entries, its photo rows, and the photos it uploaded. Only a
/// draft; a published update is what the parties acknowledge and stays for good.
export async function discardAddendum(addendumId: string) {
  const agent = await requireAgent()
  const addendum = await authorizeAddendum(addendumId, agent.id)
  await editDraft(addendumId, async (tx) => {
    // A signed URL can outlive this draft without ever producing a photo row.
    // Sweep its whole upload folder after those URLs expire; repair evidence
    // lives under maintenance/ and is never part of this prefix.
    await tx.storagePurge.create({
      data: { path: `addenda/${addendumId}`, isPrefix: true, readyAt: new Date(Date.now() + 3 * 60 * 60 * 1000) },
    })
    await tx.reportAddendum.delete({ where: { id: addendumId } })
  })
  revalidate(addendum.inspectionId)
}

/// Objects this addendum uploaded, never a repair's evidence it only referenced. Delayed,
/// because a signed upload URL can still write for two hours after the row is gone.
async function purgeUploads(tx: Prisma.TransactionClient, paths: string[]) {
  const uploads = paths.filter((path) => path.startsWith('addenda/'))
  if (uploads.length === 0) return
  const readyAt = new Date(Date.now() + 3 * 60 * 60 * 1000)
  await tx.storagePurge.createMany({
    data: uploads.map((path) => ({ path, isPrefix: false, readyAt })),
    skipDuplicates: true,
  })
}

const uploadInput = z.object({
  clientId: z.string().uuid(),
  mimeType: z.enum(ADDENDUM_PHOTO_TYPES),
})

function photoPath(addendumId: string, clientId: string, mimeType: string) {
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[mimeType]
  return `addenda/${addendumId}/${clientId}.${extension}`
}

/// The browser PUTs the photo straight to storage with this, as captures do. Photos come
/// from whoever has them, a landlord or a contractor; the agent uploads them.
export async function requestAddendumPhotoUpload(entryId: string, addendumId: string, raw: unknown) {
  const agent = await requireAgent()
  await authorizeEntry(entryId, addendumId, agent.id)
  const input = uploadInput.parse(raw)
  const storagePath = photoPath(addendumId, input.clientId, input.mimeType)
  return editDraft(addendumId, async (tx) => {
    const entry = await tx.reportAddendumEntry.findFirst({
      where: { id: entryId, addendumId }, select: { uploadPaths: true },
    })
    if (!entry) throw new Error('Entry not found')
    if (await tx.storagePurge.findUnique({ where: { path: storagePath }, select: { id: true } })) {
      throw new Error('Photo not found')
    }
    if (!entry.uploadPaths.includes(storagePath)) {
      await tx.reportAddendumEntry.update({ where: { id: entryId }, data: { uploadPaths: { push: storagePath } } })
    }
    if (await captureExists(storagePath)) return { storagePath, signedUrl: null, token: null }
    const { signedUrl, token } = await createUploadUrl(storagePath)
    return { storagePath, signedUrl, token }
  })
}

const photoInput = uploadInput.extend({
  storagePath: z.string(),
  sizeBytes: z.number().int().positive().max(50_000_000),
  note: z.string().trim().max(500).nullable().default(null),
})

export async function registerAddendumPhoto(entryId: string, addendumId: string, raw: unknown) {
  const agent = await requireAgent()
  const addendum = await authorizeEntry(entryId, addendumId, agent.id)
  const input = photoInput.parse(raw)
  if (input.storagePath !== photoPath(addendumId, input.clientId, input.mimeType)) {
    throw new Error('Photo path is invalid')
  }
  if (!await captureExists(input.storagePath)) throw new Error('Photo has not reached storage')
  const photo = await editDraft(addendumId, async (tx) => {
    if (await tx.storagePurge.findUnique({ where: { path: input.storagePath }, select: { id: true } })) {
      throw new Error('Photo not found')
    }
    const existing = await tx.reportAddendumPhoto.findFirst({
      where: { entryId, storagePath: input.storagePath },
      select: { id: true },
    })
    return existing ?? tx.reportAddendumPhoto.create({
      data: {
        entryId,
        storagePath: input.storagePath,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        note: input.note || null,
      },
    })
  })
  revalidate(addendum.inspectionId)
  return photo.id
}

export async function deleteAddendumPhoto(photoId: string, addendumId: string) {
  const agent = await requireAgent()
  const photo = await db.reportAddendumPhoto.findUnique({
    where: { id: photoId },
    select: { storagePath: true, entry: { select: { addendumId: true } } },
  })
  if (!photo || photo.entry.addendumId !== addendumId) throw new Error('Photo not found')
  const addendum = await authorizeAddendum(addendumId, agent.id)
  await editDraft(addendumId, async (tx) => {
    await purgeUploads(tx, [photo.storagePath])
    await tx.reportAddendumPhoto.delete({ where: { id: photoId } })
  })
  revalidate(addendum.inspectionId)
}

const ITEM_CATEGORIES: readonly string[] = CATEGORIES

/// "Add to the report as an update" on a resolved repair. Opens (or reuses) the draft on
/// the tenancy's signed check-in and prefills one entry from the case: a replacement of
/// the line linked to the repaired asset when there is one, otherwise an added line. The
/// case's before and after photos come by reference, as the assessment snapshot does.
export async function addendumFromMaintenanceCase(caseId: string) {
  const agent = await requireAgent()
  const { maintenanceCase, role } = await authorizeMaintenanceCase(caseId, agent.id)
  if (role !== 'AGENT') throw new Error('Maintenance case not found')
  if (maintenanceCase.status !== 'RESOLVED') throw new Error('Only a resolved repair can be added to the report')
  const checkIn = await db.inspection.findFirst({
    where: {
      AND: [
        { tenancyId: maintenanceCase.tenancyId, kind: 'CHECK_IN', status: 'COMPLETED' },
        inspectionScope(agent.id),
      ],
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  if (!checkIn) throw new Error('Only a countersigned check-in can be updated')

  const addendumId = await openDraft(checkIn.id, agent.id, maintenanceCase.title)
  await editDraft(addendumId, async (tx) => {
    const already = await tx.reportAddendumEntry.findFirst({
      where: { addendumId, maintenanceCaseId: caseId },
      select: { id: true },
    })
    if (already) return

    const state = await currentState(checkIn.id, { acknowledgedOnly: false }, tx)
    const asset = maintenanceCase.propertyAsset
    const room = asset ? state.find((each) => each.lines.some((line) => line.propertyAssetId === asset.id)) : undefined
    const target = room?.lines.find((line) => line.propertyAssetId === asset?.id)
    const category: ItemCategory = target?.category
      ?? (asset && ITEM_CATEGORIES.includes(asset.category) ? asset.category as ItemCategory : 'FIXTURE')
    const fixedOn = (maintenanceCase.resolvedAt ?? new Date()).toLocaleDateString('en-SG', { dateStyle: 'long' })
    await tx.reportAddendumEntry.create({
      data: {
        addendumId,
        change: target ? 'REPLACED' : 'ADDED',
        roomName: room?.name ?? asset?.roomLabel ?? state[0]?.name ?? 'General',
        targetKey: target?.key ?? null,
        name: target?.name ?? asset?.name ?? maintenanceCase.title,
        category,
        condition: 'GOOD',
        identifier: target ? null : asset?.identifier ?? null,
        notes: `Repair: ${maintenanceCase.title}, confirmed fixed ${fixedOn}.`,
        maintenanceCaseId: caseId,
        photos: {
          create: maintenanceCase.evidence
            .filter((item) => item.purpose !== 'RECEIPT' && (ADDENDUM_PHOTO_TYPES as readonly string[]).includes(item.mimeType))
            .map((item) => ({
              storagePath: item.storagePath,
              mimeType: item.mimeType,
              sizeBytes: item.sizeBytes,
              note: item.note,
              label: item.purpose === 'BEFORE' ? 'Before' : 'After',
              maintenanceEvidenceId: item.id,
            })),
        },
      },
    })
  })
  revalidate(checkIn.id)
  return { addendumId, inspectionId: checkIn.id }
}

/// Freezes the draft into a numbered, hashed snapshot and asks both parties to
/// acknowledge it. It does not count anywhere until both have.
export async function publishAddendum(addendumId: string) {
  const agent = await requireAgent()
  const authorized = await authorizeAddendum(addendumId, agent.id)
  await assertSignedCheckIn(authorized.inspectionId, agent.id)

  const published = await db.$transaction(async (tx) => {
    // The inspection lock orders numbering; the addendum lock orders it against edits.
    await lockInspection(tx, authorized.inspectionId)
    const [row] = await tx.$queryRaw<{ publishedAt: Date | null }[]>`
      SELECT "publishedAt" FROM "ReportAddendum" WHERE "id" = ${addendumId} FOR UPDATE
    `
    if (row.publishedAt) throw new Error('This update has been published and can no longer be changed')

    const addendum = await tx.reportAddendum.findUniqueOrThrow({
      where: { id: addendumId },
      include: {
        entries: {
          orderBy: { createdAt: 'asc' },
          include: { photos: { orderBy: { createdAt: 'asc' } }, maintenanceCase: { select: { id: true, title: true } } },
        },
        inspection: { select: { tenancy: { select: { id: true, propertyId: true, landlordId: true, tenantId: true, property: true } } } },
      },
    })
    if (!addendum.title.trim()) throw new Error('Give the update a title before publishing')
    if (addendum.entries.length === 0) throw new Error('Add at least one change before publishing')
    const targets = addendum.entries.flatMap((entry) => (entry.targetKey ? [entry.targetKey] : []))
    if (new Set(targets).size !== targets.length) throw new Error('Each item can change only once in an update')

    const lines = new Map<string, StateLine>(
      (await currentState(authorized.inspectionId, { acknowledgedOnly: false }, tx))
        .flatMap((room) => room.lines.map((line) => [line.key, line] as const)),
    )
    const { tenancy } = addendum.inspection

    const entries: AddendumSnapshot['entries'] = []
    for (const entry of addendum.entries) {
      const target = entry.targetKey ? lines.get(entry.targetKey) : null
      if (entry.targetKey && !target) throw new Error('An item this update changes is no longer in the report')

      // The asset register follows the report: a replaced or removed appliance is
      // retired, and an identified new one is registered.
      if (target?.propertyAssetId) {
        await tx.propertyAsset.updateMany({
          where: { id: target.propertyAssetId, propertyId: tenancy.propertyId },
          data: { active: false },
        })
      }
      let propertyAssetId: string | null = null
      if (entry.change !== 'REMOVED' && entry.category === 'APPLIANCE' && entry.identifier) {
        const asset = await tx.propertyAsset.create({
          data: {
            propertyId: tenancy.propertyId,
            name: entry.name!,
            category: 'APPLIANCE',
            roomLabel: entry.roomName,
            identifier: entry.identifier,
          },
        })
        propertyAssetId = asset.id
        await tx.reportAddendumEntry.update({ where: { id: entry.id }, data: { propertyAssetId } })
      }

      entries.push({
        id: entry.id,
        change: entry.change,
        roomName: entry.roomName,
        notes: entry.notes,
        target: target
          ? {
              key: target.key,
              name: target.name,
              condition: target.condition,
              quantity: target.quantity,
              identifier: target.identifier,
              notes: target.notes,
            }
          : null,
        line: entry.change === 'REMOVED'
          ? null
          : {
              key: `entry:${entry.id}`,
              name: entry.name!,
              category: entry.category!,
              condition: entry.condition!,
              quantity: entry.quantity,
              identifier: entry.identifier,
              notes: entry.notes,
              propertyAssetId,
            },
        maintenanceCase: entry.maintenanceCase,
        photos: entry.photos.map((photo) => ({
          id: photo.id,
          storagePath: photo.storagePath,
          mimeType: photo.mimeType,
          note: photo.note,
          label: photo.label,
        })),
      })
    }

    const latest = await tx.reportAddendum.aggregate({
      where: { inspectionId: authorized.inspectionId },
      _max: { number: true },
    })
    const number = (latest._max.number ?? 0) + 1
    const publishedAt = new Date()
    const snapshot: AddendumSnapshot = {
      schemaVersion: 1,
      number,
      title: addendum.title.trim(),
      reason: addendum.reason,
      effectiveDate: addendum.effectiveDate.toISOString(),
      publishedAt: publishedAt.toISOString(),
      publishedBy: agent.name,
      entries,
    }
    const contentHash = addendumHash(snapshot)
    await tx.reportAddendum.update({
      where: { id: addendumId },
      data: { number, publishedAt, publishedById: agent.id, snapshot, contentHash },
    })

    const address = propertyLabel(tenancy.property)
    const recipients = await activeNotificationRecipients(tx, [tenancy.landlordId, tenancy.tenantId])
    await tx.notification.createMany({
      data: recipients.map((recipientId) => ({
        recipientId,
        tenancyId: tenancy.id,
        kind: 'REPORT_UPDATED' as const,
        title: `The report for ${address} was updated`,
        body: `Update ${number}: ${snapshot.title}. Please review it and acknowledge it.`,
        href: `/updates/${addendumId}`,
        dedupeKey: `addendum:${addendumId}:${recipientId}`,
      })),
      skipDuplicates: true,
    })
    return { number, contentHash }
  })

  revalidate(authorized.inspectionId)
  return published
}

/// "I acknowledge this update", by the landlord or tenant, as themselves. Records who,
/// when, from where, and the hash of exactly what they were shown. The second party's
/// acknowledgement is what makes the addendum count.
export async function acknowledgeAddendum(addendumId: string) {
  const party = await requireStakeholder()
  const authorized = await authorizeOwnAcknowledgement(addendumId, party.id)
  await recordAcknowledgement(addendumId, party.id, 'OWN_ACCOUNT')
  revalidatePath(`/updates/${addendumId}`)
  revalidate(authorized.inspectionId)
}

/// The landlord or tenant acknowledges on the agent's phone, for a party with no email
/// or who is simply there, as `signInspection` takes a signature. The agent's session
/// authorizes the addendum; the party id comes from the request, so it is checked
/// against the tenancy under the lock, and anyone else reads like a missing addendum.
export async function acknowledgeAddendumInPerson(addendumId: string, stakeholderId: string) {
  const agent = await requireAgent()
  const authorized = await authorizeAddendum(addendumId, agent.id)
  if (!authorized.publishedAt) throw new Error('Addendum not found')
  await recordAcknowledgement(addendumId, z.string().min(1).parse(stakeholderId), 'IN_PERSON')
  revalidatePath(`/updates/${addendumId}`)
  revalidate(authorized.inspectionId)
}

/// Both ways of acknowledging end here, so both record the same row and the second
/// party's acknowledgement completes the addendum whichever way it came.
async function recordAcknowledgement(addendumId: string, stakeholderId: string, method: AcknowledgementMethod) {
  const ip = (await headers()).get('x-forwarded-for')
  await db.$transaction(async (tx) => {
    const location = await tx.reportAddendum.findUniqueOrThrow({
      where: { id: addendumId },
      select: { inspectionId: true, inspection: { select: { tenancyId: true } } },
    })
    await lockMoveInDefectTenancy(tx, location.inspectionId, location.inspection.tenancyId)
    await tx.$queryRaw`SELECT "id" FROM "ReportAddendum" WHERE "id" = ${addendumId} FOR UPDATE`
    const addendum = await tx.reportAddendum.findUniqueOrThrow({
      where: { id: addendumId },
      select: {
        contentHash: true,
        title: true,
        publishedAt: true,
        sourceMaintenanceCaseId: true,
        snapshot: true,
        disputedAt: true,
        acknowledgedAt: true,
        acknowledgements: { select: { stakeholderId: true } },
        inspection: { select: { tenancy: { select: { landlordId: true, tenantId: true } } } },
      },
    })
    const { landlordId, tenantId } = addendum.inspection.tenancy
    if (!addendum.publishedAt || (stakeholderId !== landlordId && stakeholderId !== tenantId)) throw new Error('Addendum not found')
    const done = new Set(addendum.acknowledgements.map((ack) => ack.stakeholderId))
    const snapshot = addendumSnapshotSchema.parse(addendum.snapshot)
    const isMoveInDefect = Boolean(snapshot.moveInDefect)
    if (isMoveInDefect) {
      if (method !== 'OWN_ACCOUNT') throw new Error('Addendum not found')
      if (done.has(stakeholderId)) return
      if (stakeholderId !== landlordId) throw new Error('Addendum not found')
      if (addendum.disputedAt) throw new Error('This move-in notice already has a final response')
      await assertNoSignedCheckOut(tx, location.inspection.tenancyId)
      const agreedKeys = new Set((await currentState(location.inspectionId, { acknowledgedOnly: true }, tx))
        .flatMap((room) => room.lines.map((line) => line.key)))
      if (snapshot.entries.some((entry) => entry.target && !agreedKeys.has(entry.target.key))) {
        throw new MoveInDefectStaleTargetError()
      }
    }
    if (!done.has(stakeholderId)) {
      await tx.addendumAcknowledgement.create({
        data: { addendumId, stakeholderId, ipAddress: ip, contentHash: addendum.contentHash!, method },
      })
      done.add(stakeholderId)
    }
    if (!addendum.acknowledgedAt && done.has(landlordId) && done.has(tenantId)) {
      await tx.reportAddendum.update({ where: { id: addendumId }, data: { acknowledgedAt: new Date() } })
      if (isMoveInDefect) {
        const recipients = await activeNotificationRecipients(tx, [tenantId])
        await tx.notification.createMany({
          data: recipients.map((recipientId) => ({
            recipientId, tenancyId: location.inspection.tenancyId, kind: 'REPORT_UPDATED' as const, title: addendum.title,
            body: 'The landlord acknowledged your move-in notice. It now counts in the agreed check-in baseline.',
            href: `/updates/${addendumId}`, dedupeKey: `move-in-defect-acknowledged:${addendumId}:${recipientId}`,
          })),
          skipDuplicates: true,
        })
      }
    }
  })
}
