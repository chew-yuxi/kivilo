'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { authorizeInspection, requireAgent } from '@/lib/auth'
import { db } from '@/lib/db'
import { captureExists, createDownloadUrl, createUploadUrl } from '@/lib/storage'
import { annotationInputSchema, toAnnotations } from '@/lib/annotations'
import { assessmentSnapshotSchema } from '@/lib/assessment-schema'
import type { Prisma } from '@/generated/prisma'

// Finding evidence belongs to the separately published assessment. It must never
// become a Capture or ItemEvidence row in the signed inventory, including when the
// finding names a missing check-in item with no check-out room of its own.
async function authorizeFinding(findingId: string, inspectionId: string, agentId: string) {
  const inspection = await authorizeInspection(inspectionId, agentId)
  if (inspection.kind !== 'CHECK_OUT' || !['AWAITING_SIGNATURE', 'COMPLETED'].includes(inspection.status)) {
    throw new Error('Findings require a reviewed check-out')
  }
  const finding = await db.finding.findFirst({ where: { id: findingId, inspectionId }, select: { id: true } })
  if (!finding) throw new Error('Finding not found')
}

async function editFinding<T>(findingId: string, inspectionId: string, edit: (tx: Prisma.TransactionClient) => Promise<T>) {
  return db.$transaction(async (tx) => {
    // Publication and deletion take the same lock. A registration either belongs to
    // the version being published, or to the private draft of the next version.
    const rows = await tx.$queryRaw<{ status: string; kind: string }[]>`
      SELECT "status", "kind" FROM "Inspection" WHERE "id" = ${inspectionId} FOR UPDATE
    `
    if (rows.length !== 1) throw new Error('Finding not found')
    if (rows[0].kind !== 'CHECK_OUT' || !['AWAITING_SIGNATURE', 'COMPLETED'].includes(rows[0].status)) {
      throw new Error('Findings require a reviewed check-out')
    }
    if (!await tx.finding.findFirst({ where: { id: findingId, inspectionId }, select: { id: true } })) {
      throw new Error('Finding not found')
    }
    return edit(tx)
  })
}

const uploadInput = z.object({
  clientId: z.string().uuid(),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
}).strict()

function photoPath(findingId: string, clientId: string, mimeType: string) {
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[mimeType]
  return `findings/${findingId}/${clientId}.${extension}`
}

export async function requestFindingPhotoUpload(findingId: string, inspectionId: string, raw: unknown) {
  const agent = await requireAgent()
  await authorizeFinding(findingId, inspectionId, agent.id)
  const input = uploadInput.parse(raw)
  const storagePath = photoPath(findingId, input.clientId, input.mimeType)
  return editFinding(findingId, inspectionId, async (tx) => {
    // Inspection locks differ across targets. Serialize the global retry id too,
    // always after the inspection lock, so the loser receives a scoped refusal.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`finding-photo:${input.clientId}`}))::text`
    const existing = await tx.findingPhoto.findUnique({ where: { clientId: input.clientId } })
    if (existing && existing.findingId !== findingId) throw new Error('Finding not found')
    if (existing && existing.storagePath !== storagePath) {
      throw new Error('Capture client id already registered')
    }
    if (await tx.storagePurge.findUnique({ where: { path: storagePath }, select: { id: true } })) {
      throw new Error('Photo not found')
    }
    const finding = await tx.finding.findUniqueOrThrow({ where: { id: findingId }, select: { uploadPaths: true } })
    if (!finding.uploadPaths.includes(storagePath)) {
      await tx.finding.update({ where: { id: findingId }, data: { uploadPaths: { push: storagePath } } })
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
  annotations: annotationInputSchema.nullable().optional(),
}).strict()

export async function registerFindingPhoto(findingId: string, inspectionId: string, raw: unknown) {
  const agent = await requireAgent()
  await authorizeFinding(findingId, inspectionId, agent.id)
  const input = photoInput.parse(raw)
  if (input.storagePath !== photoPath(findingId, input.clientId, input.mimeType)) {
    throw new Error('Photo path is invalid')
  }
  const photo = await editFinding(findingId, inspectionId, async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`finding-photo:${input.clientId}`}))::text`
    const existing = await tx.findingPhoto.findUnique({ where: { clientId: input.clientId } })
    if (existing) {
      if (existing.findingId !== findingId) throw new Error('Finding not found')
      const marks = toAnnotations(existing.annotations)
      const originalInput = marks && { w: marks.w, h: marks.h, marks: marks.marks }
      if (existing.storagePath !== input.storagePath ||
          existing.mimeType !== input.mimeType || existing.sizeBytes !== input.sizeBytes ||
          existing.note !== (input.note || null) || JSON.stringify(originalInput) !== JSON.stringify(input.annotations ?? null)) {
        throw new Error('Capture is already registered with different media')
      }
      return existing
    }
    const finding = await tx.finding.findUniqueOrThrow({ where: { id: findingId }, select: { uploadPaths: true } })
    if (!finding.uploadPaths.includes(input.storagePath) ||
        await tx.storagePurge.findUnique({ where: { path: input.storagePath }, select: { id: true } })) {
      throw new Error('Photo not found')
    }
    if (!await captureExists(input.storagePath)) throw new Error('Photo has not reached storage')
    const created = await tx.findingPhoto.create({
      data: {
        findingId,
        clientId: input.clientId,
        storagePath: input.storagePath,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        note: input.note || null,
        ...(input.annotations ? { annotations: { ...input.annotations, v: 1, by: agent.id, at: new Date().toISOString() } } : {}),
      },
    })
    // The existing API uses this timestamp to identify changes since publication.
    await tx.finding.update({ where: { id: findingId }, data: { updatedAt: new Date() } })
    return created
  })
  revalidatePath(`/inspections/${inspectionId}`)
  return { id: photo.id, annotationsApplied: true }
}

export async function findingPhotos(findingId: string, inspectionId: string) {
  const agent = await requireAgent()
  await authorizeFinding(findingId, inspectionId, agent.id)
  const photos = await db.findingPhoto.findMany({ where: { findingId }, orderBy: { createdAt: 'asc' } })
  return { photos: await Promise.all(photos.map(async (photo) => ({
    id: photo.id,
    url: await createDownloadUrl(photo.storagePath),
    mimeType: photo.mimeType,
    sizeBytes: photo.sizeBytes,
    note: photo.note,
    annotations: toAnnotations(photo.annotations),
    createdAt: photo.createdAt.toISOString(),
  }))) }
}

/// Discarding a draft must not destroy evidence from ANY published assessment. Only
/// unreferenced uploads (including unregistered intents) are purged, after signed
/// upload URLs have expired. Signed records are retained by account deletion too.
export async function deleteFindingDraft(findingId: string, inspectionId: string) {
  const agent = await requireAgent()
  await authorizeFinding(findingId, inspectionId, agent.id)
  await editFinding(findingId, inspectionId, async (tx) => {
    const finding = await tx.finding.findUniqueOrThrow({ where: { id: findingId }, include: { photos: true } })
    const versions = await tx.assessmentVersion.findMany({ where: { inspectionId }, select: { snapshot: true } })
    const retained = new Set(versions.flatMap((version) => assessmentSnapshotSchema.parse(version.snapshot).findings
      .flatMap((entry) => (entry.photos ?? []).map((photo) => photo.storagePath))))
    const paths = new Set([...finding.uploadPaths, ...finding.photos.map((photo) => photo.storagePath)])
    const readyAt = new Date(Date.now() + 3 * 60 * 60 * 1000)
    await tx.storagePurge.createMany({
      data: [...paths].filter((path) => !retained.has(path)).map((path) => ({ path, isPrefix: false, readyAt })),
      skipDuplicates: true,
    })
    await tx.finding.delete({ where: { id: findingId } })
  })
  revalidatePath(`/inspections/${inspectionId}`)
}
