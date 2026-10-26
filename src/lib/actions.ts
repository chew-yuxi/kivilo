'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAgent, requireStakeholder, authorizeInspection, authorizeOwnSignature, authorizeRoom, inspectionScope, tenancyScope } from '@/lib/auth'
import { captureExists, createUploadUrl, removePrefix } from '@/lib/storage'
import { reportPrefix } from '@/lib/report-pdf/model'
import { annotationInputSchema } from '@/lib/annotations'
import { templateRows } from '@/lib/room-templates'
import { assertCanAddProperty } from '@/lib/plan'
import { reportFingerprint } from '@/lib/report-fingerprint'
import { queueSignatureRequests, queueSignedCopies, queueTenantHandover, signingParties } from '@/lib/report-email'
import { currentState } from '@/lib/addenda'
import { checkInPhotoUrls, roomBaselines } from '@/lib/check-in-reference'
import { Prisma } from '@/generated/prisma'
import { claimFindingPhotoDraft, retireFindingPhotos } from '@/lib/finding-photos'
import { lockAgency, lockAgencyTenancy, requireAgencyMembership } from '@/lib/agency'
import { binCapture, binFinding, binItem, binRoom, reinsert } from '@/lib/bin'
import { restoreAllowed } from '@/lib/bin-rules'
import { fieldChanges, inspectionPlace, recordBurst, recordEvent } from '@/lib/property-history'
import type {
  ChangeType,
  InspectionStatus,
  CaptureKind,
  ItemCategory,
  ItemCondition,
  FurnishingLevel,
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

// Lock the parent row for both content edits and Send. A status check made before an
// unconditional item/caption update can race with Send and change what was signed.
// The row lock makes those two operations occur in a definite order.
async function lockInspection(tx: Prisma.TransactionClient, inspectionId: string) {
  const rows = await tx.$queryRaw<{ status: InspectionStatus }[]>`
    SELECT "status" FROM "Inspection" WHERE "id" = ${inspectionId} FOR UPDATE
  `
  if (rows.length !== 1) throw new Error('Inspection not found')
  // Recheck after the lock: a request authorized before deletion may have waited
  // behind moving the property to Recently deleted. It must not send or edit it.
  if (!await tx.inspection.findFirst({
    where: { id: inspectionId, tenancy: { property: { trashedAt: null } } }, select: { id: true },
  })) throw new Error('Inspection not found')
  return rows[0]
}

async function editOpenInspection<T>(
  inspectionId: string,
  actorId: string,
  edit: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return db.$transaction(async (tx) => {
    assertOpen(await lockAgentInspection(tx, inspectionId, actorId))
    return edit(tx)
  })
}

async function lockAgentInspection(tx: Prisma.TransactionClient, inspectionId: string, actorId: string) {
  const inspection = await tx.inspection.findUnique({ where: { id: inspectionId }, select: { tenancyId: true } })
  if (!inspection) throw new Error('Inspection not found')
  await lockAgencyTenancy(inspection.tenancyId, tx)
  const current = await lockInspection(tx, inspectionId)
  await authorizeInspection(inspectionId, actorId, { client: tx })
  return current
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
    select: { id: true, roomId: true, room: { select: { inspectionId: true } } },
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
///
/// A landlord or tenant with an email is matched to the person already on file under
/// it, so they see every deal that names them from the one login. The name the agent
/// typed does not overwrite the one on file, since other deals show that name too.
export async function createInspection(input: {
  agencyId?: string
  line1: string
  unit: string | null
  postalCode: string
  propertyType: PropertyType
  furnishingLevel?: FurnishingLevel
  fullyFurnished?: boolean
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

  const landlordEmail = input.landlordEmail?.trim().toLowerCase() || null
  const tenantEmail = input.tenantEmail?.trim().toLowerCase() || null
  if (landlordEmail && landlordEmail === tenantEmail) {
    throw new Error('The landlord and tenant need different email addresses')
  }
  const party = (name: string, email: string | null) => {
    const create = { name: name.trim(), email }
    return email ? { connectOrCreate: { where: { email }, create } } : { create }
  }
  const furnishingLevel = input.furnishingLevel
    ?? (input.fullyFurnished === false ? 'UNFURNISHED' : 'FULLY_FURNISHED')

  const inspection = await db.$transaction(async (tx) => {
    if (input.agencyId) {
      await lockAgency(input.agencyId, tx)
      await requireAgencyMembership(input.agencyId, agent.id, tx)
    }
    await assertCanAddProperty(agent, input.agencyId ?? null, tx)
    return tx.inspection.create({
    data: {
      kind: 'CHECK_IN',
      furnishingLevel,
      // Kept in sync for app builds released before the three-way field existed.
      fullyFurnished: furnishingLevel === 'FULLY_FURNISHED',
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
          ...(input.agencyId && { agency: { connect: { id: input.agencyId } } }),
          property: {
            create: {
              line1: input.line1.trim(),
              unit: input.unit?.trim() || null,
              postalCode: input.postalCode.trim(),
              type: input.propertyType,
            },
          },
          landlord: party(input.landlordName, landlordEmail),
          tenant: party(input.tenantName, tenantEmail),
        },
      },
    },
    })
  })

  revalidatePath('/inspections')
  return inspection.id
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export async function addRoom(inspectionId: string, name: string) {
  const agent = await requireAgent()
  const inspection = await authorizeInspection(inspectionId, agent.id)
  assertOpen(inspection)

  const room = await editOpenInspection(inspectionId, agent.id, async (tx) => {
    const last = await tx.room.findFirst({
      where: { inspectionId },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    // The room's standard rows, made as addItem makes a line. Items are listed by
    // createdAt, so each gets its own millisecond to keep the template's order.
    const now = Date.now()
    const rows = templateRows(name, inspection.furnishingLevel)
    await recordEvent(tx, { ...await inspectionPlace(tx, inspectionId), actorId: agent.id, kind: 'ROOM_ADDED', summary: `added the room ${name}` })
    return tx.room.create({
      data: {
        inspectionId,
        name,
        order: (last?.order ?? -1) + 1,
        items: {
          create: rows.map((row, index) => ({
            ...row,
            condition: 'GOOD',
            editedByHuman: true,
            createdAt: new Date(now + index),
          })),
        },
      },
    })
  })

  revalidate(inspectionId)
  return room.id
}

export async function renameRoom(roomId: string, inspectionId: string, name: string) {
  const agent = await requireAgent()
  const room = await authorizeRoom(roomId, agent.id)
  if (room.inspectionId !== inspectionId) throw new Error('Room not found')
  assertOpen(room.inspection)

  await editOpenInspection(inspectionId, agent.id, async (tx) => {
    const before = await tx.room.findUniqueOrThrow({ where: { id: roomId }, select: { name: true } })
    await tx.room.update({ where: { id: roomId }, data: { name } })
    if (before.name !== name) {
      await recordEvent(tx, {
        ...await inspectionPlace(tx, inspectionId), actorId: agent.id, kind: 'ROOM_RENAMED',
        summary: `renamed ${before.name} to ${name}`, changes: [{ field: 'Name', from: before.name, to: name }],
      })
    }
  })
  revalidate(inspectionId)
}

export async function deleteRoom(roomId: string, inspectionId: string) {
  const agent = await requireAgent()
  const room = await authorizeRoom(roomId, agent.id)
  if (room.inspectionId !== inspectionId) throw new Error('Room not found')
  assertOpen(room.inspection)

  await editOpenInspection(inspectionId, agent.id, async (tx) => {
    const current = await tx.room.findFirst({
      where: { id: roomId, inspectionId },
      select: { id: true },
    })
    if (!current) throw new Error('Room not found')
    // The bin keeps the rows, and its prefix tombstone keeps the room's media until it
    // expires. A signed upload URL's two-hour window is long over by then.
    const bin = await binRoom(tx, roomId, agent.id)
    await tx.room.delete({ where: { id: roomId } })
    await recordEvent(tx, { ...await inspectionPlace(tx, inspectionId), actorId: agent.id, kind: 'ROOM_DELETED', summary: `deleted ${bin.label}`, binItemId: bin.id })
  })
  revalidate(inspectionId)
}

/// A reviewed room with no items tells both parties there was nothing in it to record,
/// so reviewing one has to be asked for in so many words, as a no-damage assessment is.
/// Released app builds cannot ask, and keep the refusal they have always had.
export async function markRoomReviewed(
  roomId: string,
  inspectionId: string,
  { nothingToRecord = false }: { nothingToRecord?: boolean } = {},
) {
  const agent = await requireAgent()
  const room = await authorizeRoom(roomId, agent.id)
  if (room.inspectionId !== inspectionId) throw new Error('Room not found')
  assertOpen(room.inspection)

  await editOpenInspection(inspectionId, agent.id, async (tx) => {
    const current = await tx.room.findUniqueOrThrow({
      where: { id: roomId },
      select: { status: true, _count: { select: { items: true } } },
    })
    if (current.status !== 'REVIEW' && current.status !== 'REVIEWED') {
      throw new Error('Finish capturing this room before reviewing it')
    }
    if (current._count.items === 0 && !nothingToRecord) {
      throw new Error('Add at least one item, or confirm there is nothing to record, before reviewing this room')
    }
    // processedAt marks a capture a person has reviewed the room with. The report only
    // shows those, so a photo that lands after Send never joins what was agreed.
    await tx.capture.updateMany({ where: { roomId, processedAt: null }, data: { processedAt: new Date() } })
    const reviewed = await tx.room.update({ where: { id: roomId }, data: { status: 'REVIEWED' } })
    await recordEvent(tx, {
      ...await inspectionPlace(tx, inspectionId), actorId: agent.id, kind: 'ROOM_REVIEWED',
      summary: nothingToRecord && current._count.items === 0 ? `reviewed ${reviewed.name}: nothing to record` : `reviewed ${reviewed.name}`,
    })
  })
  revalidate(inspectionId)
}

// ---------------------------------------------------------------------------
// Captures
// ---------------------------------------------------------------------------

/// The browser PUTs media straight to storage with this. It never passes through a
/// function, because a room's walkthrough is far past the serverless body limit.
export async function requestUploadUrl(
  roomId: string,
  inspectionId: string,
  filename: string,
): Promise<{ storagePath: string; signedUrl: string; token: string; alreadyUploaded: false }>
export async function requestUploadUrl(
  roomId: string,
  inspectionId: string,
  filename: string,
  clientId: string | undefined,
): Promise<{
  storagePath: string
  signedUrl: string | null
  token: string | null
  alreadyUploaded: boolean
}>
export async function requestUploadUrl(
  roomId: string,
  inspectionId: string,
  filename: string,
  clientId?: string,
) {
  const agent = await requireAgent()
  const room = await authorizeRoom(roomId, agent.id)
  // Both ids come from the client, so the pairing is checked here exactly as
  // registerCapture checks it. Without this a room id could be presented against
  // another inspection the caller happens to be on.
  if (room.inspectionId !== inspectionId) throw new Error('Room not found')
  assertNotCountersigned(room.inspection)

  const extension = filename.split('.').pop()?.toLowerCase() || 'mp4'
  if (!/^(jpe?g|png|heic|heif|mp4|mov|webm)$/.test(extension)) {
    throw new Error('Unsupported capture file type')
  }
  if (clientId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientId)) {
    throw new Error('Invalid capture client id')
  }
  const storagePath = clientId
    ? `${roomId}/${clientId}.${extension}`
    : `${roomId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`
  // Hold the same parent lock as Send and account-erasure cleanup while issuing a
  // signed token. Otherwise an already authorized request could mint a two-hour
  // upload credential for a room after its inspection was deleted.
  return db.$transaction(async (tx) => {
    assertNotCountersigned(await lockAgentInspection(tx, inspectionId, agent.id))
    const currentRoom = await tx.room.findFirst({
      where: { id: roomId, inspectionId },
      select: { id: true },
    })
    if (!currentRoom) throw new Error('Room not found')
    if (await tx.storagePurge.findUnique({ where: { path: storagePath }, select: { id: true } })) {
      throw new Error('Capture was deleted')
    }
    if (clientId && await captureExists(storagePath)) {
      return { storagePath, signedUrl: null, token: null, alreadyUploaded: true }
    }
    const { signedUrl, token } = await createUploadUrl(storagePath)
    return { storagePath, signedUrl, token, alreadyUploaded: false }
  })
}

export async function registerCapture(input: {
  roomId: string
  inspectionId: string
  clientId?: string
  /// The inventory line this evidence was taken for. It must still belong to this
  /// room, and can only gain evidence before the report is sent for signature.
  itemId?: string
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
  if (!input.storagePath.startsWith(`${input.roomId}/`)) {
    throw new Error('Capture path does not belong to room')
  }
  if (input.clientId) {
    const prefix = `${input.roomId}/${input.clientId}.`
    const extension = input.storagePath.startsWith(prefix)
      ? input.storagePath.slice(prefix.length)
      : ''
    if (!/^(jpe?g|png|heic|heif|mp4|mov|webm)$/.test(extension)) {
      throw new Error('Capture path does not match client id')
    }
  }
  if (input.clientId) {
    const existing = await db.capture.findUnique({ where: { clientId: input.clientId } })
    if (existing) {
      if (existing.roomId !== input.roomId) throw new Error('Capture not found')
      if (existing.storagePath !== input.storagePath || existing.kind !== input.kind ||
          existing.mimeType !== input.mimeType || existing.sizeBytes !== input.sizeBytes ||
          existing.durationSec !== input.durationSec) {
        throw new Error('Capture client id already registered with different media')
      }
      return existing.id
    }
  }
  assertNotCountersigned(room.inspection)

  // The registration call is public and storagePath is client-supplied. The server
  // must confirm handover itself before a row can appear in extraction or a report.
  if (!await captureExists(input.storagePath)) {
    throw new Error('Capture has not reached storage')
  }

  let created: { id: string }
  try {
    created = await db.$transaction(async (tx) => {
      const inspection = await lockAgentInspection(tx, input.inspectionId, agent.id)
      assertNotCountersigned(inspection)
      const currentRoom = await tx.room.findFirst({
        where: { id: input.roomId, inspectionId: input.inspectionId },
        select: { id: true },
      })
      if (!currentRoom) throw new Error('Room not found')
      if (input.itemId && inspection.status !== 'AWAITING_SIGNATURE') {
        const item = await tx.inspectionItem.findFirst({
          where: { id: input.itemId, roomId: input.roomId },
          select: { id: true },
        })
        if (!item) throw new Error('Item not found')
      }
      if (await tx.storagePurge.findUnique({
        where: { path: input.storagePath },
        select: { id: true },
      })) {
        throw new Error('Capture was deleted')
      }
      // Parse marks only after locking the status against Send. A previously queued
      // photograph still lands, but a mark cannot slip into the frozen report.
      let annotations: Prisma.InputJsonValue | typeof Prisma.DbNull = Prisma.DbNull
      if (input.annotations && input.kind === 'PHOTO' && inspection.status !== 'AWAITING_SIGNATURE') {
        annotations = {
          v: 1,
          ...annotationInputSchema.parse(input.annotations),
          by: agent.id,
          at: new Date().toISOString(),
        }
      }
      const capture = await tx.capture.create({
        data: {
          roomId: input.roomId,
          clientId: input.clientId,
          kind: input.kind,
          storagePath: input.storagePath,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          durationSec: input.durationSec,
          note: input.note,
          annotations,
          itemEvidence: input.itemId && inspection.status !== 'AWAITING_SIGNATURE'
            ? { create: { itemId: input.itemId } }
            : undefined,
        },
      })
      // A late upload cannot move a finished room back to CAPTURING.
      await tx.room.updateMany({
        where: { id: input.roomId, status: { in: ['PENDING', 'FAILED'] } },
        data: { status: 'CAPTURING' },
      })
      // A room reviewed before a delayed capture registered needs another human review.
      // Once sent, late bytes stay stored but cannot alter status.
      if (inspection.status !== 'AWAITING_SIGNATURE') {
        await tx.room.updateMany({
          where: { id: input.roomId, status: 'REVIEWED' },
          data: { status: 'REVIEW' },
        })
      }
      await tx.inspection.updateMany({
        where: { id: input.inspectionId, status: 'DRAFT' },
        data: { status: 'CAPTURING', conductedAt: new Date() },
      })
      const roomName = (await tx.room.findUniqueOrThrow({ where: { id: input.roomId }, select: { name: true } })).name
      const noun = input.kind === 'PHOTO' ? ['a photo', 'photos'] : ['a video', 'videos']
      await recordBurst(tx, {
        ...await inspectionPlace(tx, input.inspectionId), actorId: agent.id, kind: 'CAPTURES_ADDED',
        subjectKey: `room:${input.roomId}:${input.kind}`,
        summary: (count) => `added ${count === 1 ? noun[0] : `${count} ${noun[1]}`} to ${roomName}`,
      })
      return capture
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = input.clientId
        ? await db.capture.findUnique({ where: { clientId: input.clientId } })
        : await db.capture.findUnique({ where: { storagePath: input.storagePath } })
      if (existing && existing.clientId === (input.clientId ?? null) &&
          existing.roomId === input.roomId && existing.storagePath === input.storagePath &&
          existing.kind === input.kind && existing.mimeType === input.mimeType &&
          existing.sizeBytes === input.sizeBytes && existing.durationSec === input.durationSec) {
        return existing.id
      }
      throw new Error('Capture is already registered with different media')
    }
    throw error
  }

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
  const room = await authorizeRoom(capture.roomId, agent.id)
  if (room.inspectionId !== inspectionId) throw new Error('Capture not found')
  assertOpen(room.inspection)

  await editOpenInspection(inspectionId, agent.id, async (tx) => {
    const before = await tx.capture.findUniqueOrThrow({ where: { id: captureId }, select: { note: true, room: { select: { name: true } } } })
    await tx.capture.update({ where: { id: captureId }, data: { note } })
    await recordBurst(tx, {
      ...await inspectionPlace(tx, inspectionId), actorId: agent.id, kind: 'CAPTURE_EDITED',
      subjectKey: `capture:${captureId}`, summary: () => `changed a photo's caption in ${before.room.name}`,
      changes: [{ field: 'Caption', from: before.note, to: note }],
    })
  })
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

  await editOpenInspection(inspectionId, agent.id, async (tx) => {
    const { room } = await tx.capture.update({
      where: { id: captureId },
      data: {
        // Prisma needs DbNull to write SQL NULL to a Json? column; JsonNull would write a
        // JSON null, which reads back as a row of the wrong shape.
        annotations: parsed
          ? { v: 1, ...parsed, by: agent.id, at: new Date().toISOString() }
          : Prisma.DbNull,
      },
      select: { room: { select: { name: true } } },
    })
    await recordBurst(tx, {
      ...await inspectionPlace(tx, inspectionId), actorId: agent.id, kind: 'CAPTURE_MARKED',
      subjectKey: `capture:${captureId}`,
      summary: () => parsed ? `marked up a photo in ${room.name}` : `cleared the marks on a photo in ${room.name}`,
    })
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
  const room = await authorizeRoom(capture.roomId, agent.id)
  if (room.inspectionId !== inspectionId) throw new Error('Capture not found')
  assertOpen(room.inspection)

  await editOpenInspection(inspectionId, agent.id, async (tx) => {
    const current = await tx.capture.findUnique({
      where: { id: captureId },
      select: { roomId: true, storagePath: true, posterPath: true },
    })
    if (!current || current.roomId !== capture.roomId) throw new Error('Capture not found')
    // The bin records the exact paths transactionally; the objects stay until it expires.
    const bin = await binCapture(tx, captureId, inspectionId, agent.id)
    await tx.capture.delete({ where: { id: captureId } })
    await recordEvent(tx, { ...await inspectionPlace(tx, inspectionId), actorId: agent.id, kind: 'CAPTURE_DELETED', summary: `deleted ${lowerFirst(bin.label)}`, binItemId: bin.id })
  })
  revalidate(inspectionId)
}

/// Called once the inspector says the room is fully captured. The room moves to REVIEW,
/// where the inspector writes its inventory against the evidence. A room already
/// reviewed stays reviewed; a new capture is what sends it back.
export async function finishRoomCapture(roomId: string, inspectionId: string) {
  const agent = await requireAgent()
  const room = await authorizeRoom(roomId, agent.id)
  if (room.inspectionId !== inspectionId) throw new Error('Room not found')
  assertOpen(room.inspection)

  await editOpenInspection(inspectionId, agent.id, (tx) =>
    tx.room.updateMany({
      where: { id: roomId, status: { not: 'REVIEWED' } },
      data: { status: 'REVIEW' },
    }))
  revalidate(inspectionId)
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
    evidenceCaptureIds?: string[]
  },
) {
  const agent = await requireAgent()
  const item = await authorizeItem(itemId, inspectionId, agent.id)
  const { evidenceCaptureIds, ...changes } = data

  await editOpenInspection(inspectionId, agent.id, async (tx) => {
    const before = await tx.inspectionItem.findUniqueOrThrow({
      where: { id: itemId }, include: { room: { select: { name: true } }, _count: { select: { evidence: true } } },
    })
    if (evidenceCaptureIds !== undefined) {
      const uniqueIds = [...new Set(evidenceCaptureIds)]
      const captures = await tx.capture.count({
        where: { id: { in: uniqueIds }, roomId: item.roomId },
      })
      if (captures !== uniqueIds.length) throw new Error('Evidence not found')
      await tx.itemEvidence.deleteMany({ where: { itemId } })
      if (uniqueIds.length > 0) {
        await tx.itemEvidence.createMany({
          data: uniqueIds.map((captureId) => ({ itemId, captureId })),
        })
      }
    }
    await tx.inspectionItem.update({
      where: { id: itemId },
      // A human has taken ownership of this line; the model's confidence no longer applies.
      data: { ...changes, editedByHuman: true, confidence: null },
    })
    const fields = fieldChanges(before, changes, itemFieldLabels)
    if (evidenceCaptureIds !== undefined && new Set(evidenceCaptureIds).size !== before._count.evidence) {
      fields.push({ field: 'Linked photos', from: String(before._count.evidence), to: String(new Set(evidenceCaptureIds).size) })
    }
    if (fields.length) {
      await recordBurst(tx, {
        ...await inspectionPlace(tx, inspectionId), actorId: agent.id, kind: 'ITEM_EDITED',
        subjectKey: `item:${itemId}`, changes: fields,
        summary: () => `edited ${changes.name ?? before.name} in ${before.room.name}`,
      })
    }
  })
  revalidate(inspectionId)
}

const itemFieldLabels = {
  name: 'Name', category: 'Category', condition: 'Condition', quantity: 'Quantity',
  notes: 'Notes', identifier: 'Serial or model', meterReading: 'Meter reading',
} as const

export async function deleteItem(itemId: string, inspectionId: string) {
  const agent = await requireAgent()
  await authorizeItem(itemId, inspectionId, agent.id)

  await editOpenInspection(inspectionId, agent.id, async (tx) => {
    const bin = await binItem(tx, itemId, inspectionId, agent.id)
    const { roomId, room } = await tx.inspectionItem.delete({ where: { id: itemId }, include: { room: { select: { name: true } } } })
    await recordEvent(tx, { ...await inspectionPlace(tx, inspectionId), actorId: agent.id, kind: 'ITEM_DELETED', summary: `deleted ${bin.label} from ${room.name}`, binItemId: bin.id })
    // A reviewed room emptied this way would read "Nothing recorded in this room" without
    // the inspector ever saying so. It goes back to review to be asked.
    if ((await tx.inspectionItem.count({ where: { roomId } })) === 0) {
      await tx.room.updateMany({ where: { id: roomId, status: 'REVIEWED' }, data: { status: 'REVIEW' } })
    }
  })
  revalidate(inspectionId)
}

export async function addItem(roomId: string, inspectionId: string) {
  const agent = await requireAgent()
  const room = await authorizeRoom(roomId, agent.id)
  if (room.inspectionId !== inspectionId) throw new Error('Room not found')
  assertOpen(room.inspection)

  const item = await editOpenInspection(inspectionId, agent.id, async (tx) => {
    const created = await tx.inspectionItem.create({
      data: {
        roomId,
        name: 'New item',
        category: 'FIXTURE',
        condition: 'GOOD',
        editedByHuman: true,
      },
      include: { room: { select: { name: true } } },
    })
    await recordEvent(tx, { ...await inspectionPlace(tx, inspectionId), actorId: agent.id, kind: 'ITEM_ADDED', summary: `added a line to ${created.room.name}` })
    return created
  })
  revalidate(inspectionId)
  return item.id
}

// ---------------------------------------------------------------------------
// Inspection lifecycle
// ---------------------------------------------------------------------------

export async function completeReview(inspectionId: string) {
  const agent = await requireAgent()
  assertOpen(await authorizeInspection(inspectionId, agent.id))

  await editOpenInspection(inspectionId, agent.id, async (tx) => {
    const rooms = await tx.room.count({ where: { inspectionId } })
    if (rooms === 0) throw new Error('Add and review at least one room before sending')

    const unreviewed = await tx.room.count({
      where: { inspectionId, status: { not: 'REVIEWED' } },
    })
    if (unreviewed > 0) {
      throw new Error(`${unreviewed} rooms still need review`)
    }

    const unprocessed = await tx.capture.count({
      where: { room: { inspectionId }, processedAt: null },
    })
    if (unprocessed > 0) {
      throw new Error('Review every room with new captures before sending for signature')
    }

    const source = await tx.inspection.findUniqueOrThrow({ where: { id: inspectionId }, select: { tenancy: { select: { agentId: true, agencyId: true } } } })
    const { tenancy } = await tx.inspection.update({
      where: { id: inspectionId },
      data: {
        status: 'AWAITING_SIGNATURE',
        reportAgentId: source.tenancy.agentId,
        reportAgencyId: source.tenancy.agencyId,
        reportAgentFrozen: true,
      },
      select: { tenancy: { select: { landlordId: true, tenantId: true } } },
    })
    // In the same commit, so a report sent for signature always has its emails coming.
    await queueSignatureRequests(tx, inspectionId, [tenancy.landlordId, tenancy.tenantId])
    await recordEvent(tx, { ...await inspectionPlace(tx, inspectionId), actorId: agent.id, kind: 'REPORT_SENT', summary: `sent the ${await reportNoun(tx, inspectionId)} for signature` })
  })
  revalidate(inspectionId)
}

/// The agent emails a party the signing link again, or for the first time if their
/// address was added after Send. A request already waiting to go is not doubled.
export async function emailSigningLink(inspectionId: string, stakeholderId: string) {
  const agent = await requireAgent()
  const authorized = await authorizeInspection(inspectionId, agent.id)
  if (authorized.status !== 'AWAITING_SIGNATURE') throw new Error('Report is not awaiting signature')

  const party = (await signingParties(inspectionId)).find((row) => row.stakeholderId === stakeholderId)
  if (!party) throw new Error('Signature party not found')
  if (party.signedAt) throw new Error('This party has already signed')
  if (!party.email) throw new Error('This party has no email on file')

  await db.$transaction((tx) => queueSignatureRequests(tx, inspectionId, [stakeholderId]))
  revalidate(inspectionId)
}

export async function signInspection(
  inspectionId: string,
  stakeholderId: string,
  imageData: string,
) {
  const agent = await requireAgent()
  const authorized = await authorizeInspection(inspectionId, agent.id)
  if (authorized.status !== 'AWAITING_SIGNATURE' && authorized.status !== 'COMPLETED') {
    throw new Error('Report is not awaiting signature')
  }
  await recordSignature(inspectionId, authorized.tenancyId, stakeholderId, imageData, agent.id)
  revalidate(inspectionId)
}

/// The landlord or tenant signs on their own phone, as themselves. Same record and same
/// completion as a signature taken on the agent's phone.
export async function signOwnReport(inspectionId: string, imageData: string) {
  const signer = await requireStakeholder()
  const authorized = await authorizeOwnSignature(inspectionId, signer.id)
  await recordSignature(inspectionId, authorized.tenancyId, signer.id, imageData)
  revalidate(inspectionId)
}

async function recordSignature(
  inspectionId: string,
  tenancyId: string,
  stakeholderId: string,
  imageData: string,
  agentId?: string,
) {
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(imageData) || imageData.length > 2_000_000) {
    throw new Error('Invalid signature image')
  }

  const ip = (await headers()).get('x-forwarded-for')
  await db.$transaction(async (tx) => {
    // Insert and finalization are one commit. A retry after a lost response can
    // always recover completion instead of getting stuck with two signature rows
    // and an inspection still awaiting signature.
    await lockAgencyTenancy(tenancyId, tx)
    const current = await lockInspection(tx, inspectionId)
    if (agentId) await authorizeInspection(inspectionId, agentId, { client: tx })
    if (current.status !== 'AWAITING_SIGNATURE' && current.status !== 'COMPLETED') {
      throw new Error('Report is not awaiting signature')
    }
    // The handover window and move-in notices use this same tenancy lock. A final
    // check-out signature must also serialize with a landlord answering a notice.
    const tenancy = await tx.tenancy.findUniqueOrThrow({
      where: { id: tenancyId },
      select: { landlordId: true, tenantId: true, agentId: true },
    })
    const required = [tenancy.landlordId, tenancy.tenantId]
    if (!required.includes(stakeholderId)) throw new Error('Signature party not found')

    const existing = await tx.signature.findUnique({
      where: { inspectionId_stakeholderId: { inspectionId, stakeholderId } },
    })
    if (!existing) {
      if (current.status === 'COMPLETED') throw new Error('Report is already countersigned')
      // Computed here, under the row lock, so every way of signing records it and it is
      // the content as it stood at the moment of signing.
      await tx.signature.create({
        data: {
          inspectionId,
          stakeholderId,
          imageData,
          ipAddress: ip,
          contentHash: await reportFingerprint(tx, inspectionId),
        },
      })
      if (stakeholderId === tenancy.tenantId) await queueTenantHandover(tx, inspectionId)
      await recordEvent(tx, {
        ...await inspectionPlace(tx, inspectionId), actorId: stakeholderId, kind: 'REPORT_SIGNED',
        summary: `signed the ${await reportNoun(tx, inspectionId)} as ${stakeholderId === tenancy.tenantId ? 'tenant' : 'landlord'}${agentId ? ' on the agent\'s device' : ''}`,
      })
    }

    const signatures = await tx.signature.findMany({
      where: { inspectionId, stakeholderId: { in: required } },
      select: { stakeholderId: true },
    })
    const signed = new Set(signatures.map((signature) => signature.stakeholderId))
    if (required.every((id) => signed.has(id)) && current.status !== 'COMPLETED') {
      const completed = await tx.inspection.update({
        where: { id: inspectionId }, data: { status: 'COMPLETED' },
        select: { reportAgentFrozen: true, reportAgentId: true, conductedById: true },
      })
      // Credit the report's responsible agent, never the party who signs last or a
      // later tenancy lead. Frozen null is intentional; only legacy reports fall
      // back to their conductor/lead. This conditional write also serializes two
      // different reports completing for the same new account at once.
      const responsibleAgentId = completed.reportAgentFrozen
        ? completed.reportAgentId
        : completed.conductedById ?? tenancy.agentId
      if (responsibleAgentId) {
        const completedAt = new Date()
        await tx.accountAcquisition.updateMany({
          where: { stakeholderId: responsibleAgentId, verifiedAt: { lte: completedAt }, firstCompletedReportAt: null },
          data: { firstCompletedReportAt: completedAt },
        })
      }
      await queueSignedCopies(tx, inspectionId)
    }
  })
}

/// Findings are written by the agent, one per change they find between the signed
/// check-in and the signed check-out. A finding names a check-out item, a check-in item,
/// or both; given only the check-out item, the check-in item it was copied from is
/// matched to it (by room and name for a row with no `baselineKey`), so the report can
/// show the condition at both ends.
export async function createFinding(
  inspectionId: string,
  data: {
    itemId: string | null
    baselineItemId: string | null
    changeType: ChangeType
    verdict: Verdict
    rationale: string
    estimatedCost: string | null
    clientId?: string
    photoDraftId?: string
  },
) {
  const agent = await requireAgent()
  const inspection = await authorizeInspection(inspectionId, agent.id)
  if (inspection.kind !== 'CHECK_OUT' || !['AWAITING_SIGNATURE', 'COMPLETED'].includes(inspection.status)) {
    throw new Error('Findings require a reviewed check-out')
  }
  const clientId = data.clientId ?? data.photoDraftId
  if (clientId) z.string().uuid().parse(clientId)
  const findingId = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Tenancy" WHERE "id" = ${inspection.tenancyId} FOR UPDATE`
    await lockInspection(tx, inspectionId)
    if (!await tx.inspection.findFirst({ where: { id: inspectionId, ...inspectionScope(agent.id) }, select: { id: true } })) {
      throw new Error('Inspection not found')
    }
    if (!data.itemId && !data.baselineItemId) throw new Error('Item not found')
    const { baseline } = await tx.inspection.findUniqueOrThrow({
      where: { id: inspectionId },
      select: { baseline: { where: inspectionScope(agent.id), select: { id: true } } },
    })
    const baselineId = baseline?.id ?? null

    const item = data.itemId
      ? await tx.inspectionItem.findFirst({
          where: { id: data.itemId, room: { inspectionId } },
          include: { room: { select: { name: true } } },
        })
      : null
    if (data.itemId && !item) throw new Error('Item not found')

    let baselineItemId = data.baselineItemId
    if (baselineItemId) {
      const baselineItem = baselineId
        ? await tx.inspectionItem.findFirst({
            where: { id: baselineItemId, room: { inspectionId: baselineId } },
            select: { id: true },
          })
        : null
      if (!baselineItem) throw new Error('Item not found')
    } else if (item && baselineId) {
      // A row copied from the check-in names its line, which survives a rename and two
      // rooms sharing a name; one an addendum brought has no check-in item. Only rows
      // without one (added during the check-out, or from before it existed) are matched
      // by name.
      const match = item.baselineKey?.startsWith('entry:') ? null : await tx.inspectionItem.findFirst({
        where: item.baselineKey
          ? { id: item.baselineKey.slice('item:'.length), room: { inspectionId: baselineId } }
          : {
              name: { equals: item.name, mode: 'insensitive' },
              room: { inspectionId: baselineId, name: { equals: item.room.name, mode: 'insensitive' } },
            },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      })
      baselineItemId = match?.id ?? null
    }

    if (clientId) {
      const existing = await tx.finding.findUnique({ where: { clientId } })
      if (existing) {
        if (existing.inspectionId !== inspectionId) throw new Error('Finding not found')
        await claimFindingPhotoDraft(tx, inspectionId, data.photoDraftId, agent.id, existing.id)
        const sameCost = existing.estimatedCost === null
          ? data.estimatedCost === null
          : data.estimatedCost !== null && existing.estimatedCost.equals(data.estimatedCost)
        if (existing.itemId !== data.itemId || existing.baselineItemId !== baselineItemId ||
            existing.changeType !== data.changeType || existing.verdict !== data.verdict ||
            existing.rationale !== data.rationale || !sameCost) {
          throw new Error('Finding save conflict: this finding was already saved with different details')
        }
        return existing.id
      }
    }
    const finding = await tx.finding.create({
      data: {
        inspectionId,
        clientId,
        itemId: data.itemId,
        baselineItemId,
        changeType: data.changeType,
        verdict: data.verdict,
        rationale: data.rationale,
        estimatedCost: data.estimatedCost,
        editedByHuman: true,
      },
    })
    await claimFindingPhotoDraft(tx, inspectionId, data.photoDraftId, agent.id, finding.id)
    const named = await tx.finding.findUniqueOrThrow({
      where: { id: finding.id }, select: { item: { select: { name: true } }, baselineItem: { select: { name: true } } },
    })
    await recordEvent(tx, { ...await inspectionPlace(tx, inspectionId), actorId: agent.id, kind: 'FINDING_ADDED', summary: `added ${findingLabel(named)}` })
    return finding.id
  })
  revalidate(inspectionId)
  return findingId
}

function findingLabel(finding: { item: { name: string } | null; baselineItem: { name: string } | null }) {
  return `the finding on ${finding.item?.name ?? finding.baselineItem?.name ?? 'an item'}`
}

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1)

async function reportNoun(tx: Prisma.TransactionClient, inspectionId: string) {
  const { kind } = await tx.inspection.findUniqueOrThrow({ where: { id: inspectionId }, select: { kind: true } })
  return kind === 'CHECK_OUT' ? 'check-out report' : 'check-in report'
}

/// Brings something back from the bin into its working report, with its original ids,
/// links and media. Restoring is editing that inspection, so it is authorized and locked
/// as deleting was, and a sent report's rooms, lines and photos never come back.
export async function restoreFromBin(binItemId: string) {
  const agent = await requireAgent()
  const bin = await db.binItem.findUnique({ where: { id: binItemId }, select: { inspectionId: true } })
  if (!bin) throw new Error('Bin item not found')
  await authorizeInspection(bin.inspectionId, agent.id)

  await db.$transaction(async (tx) => {
    const inspection = await lockAgentInspection(tx, bin.inspectionId, agent.id)
    const current = await tx.binItem.findUnique({ where: { id: binItemId } })
    if (!current || current.restoredAt || current.expiresAt <= new Date()) throw new Error('Bin item not found')
    if (!restoreAllowed(current.kind, inspection.status)) {
      throw new Error('This report has been sent for signature and can no longer be changed')
    }
    await reinsert(tx, binItemId)
    await tx.binItem.update({ where: { id: binItemId }, data: { restoredAt: new Date(), restoredById: agent.id } })
    await recordEvent(tx, {
      ...await inspectionPlace(tx, bin.inspectionId), actorId: agent.id,
      kind: `${current.kind}_RESTORED`, summary: `restored ${lowerFirst(current.label)}`, binItemId,
    })
  })
  revalidate(bin.inspectionId)
}

export async function deleteFinding(findingId: string, inspectionId: string) {
  const agent = await requireAgent()
  const finding = await db.finding.findUnique({ where: { id: findingId }, select: { inspectionId: true } })
  if (!finding || finding.inspectionId !== inspectionId) throw new Error('Finding not found')
  const inspection = await authorizeInspection(inspectionId, agent.id)

  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Tenancy" WHERE "id" = ${inspection.tenancyId} FOR UPDATE`
    await lockInspection(tx, inspectionId)
    if (!await tx.inspection.findFirst({ where: { id: inspectionId, ...inspectionScope(agent.id) }, select: { id: true } })) {
      throw new Error('Inspection not found')
    }
    const current = await tx.finding.findFirst({
      where: { id: findingId, inspectionId },
      select: { item: { select: { name: true } }, baselineItem: { select: { name: true } } },
    })
    if (!current) throw new Error('Finding not found')
    const bin = await binFinding(tx, findingId, findingLabel(current), agent.id)
    await retireFindingPhotos(tx, inspectionId, findingId, bin.expiresAt)
    await tx.finding.delete({ where: { id: findingId } })
    await recordEvent(tx, { ...await inspectionPlace(tx, inspectionId), actorId: agent.id, kind: 'FINDING_DELETED', summary: `deleted ${bin.label}`, binItemId: bin.id })
  })
  revalidate(inspectionId)
}

export async function updateFinding(
  findingId: string,
  inspectionId: string,
  data: {
    changeType?: ChangeType
    verdict?: Verdict
    rationale?: string
    estimatedCost?: string | null
    maintenanceCaseId?: string | null
    photoDraftId?: string
  },
) {
  const agent = await requireAgent()
  const finding = await db.finding.findUnique({
    where: { id: findingId },
    select: { inspectionId: true, inspection: { select: { tenancyId: true } } },
  })
  if (!finding || finding.inspectionId !== inspectionId) throw new Error('Finding not found')
  const inspection = await authorizeInspection(inspectionId, agent.id)

  if (data.maintenanceCaseId) {
    const maintenanceCase = await db.maintenanceCase.findFirst({
      where: { id: data.maintenanceCaseId, tenancyId: finding.inspection.tenancyId, tenancy: tenancyScope(agent.id) },
      select: { id: true },
    })
    if (!maintenanceCase) throw new Error('Maintenance case not found')
  }

  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Tenancy" WHERE "id" = ${inspection.tenancyId} FOR UPDATE`
    await lockInspection(tx, inspectionId)
    if (!await tx.inspection.findFirst({ where: { id: inspectionId, ...inspectionScope(agent.id) }, select: { id: true } })) {
      throw new Error('Inspection not found')
    }
    const before = await tx.finding.findFirst({
      where: { id: findingId, inspectionId },
      include: { item: { select: { name: true } }, baselineItem: { select: { name: true } } },
    })
    if (!before) throw new Error('Finding not found')
    const { photoDraftId, ...fields } = data
    await claimFindingPhotoDraft(tx, inspectionId, photoDraftId, agent.id, findingId)
    await tx.finding.update({
      where: { id: findingId },
      data: { ...fields, editedByHuman: true, confidence: null },
    })
    const changes = fieldChanges(before, fields, {
      changeType: 'Change', verdict: 'Verdict', rationale: 'Rationale', estimatedCost: 'Estimated cost',
    })
    if (changes.length || photoDraftId) {
      await recordBurst(tx, {
        ...await inspectionPlace(tx, inspectionId), actorId: agent.id, kind: 'FINDING_EDITED',
        subjectKey: `finding:${findingId}`, changes, summary: () => `edited ${findingLabel(before)}`,
      })
    }
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
  const token = await db.$transaction(async (tx) => {
    await lockAgentInspection(tx, inspectionId, agent.id)
    const existing = await tx.inspection.findUniqueOrThrow({
      where: { id: inspectionId }, select: { shareToken: true, status: true },
    })
    if (existing.status !== 'COMPLETED') throw new Error('Only a countersigned report can be shared')
    if (existing.shareToken) return existing.shareToken
    const token = randomBytes(32).toString('base64url')
    await tx.inspection.update({
      where: { id: inspectionId }, data: { shareToken: token, sharedAt: new Date() },
    })
    await recordEvent(tx, { ...await inspectionPlace(tx, inspectionId), actorId: agent.id, kind: 'SHARE_LINK_CREATED', summary: `created a share link for the ${await reportNoun(tx, inspectionId)}` })
    return token
  })
  revalidate(inspectionId)
  return token
}

/// Revoking clears the token, so the old link 404s exactly like a report that never
/// existed. Sharing again mints a new one.
export async function revokeReportLink(inspectionId: string) {
  const agent = await requireAgent()
  await authorizeInspection(inspectionId, agent.id)

  await db.$transaction(async (tx) => {
    await lockAgentInspection(tx, inspectionId, agent.id)
    const { shareToken } = await tx.inspection.findUniqueOrThrow({ where: { id: inspectionId }, select: { shareToken: true } })
    await tx.inspection.update({
      where: { id: inspectionId }, data: { shareToken: null, sharedAt: null },
    })
    if (shareToken) {
      await recordEvent(tx, { ...await inspectionPlace(tx, inspectionId), actorId: agent.id, kind: 'SHARE_LINK_REVOKED', summary: `revoked the share link for the ${await reportNoun(tx, inspectionId)}` })
    }
  })
  // A generated PDF is a copy of the report. The link that reached it is dead now, and
  // so are the copies; the agent's next download draws a fresh one.
  await removePrefix(reportPrefix(inspectionId))
  revalidate(inspectionId)
}

/// Signed URLs for a check-out room's check-in photos, minted when the inspector opens
/// the reference panel rather than on every render (see `checkInReference`).
export async function checkInPhotoLinks(roomId: string) {
  const agent = await requireAgent()
  await authorizeRoom(roomId, agent.id)
  return checkInPhotoUrls(roomId, agent.id)
}

/// Opens the check-out against a completed check-in. Both reports then live on the
/// same property record and the diff has a baseline to measure from.
export async function startCheckOut(baselineId: string) {
  const agent = await requireAgent()
  const authorized = await authorizeInspection(baselineId, agent.id, { fullTenancyOnly: true })
  if (authorized.kind !== 'CHECK_IN' || authorized.status !== 'COMPLETED') {
    throw new Error('Only a completed check-in can start check-out')
  }

  try {
    const checkOutId = await db.$transaction(async (tx) => {
      // Creating a sibling report needs full tenancy access. Serialize with access
      // removal, then recheck before copying any baseline into the new inspection.
      await tx.$queryRaw`SELECT "id" FROM "Tenancy" WHERE "id" = ${authorized.tenancyId} FOR UPDATE`
      await authorizeInspection(baselineId, agent.id, { fullTenancyOnly: true, client: tx })
      // Answering a move-in notice takes this same lock, so the copy contains every
      // agreement made before this snapshot, with its lines and photos together.
      const current = await lockInspection(tx, baselineId)
      if (current.status !== 'COMPLETED') throw new Error('Only a completed check-in can start check-out')
      const baseline = await tx.inspection.findUniqueOrThrow({
        where: { id: baselineId },
        select: { tenancyId: true, fullyFurnished: true, furnishingLevel: true },
      })
      const existing = await tx.inspection.findUnique({ where: { baselineId }, select: { id: true } })
      if (existing) return existing.id
      const rooms = await currentState(baselineId, { acknowledgedOnly: true }, tx)
      const baselines = await roomBaselines(rooms, tx)
      const checkOut = await tx.inspection.create({
        data: {
          tenancyId: baseline.tenancyId,
          kind: 'CHECK_OUT',
          status: 'DRAFT',
          fullyFurnished: baseline.fullyFurnished,
          furnishingLevel: baseline.furnishingLevel,
          baselineId,
          conductedById: agent.id,
          // Begin with the agreed inventory as the state the inspector expects to find.
          // Captures stay on the check-in: check-out evidence must come from this visit.
          rooms: {
            create: rooms.map((room, order) => ({
              name: room.name,
              order,
              baseline: baselines[order],
              items: {
                create: room.lines.map((line) => ({
                  name: line.name,
                  category: line.category,
                  condition: line.condition,
                  quantity: line.quantity,
                  notes: line.notes,
                  identifier: line.identifier,
                  meterReading: line.meterReading,
                  editedByHuman: true,
                  propertyAssetId: line.propertyAssetId,
                  baselineKey: line.key,
                  createdAt: line.createdAt,
                })),
              },
            })),
          },
        },
      })
      await recordEvent(tx, { ...await inspectionPlace(tx, checkOut.id), actorId: agent.id, kind: 'CHECK_OUT_STARTED', summary: 'started the check-out report' })
      return checkOut.id
    })

    revalidate(baselineId)
    return checkOutId
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await db.inspection.findUnique({ where: { baselineId }, select: { id: true } })
      if (existing) return existing.id
    }
    throw error
  }
}
