'use server'

import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { createUploadUrl } from '@/lib/storage'
import { processInspection, generateFindings } from '@/lib/inspection/process'
import type { ItemCategory, ItemCondition, Verdict } from '@/generated/prisma'

function revalidate(inspectionId: string) {
  revalidatePath(`/inspections/${inspectionId}`)
  revalidatePath('/')
}

/// The browser PUTs the video straight to storage with this. It never passes through
/// a function — a 10-minute walkthrough is far past the serverless body limit.
export async function requestUploadUrl(inspectionId: string, filename: string) {
  const extension = filename.split('.').pop()?.toLowerCase() || 'mp4'
  const storagePath = `${inspectionId}/${Date.now()}.${extension}`
  const { signedUrl, token } = await createUploadUrl(storagePath)

  await db.inspection.update({ where: { id: inspectionId }, data: { status: 'CAPTURING' } })
  revalidate(inspectionId)

  return { storagePath, signedUrl, token }
}

export async function registerCapture(input: {
  inspectionId: string
  storagePath: string
  mimeType: string
  sizeBytes: number
  durationSec: number | null
}) {
  await db.capture.create({
    data: {
      inspectionId: input.inspectionId,
      storagePath: input.storagePath,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      durationSec: input.durationSec,
    },
  })
  await db.inspection.update({
    where: { id: input.inspectionId },
    data: { status: 'PROCESSING', conductedAt: new Date() },
  })
  revalidate(input.inspectionId)

  // Extraction takes minutes; the page polls the inspection's status instead of waiting.
  after(async () => {
    await processInspection(input.inspectionId).catch((error) => {
      console.error(`Processing failed for ${input.inspectionId}:`, error)
    })
  })
}

export async function updateItem(
  itemId: string,
  inspectionId: string,
  data: {
    name?: string
    category?: ItemCategory
    condition?: ItemCondition
    quantity?: number
    notes?: string | null
    meterReading?: string | null
  },
) {
  await db.inspectionItem.update({
    where: { id: itemId },
    // A human has taken ownership of this line; the model's confidence no longer applies.
    data: { ...data, editedByHuman: true, confidence: null },
  })
  revalidate(inspectionId)
}

export async function deleteItem(itemId: string, inspectionId: string) {
  await db.inspectionItem.delete({ where: { id: itemId } })
  revalidate(inspectionId)
}

export async function addItem(roomId: string, inspectionId: string) {
  await db.inspectionItem.create({
    data: {
      roomId,
      name: 'New item',
      category: 'FIXTURE',
      condition: 'GOOD',
      editedByHuman: true,
    },
  })
  revalidate(inspectionId)
}

export async function completeReview(inspectionId: string) {
  await db.inspection.update({
    where: { id: inspectionId },
    data: { status: 'AWAITING_SIGNATURE' },
  })
  revalidate(inspectionId)
}

export async function signInspection(
  inspectionId: string,
  stakeholderId: string,
  imageData: string,
) {
  const ip = (await headers()).get('x-forwarded-for')

  await db.signature.upsert({
    where: { inspectionId_stakeholderId: { inspectionId, stakeholderId } },
    create: { inspectionId, stakeholderId, imageData, ipAddress: ip },
    update: { imageData, ipAddress: ip, signedAt: new Date() },
  })

  const inspection = await db.inspection.findUniqueOrThrow({
    where: { id: inspectionId },
    include: { tenancy: true, signatures: true },
  })

  // The report freezes only once both sides of the tenancy have signed.
  const required = [inspection.tenancy.landlordId, inspection.tenancy.tenantId]
  const signed = new Set(inspection.signatures.map((s) => s.stakeholderId))
  if (required.every((id) => signed.has(id))) {
    await db.inspection.update({ where: { id: inspectionId }, data: { status: 'COMPLETED' } })
  }

  revalidate(inspectionId)
}

export async function runFindings(inspectionId: string) {
  await generateFindings(inspectionId)
  revalidate(inspectionId)
}

export async function updateFinding(
  findingId: string,
  inspectionId: string,
  data: { verdict?: Verdict; rationale?: string; estimatedCost?: string | null },
) {
  await db.finding.update({
    where: { id: findingId },
    data: { ...data, editedByHuman: true, confidence: null },
  })
  revalidate(inspectionId)
}

/// Opens the check-out against a completed check-in. Both reports then live on the
/// same property record and the diff has a baseline to measure from.
export async function startCheckOut(baselineId: string) {
  const baseline = await db.inspection.findUniqueOrThrow({ where: { id: baselineId } })

  const checkOut = await db.inspection.create({
    data: {
      tenancyId: baseline.tenancyId,
      kind: 'CHECK_OUT',
      status: 'DRAFT',
      baselineId,
      conductedById: baseline.conductedById,
    },
  })

  revalidate(baselineId)
  return checkOut.id
}
