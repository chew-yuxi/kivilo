'use server'

import { randomBytes } from 'node:crypto'
import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { requireAgent, authorizeInspection, authorizeRoom } from '@/lib/auth'
import { createUploadUrl } from '@/lib/storage'
import { processRoom, generateFindings } from '@/lib/inspection/process'
import type { CaptureKind, ItemCategory, ItemCondition, Verdict } from '@/generated/prisma'

function revalidate(inspectionId: string) {
  revalidatePath(`/inspections/${inspectionId}`)
  revalidatePath('/')
}

// Every action below starts by resolving the signed-in agent and checking that the id
// it was handed belongs to a deal that agent is on. Server actions are public HTTP
// endpoints: an id in an argument is attacker-controlled, so none of these may trust
// one. See src/lib/auth.ts, which is the boundary.

/// Resolves the item's room, authorizes it, and confirms the item really sits in the
/// inspection the caller named, so a valid item id cannot be paired with someone
/// else's inspection id.
async function authorizeItem(itemId: string, inspectionId: string, agentId: string) {
  const item = await db.inspectionItem.findUnique({
    where: { id: itemId },
    select: { id: true, room: { select: { inspectionId: true } } },
  })
  if (!item || item.room.inspectionId !== inspectionId) throw new Error('Item not found')
  await authorizeInspection(inspectionId, agentId)
  return item
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export async function addRoom(inspectionId: string, name: string) {
  const agent = await requireAgent()
  await authorizeInspection(inspectionId, agent.id)

  const last = await db.room.findFirst({
    where: { inspectionId },
    orderBy: { order: 'desc' },
    select: { order: true },
  })

  const room = await db.room.create({
    data: { inspectionId, name, order: (last?.order ?? -1) + 1 },
  })

  revalidate(inspectionId)
  return room.id
}

export async function renameRoom(roomId: string, inspectionId: string, name: string) {
  const agent = await requireAgent()
  await authorizeRoom(roomId, agent.id)

  await db.room.update({ where: { id: roomId }, data: { name } })
  revalidate(inspectionId)
}

export async function deleteRoom(roomId: string, inspectionId: string) {
  const agent = await requireAgent()
  await authorizeRoom(roomId, agent.id)

  await db.room.delete({ where: { id: roomId } })
  revalidate(inspectionId)
}

/// Re-runs extraction for one room. Its own items are replaced; every other room,
/// including ones already reviewed, is untouched.
export async function reprocessRoom(roomId: string, inspectionId: string) {
  const agent = await requireAgent()
  await authorizeRoom(roomId, agent.id)

  await db.room.update({ where: { id: roomId }, data: { status: 'PROCESSING' } })
  revalidate(inspectionId)

  after(async () => {
    await processRoom(roomId).catch((error) => {
      console.error(`Processing failed for room ${roomId}:`, error)
    })
  })
}

export async function markRoomReviewed(roomId: string, inspectionId: string) {
  const agent = await requireAgent()
  await authorizeRoom(roomId, agent.id)

  await db.room.update({ where: { id: roomId }, data: { status: 'REVIEWED' } })
  revalidate(inspectionId)
}

// ---------------------------------------------------------------------------
// Captures
// ---------------------------------------------------------------------------

/// The browser PUTs media straight to storage with this. It never passes through a
/// function, because a room's walkthrough is far past the serverless body limit.
export async function requestUploadUrl(roomId: string, filename: string) {
  const agent = await requireAgent()
  await authorizeRoom(roomId, agent.id)

  const extension = filename.split('.').pop()?.toLowerCase() || 'mp4'
  const storagePath = `${roomId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`
  const { signedUrl, token } = await createUploadUrl(storagePath)
  return { storagePath, signedUrl, token }
}

export async function registerCapture(input: {
  roomId: string
  inspectionId: string
  kind: CaptureKind
  storagePath: string
  mimeType: string
  sizeBytes: number
  durationSec: number | null
  note: string | null
}) {
  const agent = await requireAgent()
  await authorizeRoom(input.roomId, agent.id)

  await db.capture.create({
    data: {
      roomId: input.roomId,
      kind: input.kind,
      storagePath: input.storagePath,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      durationSec: input.durationSec,
      note: input.note,
    },
  })

  await db.room.update({ where: { id: input.roomId }, data: { status: 'CAPTURING' } })
  await db.inspection.update({
    where: { id: input.inspectionId },
    data: { status: 'CAPTURING', conductedAt: new Date() },
  })

  revalidate(input.inspectionId)
}

export async function deleteCapture(captureId: string, inspectionId: string) {
  const agent = await requireAgent()
  const capture = await db.capture.findUnique({
    where: { id: captureId },
    select: { roomId: true },
  })
  if (!capture) throw new Error('Capture not found')
  await authorizeRoom(capture.roomId, agent.id)

  await db.capture.delete({ where: { id: captureId } })
  revalidate(inspectionId)
}

/// Called once the inspector says the room is fully captured. Extraction takes minutes,
/// so the page polls the room's status rather than waiting on the response.
export async function finishRoomCapture(roomId: string, inspectionId: string) {
  const agent = await requireAgent()
  await authorizeRoom(roomId, agent.id)

  await db.room.update({ where: { id: roomId }, data: { status: 'PROCESSING' } })
  revalidate(inspectionId)

  after(async () => {
    await processRoom(roomId).catch((error) => {
      console.error(`Processing failed for room ${roomId}:`, error)
    })
  })
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export async function updateItem(
  itemId: string,
  inspectionId: string,
  data: {
    name?: string
    category?: ItemCategory
    condition?: ItemCondition
    quantity?: number
    notes?: string | null
    identifier?: string | null
    meterReading?: string | null
  },
) {
  const agent = await requireAgent()
  await authorizeItem(itemId, inspectionId, agent.id)

  await db.inspectionItem.update({
    where: { id: itemId },
    // A human has taken ownership of this line; the model's confidence no longer applies.
    data: { ...data, editedByHuman: true, confidence: null },
  })
  revalidate(inspectionId)
}

export async function deleteItem(itemId: string, inspectionId: string) {
  const agent = await requireAgent()
  await authorizeItem(itemId, inspectionId, agent.id)

  await db.inspectionItem.delete({ where: { id: itemId } })
  revalidate(inspectionId)
}

export async function addItem(roomId: string, inspectionId: string) {
  const agent = await requireAgent()
  await authorizeRoom(roomId, agent.id)

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

// ---------------------------------------------------------------------------
// Inspection lifecycle
// ---------------------------------------------------------------------------

export async function completeReview(inspectionId: string) {
  const agent = await requireAgent()
  await authorizeInspection(inspectionId, agent.id)

  const unreviewed = await db.room.count({
    where: { inspectionId, status: { not: 'REVIEWED' } },
  })
  if (unreviewed > 0) {
    throw new Error(`${unreviewed} rooms still need review`)
  }

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
  const agent = await requireAgent()
  await authorizeInspection(inspectionId, agent.id)

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
  const agent = await requireAgent()
  await authorizeInspection(inspectionId, agent.id)

  await generateFindings(inspectionId)
  revalidate(inspectionId)
}

export async function updateFinding(
  findingId: string,
  inspectionId: string,
  data: { verdict?: Verdict; rationale?: string; estimatedCost?: string | null },
) {
  const agent = await requireAgent()
  const finding = await db.finding.findUnique({
    where: { id: findingId },
    select: { inspectionId: true },
  })
  if (!finding || finding.inspectionId !== inspectionId) throw new Error('Finding not found')
  await authorizeInspection(inspectionId, agent.id)

  await db.finding.update({
    where: { id: findingId },
    data: { ...data, editedByHuman: true, confidence: null },
  })
  revalidate(inspectionId)
}

// ---------------------------------------------------------------------------
// Sharing
// ---------------------------------------------------------------------------

/// Mints the read-only link handed to the landlord and tenant. The token is the only
/// credential guarding a document that names both parties and their unit, so it is
/// 256 bits of CSPRNG output rather than a cuid or anything derived from the row.
/// Calling this twice returns the same link; revoke and re-share to rotate it.
export async function shareReport(inspectionId: string) {
  const agent = await requireAgent()
  await authorizeInspection(inspectionId, agent.id)

  const existing = await db.inspection.findUniqueOrThrow({
    where: { id: inspectionId },
    select: { shareToken: true, status: true },
  })

  if (existing.status !== 'COMPLETED') {
    throw new Error('Only a countersigned report can be shared')
  }
  if (existing.shareToken) return existing.shareToken

  const token = randomBytes(32).toString('base64url')
  await db.inspection.update({
    where: { id: inspectionId },
    data: { shareToken: token, sharedAt: new Date() },
  })

  revalidate(inspectionId)
  return token
}

/// Revoking clears the token, so the old link 404s exactly like a report that never
/// existed. Sharing again mints a new one.
export async function revokeReportLink(inspectionId: string) {
  const agent = await requireAgent()
  await authorizeInspection(inspectionId, agent.id)

  await db.inspection.update({
    where: { id: inspectionId },
    data: { shareToken: null, sharedAt: null },
  })
  revalidate(inspectionId)
}

/// Opens the check-out against a completed check-in. Both reports then live on the
/// same property record and the diff has a baseline to measure from.
export async function startCheckOut(baselineId: string) {
  const agent = await requireAgent()
  await authorizeInspection(baselineId, agent.id)

  const baseline = await db.inspection.findUniqueOrThrow({
    where: { id: baselineId },
    include: { rooms: { orderBy: { order: 'asc' } } },
  })

  const checkOut = await db.inspection.create({
    data: {
      tenancyId: baseline.tenancyId,
      kind: 'CHECK_OUT',
      status: 'DRAFT',
      baselineId,
      conductedById: baseline.conductedById,
      // Pre-create the same rooms so the inspector walks the same route, and the
      // diff compares like with like rather than guessing at renamed rooms.
      rooms: {
        create: baseline.rooms.map((room) => ({ name: room.name, order: room.order })),
      },
    },
  })

  revalidate(baselineId)
  return checkOut.id
}
