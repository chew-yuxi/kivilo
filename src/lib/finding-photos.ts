import { isDeepStrictEqual } from 'node:util'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authorizeInspection, inspectionScope } from '@/lib/auth'
import { annotationInputSchema, toAnnotations, type AnnotationInput } from '@/lib/annotations'
import { captureExists, createDownloadUrl, createUploadUrl } from '@/lib/storage'
import { posterUrls } from '@/lib/poster-urls'
import { Prisma, type FindingPhoto } from '@/generated/prisma'

const uuid = z.string().uuid()
const mimeType = z.enum(['image/jpeg', 'image/png', 'image/webp'])
const uploadInput = z.object({ clientId: uuid, mimeType, findingId: z.string().min(1).nullable().optional() }).strict()
const photoInput = uploadInput.omit({ findingId: true }).extend({
  storagePath: z.string().min(1), sizeBytes: z.number().int().positive().max(50_000_000),
  note: z.string().trim().max(1000).nullable().default(null),
  annotations: annotationInputSchema.nullable().default(null),
}).strict()
const editInput = z.object({
  note: z.string().trim().max(1000).nullable().optional(),
  annotations: annotationInputSchema.nullable().optional(),
}).strict().refine((input) => Object.keys(input).length > 0)

function annotationData(annotations: AnnotationInput | null, actorId: string) {
  return annotations ? { v: 1, ...annotations, by: actorId, at: new Date().toISOString() } : Prisma.DbNull
}

async function editInspection<T>(inspectionId: string, actorId: string, edit: (tx: Prisma.TransactionClient) => Promise<T>) {
  const authorized = await authorizeInspection(inspectionId, actorId)
  return db.$transaction(async (tx) => {
    // Sharing changes take the tenancy lock. Recheck access after waiting for it,
    // before issuing a signed upload URL or changing any finding evidence.
    await tx.$queryRaw`SELECT "id" FROM "Tenancy" WHERE "id" = ${authorized.tenancyId} FOR UPDATE`
    await tx.$queryRaw`SELECT "id" FROM "Inspection" WHERE "id" = ${inspectionId} FOR UPDATE`
    const inspection = await tx.inspection.findFirst({
      where: { id: inspectionId, ...inspectionScope(actorId) },
      select: { kind: true, status: true },
    })
    if (!inspection) throw new Error('Inspection not found')
    if (inspection.kind !== 'CHECK_OUT' || !['AWAITING_SIGNATURE', 'COMPLETED'].includes(inspection.status)) {
      throw new Error('Findings require a reviewed check-out')
    }
    return edit(tx)
  })
}

function revalidate(inspectionId: string) { revalidatePath(`/inspections/${inspectionId}`) }

async function ownedDraft(tx: Prisma.TransactionClient, inspectionId: string, draftId: string, actorId: string) {
  const draft = await tx.findingPhotoDraft.findUnique({ where: { id: uuid.parse(draftId) } })
  if (draft && (draft.inspectionId !== inspectionId || draft.createdById !== actorId)) throw new Error('Finding photo draft not found')
  return draft
}

async function openDraft(tx: Prisma.TransactionClient, inspectionId: string, draftId: string, actorId: string, findingId?: string | null) {
  const draft = await ownedDraft(tx, inspectionId, draftId, actorId)
  if (draft) {
    if (findingId !== undefined && findingId !== draft.findingId) throw new Error('Finding photo draft not found')
    return draft
  }
  if (findingId && !await tx.finding.findFirst({ where: { id: findingId, inspectionId }, select: { id: true } })) throw new Error('Finding not found')
  return tx.findingPhotoDraft.create({ data: { id: draftId, inspectionId, createdById: actorId, findingId } })
}

function assertOpenDraft(draft: { savedAt: Date | null; discardedAt: Date | null }) {
  if (draft.savedAt || draft.discardedAt) throw new Error('This finding photo draft is closed')
}

export async function findingPhotoView(photo: FindingPhoto) {
  return {
    id: photo.clientId, clientId: photo.clientId, mimeType: photo.mimeType, sizeBytes: photo.sizeBytes,
    note: photo.note, annotations: toAnnotations(photo.annotations), createdAt: photo.createdAt.toISOString(),
    registeredAt: photo.registeredAt?.toISOString() ?? null,
    url: photo.registeredAt ? await createDownloadUrl(photo.storagePath) : null,
    posterUrl: photo.registeredAt ? (await posterUrls([photo.storagePath])).get(photo.storagePath) ?? null : null,
  }
}

export async function findingPhotoDraft(inspectionId: string, draftId: string, actorId: string) {
  await authorizeInspection(inspectionId, actorId)
  const draft = await ownedDraft(db, inspectionId, draftId, actorId)
  const photos = draft ? await db.findingPhoto.findMany({ where: { draftId, deletedAt: null }, orderBy: [{ createdAt: 'asc' }, { clientId: 'asc' }] }) : []
  return {
    draftId, findingId: draft?.findingId ?? null,
    state: draft?.discardedAt ? 'DISCARDED' : draft?.savedAt ? 'CLAIMED' : 'OPEN',
    savedAt: draft?.savedAt?.toISOString() ?? null, discardedAt: draft?.discardedAt?.toISOString() ?? null,
    photos: await Promise.all(photos.map(findingPhotoView)),
  }
}

export async function requestFindingPhotoUpload(inspectionId: string, draftId: string, actorId: string, raw: unknown) {
  const input = uploadInput.parse(raw)
  return editInspection(inspectionId, actorId, async (tx) => {
    const draft = await openDraft(tx, inspectionId, draftId, actorId, input.findingId)
    const existing = await tx.findingPhoto.findUnique({ where: { clientId: input.clientId } })
    if (existing && (existing.draftId !== draftId || existing.mimeType !== input.mimeType || existing.deletedAt)) throw new Error('Finding photo not found')
    if (existing?.registeredAt) return { storagePath: existing.storagePath, alreadyUploaded: true, alreadyRegistered: true, photoId: existing.clientId }
    assertOpenDraft(draft)
    const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[input.mimeType]
    const storagePath = `findings/${inspectionId}/${draftId}/${input.clientId}.${extension}`
    if (await tx.storagePurge.findUnique({ where: { path: storagePath }, select: { id: true } })) throw new Error('Finding photo not found')
    if (!existing) await tx.findingPhoto.create({ data: { clientId: input.clientId, draftId, storagePath, mimeType: input.mimeType } })
    if (await captureExists(storagePath)) return { storagePath, alreadyUploaded: true }
    return { storagePath, ...await createUploadUrl(storagePath) }
  })
}

export async function registerFindingPhoto(inspectionId: string, draftId: string, actorId: string, raw: unknown) {
  const input = photoInput.parse(raw)
  const result = await editInspection(inspectionId, actorId, async (tx) => {
    const draft = await ownedDraft(tx, inspectionId, draftId, actorId)
    const photo = await tx.findingPhoto.findUnique({ where: { clientId: input.clientId } })
    if (!draft || !photo || photo.draftId !== draftId || photo.deletedAt || draft.discardedAt) throw new Error('Finding photo not found')
    if (photo.storagePath !== input.storagePath || photo.mimeType !== input.mimeType) throw new Error('Photo path is invalid')
    if (photo.registeredAt) {
      const stored = toAnnotations(photo.annotations)
      const geometry = stored ? { w: stored.w, h: stored.h, marks: stored.marks } : null
      return { id: photo.clientId, annotationsApplied: isDeepStrictEqual(geometry, input.annotations), noteApplied: photo.note === input.note }
    }
    assertOpenDraft(draft)
    if (!await captureExists(photo.storagePath)) throw new Error('Photo has not reached storage')
    await tx.findingPhoto.update({ where: { clientId: photo.clientId }, data: {
      registeredAt: new Date(), sizeBytes: input.sizeBytes, note: input.note,
      annotations: annotationData(input.annotations, actorId),
    } })
    return { id: photo.clientId, annotationsApplied: true, noteApplied: true }
  })
  revalidate(inspectionId)
  return result
}

/// Called by create/updateFinding while holding the inspection lock. No intent may
/// be omitted: Save waits for registration, then atomically attaches the whole draft.
export async function claimFindingPhotoDraft(tx: Prisma.TransactionClient, inspectionId: string, draftId: string | undefined, actorId: string, findingId: string) {
  if (!draftId) return
  const draft = await ownedDraft(tx, inspectionId, draftId, actorId)
  if (draft?.savedAt) {
    if (draft.findingId !== findingId) throw new Error('Finding photo draft not found')
    return
  }
  if (draft?.discardedAt || (draft?.findingId && draft.findingId !== findingId)) throw new Error('Finding photo draft not found')
  if (await tx.findingPhoto.count({ where: { draftId, deletedAt: null, registeredAt: null } })) throw new Error('Finding photos are still uploading')
  if (draft) await tx.findingPhotoDraft.update({ where: { id: draftId }, data: { findingId, savedAt: new Date() } })
  else await tx.findingPhotoDraft.create({ data: { id: uuid.parse(draftId), inspectionId, createdById: actorId, findingId, savedAt: new Date() } })
  await tx.findingPhoto.updateMany({ where: { draftId, deletedAt: null }, data: { findingId } })
}

export async function assertFindingPhotoDraftsReady(tx: Prisma.TransactionClient, inspectionId: string) {
  const pending = await tx.findingPhotoDraft.findMany({
    where: { inspectionId, findingId: { not: null }, savedAt: null, discardedAt: null, photos: { some: { deletedAt: null } } },
    select: { createdById: true }, distinct: ['createdById'],
  })
  const incomplete = await tx.findingPhoto.findFirst({ where: { finding: { inspectionId }, deletedAt: null, registeredAt: null }, select: { clientId: true } })
  if (incomplete) throw new Error('Finding photos are still uploading or have unsaved changes')
  // Publication holds the tenancy and inspection locks. Revoked agents' personal
  // drafts stay intact, but cannot prevent publishing the saved shared findings.
  for (const draft of pending) {
    if (await tx.inspection.findFirst({ where: { id: inspectionId, ...inspectionScope(draft.createdById) }, select: { id: true } })) {
      throw new Error('Finding photos are still uploading or have unsaved changes')
    }
  }
}

async function retirePhotos(tx: Prisma.TransactionClient, photos: FindingPhoto[], readyAt = new Date(Date.now() + 3 * 60 * 60 * 1000)) {
  for (const photo of photos) {
    // publishedAt is set under this same inspection lock before publication returns.
    // A snapshot guard also preserves bytes if a retention repair removed the marker.
    const issued = photo.publishedAt || await tx.assessmentVersion.findFirst({
      where: { snapshot: { path: ['findings'], array_contains: [{ photos: [{ storagePath: photo.storagePath }] }] } }, select: { id: true },
    })
    if (!issued) await tx.storagePurge.createMany({ data: [{ path: photo.storagePath, isPrefix: false, readyAt }], skipDuplicates: true })
  }
  if (photos.length) await tx.findingPhoto.updateMany({ where: { clientId: { in: photos.map((photo) => photo.clientId) } }, data: { deletedAt: new Date() } })
}

export async function discardFindingPhotoDraft(inspectionId: string, draftId: string, actorId: string) {
  await editInspection(inspectionId, actorId, async (tx) => {
    const draft = await ownedDraft(tx, inspectionId, draftId, actorId)
    if (draft?.savedAt || draft?.discardedAt) return
    await retirePhotos(tx, await tx.findingPhoto.findMany({ where: { draftId, deletedAt: null } }))
    if (draft) await tx.findingPhotoDraft.update({ where: { id: draftId }, data: { discardedAt: new Date() } })
    else await tx.findingPhotoDraft.create({ data: { id: uuid.parse(draftId), inspectionId, createdById: actorId, discardedAt: new Date() } })
  })
  revalidate(inspectionId)
}

export async function editFindingPhoto(inspectionId: string, actorId: string, clientId: string, owner: { draftId: string } | { findingId: string }, raw: unknown) {
  const input = editInput.parse(raw)
  await mutatePhoto(inspectionId, actorId, clientId, owner, async (tx, photo) => {
    await tx.findingPhoto.update({ where: { clientId: photo.clientId }, data: {
      ...(input.note === undefined ? {} : { note: input.note }),
      ...(input.annotations === undefined ? {} : { annotations: annotationData(input.annotations, actorId) }),
    } })
  })
}

export async function deleteFindingPhoto(inspectionId: string, actorId: string, clientId: string, owner: { draftId: string } | { findingId: string }) {
  await mutatePhoto(inspectionId, actorId, clientId, owner, async (tx, photo) => retirePhotos(tx, [photo]), true)
}

async function mutatePhoto(inspectionId: string, actorId: string, clientId: string, owner: { draftId: string } | { findingId: string }, edit: (tx: Prisma.TransactionClient, photo: FindingPhoto) => Promise<void>, allowDeleted = false) {
  await editInspection(inspectionId, actorId, async (tx) => {
    const photo = await tx.findingPhoto.findUnique({ where: { clientId: uuid.parse(clientId) }, include: { draft: true, finding: { select: { inspectionId: true } } } })
    if (!photo || photo.draft.inspectionId !== inspectionId) throw new Error('Finding photo not found')
    if ('draftId' in owner) {
      if (photo.draftId !== owner.draftId || photo.draft.createdById !== actorId) throw new Error('Finding photo not found')
      assertOpenDraft(photo.draft)
    } else if (photo.findingId !== owner.findingId || photo.finding?.inspectionId !== inspectionId) throw new Error('Finding photo not found')
    if (photo.deletedAt) {
      if (allowDeleted) return
      throw new Error('Finding photo not found')
    }
    await edit(tx, photo)
    if (photo.findingId) await tx.finding.update({ where: { id: photo.findingId }, data: { updatedAt: new Date() } })
  })
  revalidate(inspectionId)
}

/// `readyAt` defers the bytes' removal; a finding moved to the bin keeps them until it expires.
export async function retireFindingPhotos(tx: Prisma.TransactionClient, inspectionId: string, findingId: string, readyAt?: Date) {
  const drafts = await tx.findingPhotoDraft.findMany({ where: { inspectionId, findingId }, select: { id: true } })
  await retirePhotos(tx, await tx.findingPhoto.findMany({ where: { OR: [{ findingId }, { draftId: { in: drafts.map((draft) => draft.id) } }], deletedAt: null } }), readyAt)
  await tx.findingPhotoDraft.updateMany({ where: { findingId, savedAt: null, discardedAt: null }, data: { discardedAt: new Date() } })
}

export async function retireInspectionFindingPhotos(tx: Prisma.TransactionClient, inspectionId: string) {
  await retirePhotos(tx, await tx.findingPhoto.findMany({ where: { draft: { inspectionId }, deletedAt: null } }))
}

/// Operator-only account cleanup, not an HTTP action. Unsaved personal photographs
/// are not tenancy history; saved/published photographs stay with the shared report.
export async function retireFindingDraftsForAccount(actorId: string) {
  const drafts = await db.findingPhotoDraft.findMany({ where: { createdById: actorId, savedAt: null, discardedAt: null }, select: { id: true, inspectionId: true } })
  for (const draft of drafts) await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Inspection" WHERE "id" = ${draft.inspectionId} FOR UPDATE`
    const current = await tx.findingPhotoDraft.findUnique({ where: { id: draft.id } })
    if (!current || current.savedAt || current.discardedAt) return
    await retirePhotos(tx, await tx.findingPhoto.findMany({ where: { draftId: draft.id, deletedAt: null } }))
    await tx.findingPhotoDraft.update({ where: { id: draft.id }, data: { discardedAt: new Date() } })
  })
}
