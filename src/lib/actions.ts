'use server'

import { randomBytes } from 'node:crypto'
import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { requireAgent, authorizeInspection, authorizeRoom } from '@/lib/auth'
import { createUploadUrl } from '@/lib/storage'
import { processRoom, generateFindings } from '@/lib/inspection/process'
import { annotationInputSchema } from '@/lib/annotations'
import { Prisma } from '@/generated/prisma'
import type {
  InspectionStatus,
  CaptureKind,
  ItemCategory,
  ItemCondition,
  PropertyType,
  Verdict,
} from '@/generated/prisma'

function revalidate(inspectionId: string) {
  revalidatePath(`/inspections/${inspectionId}`)
  revalidatePath('/inspections')
}

type WithStatus = { status: InspectionStatus }

/// Sending a report for signature is the moment it stops being a working document and
/// becomes the thing two people are agreeing to. Nothing that changes what it SAYS may
/// run after that: not a new room, not an item, not a caption, not a mark, and above all
/// not a re-read, which replaces the whole room's inventory.
///
/// The report page renders rooms, items and photo captures for an inspection at
/// AWAITING_SIGNATURE and COMPLETED, so without this an agent could alter a countersigned
/// document and the landlord's copy would silently change under them.
function assertOpen(inspection: WithStatus) {
  if (inspection.status === 'AWAITING_SIGNATURE' || inspection.status === 'COMPLETED') {
    throw new Error('This report has been sent for signature and can no longer be changed')
  }
}

/// Bytes are a weaker case than content. A capture taken before the agent tapped Send
/// may still be draining out of the phone's queue, and refusing it would strand it there
/// forever, which is the one thing the capture invariant forbids. So new bytes are
/// allowed right up to countersignature and refused after it.
function assertNotCountersigned(inspection: WithStatus) {
  if (inspection.status === 'COMPLETED') {
    throw new Error('This report has been countersigned and can no longer be changed')
  }
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
  assertOpen(await authorizeInspection(inspectionId, agentId))
  return item
}

// ---------------------------------------------------------------------------
// Creating a deal
// ---------------------------------------------------------------------------

/// Creates the property, both stakeholders, the tenancy, and the check-in in one go.
/// The signed-in agent is put on the tenancy, which is what makes the result visible
/// to them and to nobody else.
///
/// This deliberately creates a thin tenancy rather than a full deal record. M1 owns the
/// deal wizard; this is the least a check-in needs in order to exist, and M1 will
/// extend these rows rather than replace them.
export async function createInspection(input: {
  line1: string
  unit: string | null
  postalCode: string
  propertyType: PropertyType
  landlordName: string
  landlordEmail: string | null
  tenantName: string
  tenantEmail: string | null
  startDate: string
  endDate: string
  monthlyRent: string
  deposit: string
}) {
  const agent = await requireAgent()

  const required = [input.line1, input.postalCode, input.landlordName, input.tenantName]
  if (required.some((value) => !value.trim())) {
    throw new Error('Address, postal code, landlord, and tenant are all required')
  }

  const start = new Date(input.startDate)
  const end = new Date(input.endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Tenancy dates are not valid')
  }
  if (end <= start) {
    throw new Error('The tenancy must end after it starts')
  }

  const inspection = await db.inspection.create({
    data: {
      kind: 'CHECK_IN',
      // Same reason as the agent below: a scalar id cannot sit beside nested creates.
      conductedBy: { connect: { id: agent.id } },
      tenancy: {
        create: {
          startDate: start,
          endDate: end,
          monthlyRent: input.monthlyRent || '0',
          deposit: input.deposit || '0',
          // connect rather than a scalar agentId: Prisma will not mix a foreign key
          // with nested relation creates in the same input.
          agent: { connect: { id: agent.id } },
          property: {
            create: {
              line1: input.line1.trim(),
              unit: input.unit?.trim() || null,
              postalCode: input.postalCode.trim(),
              type: input.propertyType,
            },
          },
          landlord: {
            create: { name: input.landlordName.trim(), email: input.landlordEmail?.trim() || null },
          },
          tenant: {
            create: { name: input.tenantName.trim(), email: input.tenantEmail?.trim() || null },
          },
        },
      },
    },
  })

  revalidatePath('/inspections')
  return inspection.id
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export async function addRoom(inspectionId: string, name: string) {
  const agent = await requireAgent()
  assertOpen(await authorizeInspection(inspectionId, agent.id))

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
  assertOpen((await authorizeRoom(roomId, agent.id)).inspection)

  await db.room.update({ where: { id: roomId }, data: { name } })
  revalidate(inspectionId)
}

export async function deleteRoom(roomId: string, inspectionId: string) {
  const agent = await requireAgent()
  assertOpen((await authorizeRoom(roomId, agent.id)).inspection)

  await db.room.delete({ where: { id: roomId } })
  revalidate(inspectionId)
}

export async function markRoomReviewed(roomId: string, inspectionId: string) {
  const agent = await requireAgent()
  assertOpen((await authorizeRoom(roomId, agent.id)).inspection)

  await db.room.update({ where: { id: roomId }, data: { status: 'REVIEWED' } })
  revalidate(inspectionId)
}

// ---------------------------------------------------------------------------
// Captures
// ---------------------------------------------------------------------------

/// The browser PUTs media straight to storage with this. It never passes through a
/// function, because a room's walkthrough is far past the serverless body limit.
export async function requestUploadUrl(roomId: string, inspectionId: string, filename: string) {
  const agent = await requireAgent()
  const room = await authorizeRoom(roomId, agent.id)
  // Both ids come from the client, so the pairing is checked here exactly as
  // registerCapture checks it. Without this a room id could be presented against
  // another inspection the caller happens to be on.
  if (room.inspectionId !== inspectionId) throw new Error('Room not found')
  assertNotCountersigned(room.inspection)

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
  /// Marks drawn while the photo was still queued on the phone, so an annotated
  /// capture arrives already annotated, atomically with its row.
  annotations?: unknown
}) {
  const agent = await requireAgent()
  const room = await authorizeRoom(input.roomId, agent.id)
  // The inspection id is client-supplied too; it must be the room's own, or the
  // status write below would land on a deal the caller is not on.
  if (room.inspectionId !== input.inspectionId) throw new Error('Room not found')
  assertNotCountersigned(room.inspection)

  // Marks arriving with a capture get the same guards annotateCapture applies. The
  // capture itself is never rejected over them: the photograph is the evidence and has
  // to land, whereas a mark is an annotation on it. The extra read only happens for the
  // small minority of captures that carry marks.
  let annotations: Prisma.InputJsonValue | typeof Prisma.DbNull = Prisma.DbNull
  if (input.annotations && input.kind === 'PHOTO') {
    const { status } = await authorizeInspection(input.inspectionId, agent.id)
    if (status !== 'AWAITING_SIGNATURE' && status !== 'COMPLETED') {
      annotations = {
        v: 1,
        ...annotationInputSchema.parse(input.annotations),
        by: agent.id,
        at: new Date().toISOString(),
      }
    }
  }

  const created = await db.capture.create({
    data: {
      roomId: input.roomId,
      kind: input.kind,
      storagePath: input.storagePath,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      durationSec: input.durationSec,
      note: input.note,
      annotations,
    },
  })

  // A capture can land after the room has moved on: the inspector tapped Done on a slow
  // connection, or is adding a photo to a room already drafted. Only a room that has not
  // been read yet moves to CAPTURING; a drafted room keeps its status and the capture
  // shows as new against the draft (processedAt stays null until the next read).
  await db.room.updateMany({
    where: { id: input.roomId, status: { in: ['PENDING', 'FAILED'] } },
    data: { status: 'CAPTURING' },
  })
  await db.inspection.updateMany({
    where: { id: input.inspectionId, status: 'DRAFT' },
    data: { status: 'CAPTURING', conductedAt: new Date() },
  })

  revalidate(input.inspectionId)
  return created.id
}

export async function updateCaptureNote(captureId: string, inspectionId: string, note: string | null) {
  const agent = await requireAgent()
  const capture = await db.capture.findUnique({
    where: { id: captureId },
    select: { roomId: true },
  })
  if (!capture) throw new Error('Capture not found')
  assertOpen((await authorizeRoom(capture.roomId, agent.id)).inspection)

  await db.capture.update({ where: { id: captureId }, data: { note } })
  revalidate(inspectionId)
}

/// Replaces the marks on one photo, or clears them when passed null. The stored
/// object is never touched: what changes is a column beside it.
export async function annotateCapture(
  captureId: string,
  inspectionId: string,
  input: unknown,
) {
  const agent = await requireAgent()
  const capture = await db.capture.findUnique({
    where: { id: captureId },
    select: { roomId: true, kind: true },
  })
  if (!capture) throw new Error('Capture not found')
  const room = await authorizeRoom(capture.roomId, agent.id)
  // The inspection id is client-supplied and must be the capture's own, so a valid
  // capture id cannot be paired with another agent's inspection id.
  if (room.inspectionId !== inspectionId) throw new Error('Capture not found')
  assertOpen(room.inspection)
  if (capture.kind !== 'PHOTO') throw new Error('Only photos can be marked up')

  // Parsing rather than clamping: this is a public HTTP endpoint, so an out-of-range
  // payload is a rejection, not a silent truncation.
  const parsed = input === null ? null : annotationInputSchema.parse(input)

  await db.capture.update({
    where: { id: captureId },
    data: {
      // Prisma needs DbNull to write SQL NULL to a Json? column; JsonNull would write a
      // JSON null, which reads back as a row of the wrong shape.
      annotations: parsed
        ? { v: 1, ...parsed, by: agent.id, at: new Date().toISOString() }
        : Prisma.DbNull,
    },
  })
  revalidate(inspectionId)
}

export async function deleteCapture(captureId: string, inspectionId: string) {
  const agent = await requireAgent()
  const capture = await db.capture.findUnique({
    where: { id: captureId },
    select: { roomId: true },
  })
  if (!capture) throw new Error('Capture not found')
  assertOpen((await authorizeRoom(capture.roomId, agent.id)).inspection)

  await db.capture.delete({ where: { id: captureId } })
  revalidate(inspectionId)
}

/// Called once the inspector says the room is fully captured. Extraction takes minutes,
/// so the page polls the room's status rather than waiting on the response.
export async function finishRoomCapture(roomId: string, inspectionId: string) {
  const agent = await requireAgent()
  // Re-reading a room deletes and rewrites its inventory. On a signed report that would
  // change the very lines both parties put their names to.
  assertOpen((await authorizeRoom(roomId, agent.id)).inspection)

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
  assertOpen((await authorizeRoom(roomId, agent.id)).inspection)

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
