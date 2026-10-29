import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'

/// A report that has gone out for signature is the artefact both parties are agreeing
/// to, and `/reports/[token]` renders its rooms, items and photo captures. So every
/// action that changes what the report says has to stop at that line. This file is the
/// proof, because the UI does not enforce it: the capture page filters on status, but a
/// server action is a public HTTP endpoint and nothing stops a request reaching it.

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/capture-poster', () => ({ makePhotoCapturePoster: vi.fn() }))
vi.mock('@/lib/storage', () => ({
  createUploadUrl: vi.fn(async () => ({ signedUrl: 'https://x/y', token: 'tok' })),
  captureExists: vi.fn(async () => false),
}))
vi.mock('@/lib/auth', async (importActual) => {
  // Only the session lookup is faked. The authorization boundary itself, which is what
  // these tests exercise, is the real one.
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn(), currentStakeholder: vi.fn() }
})

import { db } from '@/lib/db'
import { requireAgent, currentStakeholder } from '@/lib/auth'
import { captureExists } from '@/lib/storage'
import {
  addRoom,
  renameRoom,
  deleteRoom,
  markRoomReviewed,
  addItem,
  updateItem,
  deleteItem,
  requestUploadUrl,
  registerCapture,
  updateCaptureNote,
  annotateCapture,
  deleteCapture,
  finishRoomCapture,
  completeReview,
  signInspection,
  startCheckOut,
} from '@/lib/actions'
import type { InspectionStatus } from '@/generated/prisma'
import { POST as registerCaptureRoute } from '@/app/api/v1/inspections/[id]/rooms/[roomId]/captures/route'

const SENT = 'This report has been sent for signature and can no longer be changed'
const SIGNED = 'This report has been countersigned and can no longer be changed'

async function deal(label: string, status: InspectionStatus) {
  const person = (name: string) => db.stakeholder.create({ data: { name: `${name} ${label}` } })
  const agent = await person('Agent')
  const property = await db.property.create({
    data: { line1: `${label} block`, postalCode: '000000', type: 'PRIVATE_NON_LANDED' },
  })
  const tenancy = await db.tenancy.create({
    data: {
      propertyId: property.id,
      landlordId: (await person('Landlord')).id,
      tenantId: (await person('Tenant')).id,
      agentId: agent.id,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2026-01-01'),
      monthlyRent: '1000',
      deposit: '2000',
    },
  })
  const inspection = await db.inspection.create({
    data: { tenancyId: tenancy.id, kind: 'CHECK_IN', status },
  })
  const room = await db.room.create({
    data: { inspectionId: inspection.id, name: 'Kitchen', order: 0, status: 'REVIEWED' },
  })
  const capture = await db.capture.create({
    data: {
      roomId: room.id,
      kind: 'PHOTO',
      storagePath: `${room.id}/a.jpg`,
      mimeType: 'image/jpeg',
      sizeBytes: 10,
      processedAt: new Date(),
    },
  })
  const item = await db.inspectionItem.create({
    data: { roomId: room.id, name: 'Oven', category: 'APPLIANCE', condition: 'GOOD' },
  })

  vi.mocked(requireAgent).mockResolvedValue(agent)
  vi.mocked(currentStakeholder).mockResolvedValue(agent)
  return { agent, inspection, room, capture, item }
}

afterAll(async () => {
  await db.property.deleteMany({ where: { postalCode: '000000' } })
  await db.stakeholder.deleteMany({
    where: {
      tenanciesAsAgent: { none: {} },
      tenanciesAsLandlord: { none: {} },
      tenanciesAsTenant: { none: {} },
      authUserId: null,
      inspectionsRun: { none: {} },
    },
  })
  await db.$disconnect()
})

beforeEach(() => {
  vi.mocked(requireAgent).mockReset()
  vi.mocked(currentStakeholder).mockReset()
  vi.mocked(captureExists).mockReset()
  vi.mocked(captureExists).mockResolvedValue(false)
})

describe.each(['AWAITING_SIGNATURE', 'COMPLETED'] as const)(
  'an inspection at %s',
  (status) => {
    it('refuses every change to what the report says', async () => {
      const d = await deal(`F${status}`, status)
      const marks = { w: 100, h: 100, marks: [{ shape: 'ring', cx: 0.5, cy: 0.5, rx: 0.1, ry: 0.1 }] }

      await expect(addRoom(d.inspection.id, 'Balcony')).rejects.toThrow(SENT)
      await expect(renameRoom(d.room.id, d.inspection.id, 'Scullery')).rejects.toThrow(SENT)
      await expect(deleteRoom(d.room.id, d.inspection.id)).rejects.toThrow(SENT)
      await expect(markRoomReviewed(d.room.id, d.inspection.id)).rejects.toThrow(SENT)
      await expect(markRoomReviewed(d.room.id, d.inspection.id, { nothingToRecord: true })).rejects.toThrow(SENT)
      await expect(addItem(d.room.id, d.inspection.id)).rejects.toThrow(SENT)
      await expect(updateItem(d.item.id, d.inspection.id, { name: 'Hob' })).rejects.toThrow(SENT)
      await expect(deleteItem(d.item.id, d.inspection.id)).rejects.toThrow(SENT)
      await expect(updateCaptureNote(d.capture.id, d.inspection.id, 'x')).rejects.toThrow(SENT)
      await expect(annotateCapture(d.capture.id, d.inspection.id, marks)).rejects.toThrow(SENT)
      await expect(deleteCapture(d.capture.id, d.inspection.id)).rejects.toThrow(SENT)
      await expect(finishRoomCapture(d.room.id, d.inspection.id)).rejects.toThrow(SENT)
    })

    it('leaves the report exactly as it was', async () => {
      const d = await deal(`G${status}`, status)
      await expect(deleteCapture(d.capture.id, d.inspection.id)).rejects.toThrow()
      await expect(deleteItem(d.item.id, d.inspection.id)).rejects.toThrow()

      expect(await db.capture.count({ where: { roomId: d.room.id } })).toBe(1)
      expect(await db.inspectionItem.count({ where: { roomId: d.room.id } })).toBe(1)
      const item = await db.inspectionItem.findUniqueOrThrow({ where: { id: d.item.id } })
      expect(item.name).toBe('Oven')
    })
  },
)

/// Bytes are the one exception, and only until countersignature. A capture taken before
/// the agent tapped Send may still be draining out of the phone's queue, and refusing it
/// would strand it there forever, which is the one thing the capture invariant forbids.
describe('captures still in flight', () => {
  it('may still land while the report is awaiting signature', async () => {
    const d = await deal('H', 'AWAITING_SIGNATURE')
    await expect(requestUploadUrl(d.room.id, d.inspection.id, 'late.jpg')).resolves.toMatchObject({ token: 'tok' })
    vi.mocked(captureExists).mockResolvedValueOnce(true)
    await expect(
      registerCapture({
        roomId: d.room.id,
        inspectionId: d.inspection.id,
        kind: 'PHOTO',
        storagePath: `${d.room.id}/late.jpg`,
        mimeType: 'image/jpeg',
        sizeBytes: 20,
        durationSec: null,
        note: null,
      }),
    ).resolves.toEqual(expect.any(String))
  })

  it('is refused once both parties have signed', async () => {
    const d = await deal('I', 'COMPLETED')
    await expect(requestUploadUrl(d.room.id, d.inspection.id, 'late.jpg')).rejects.toThrow(SIGNED)
    await expect(
      registerCapture({
        roomId: d.room.id,
        inspectionId: d.inspection.id,
        kind: 'PHOTO',
        storagePath: `${d.room.id}/late.jpg`,
        mimeType: 'image/jpeg',
        sizeBytes: 20,
        durationSec: null,
        note: null,
      }),
    ).rejects.toThrow(SIGNED)
  })
})

/// The guard must not have frozen a report that is still being worked on.
describe('an inspection still in progress', () => {
  it('accepts the same changes', async () => {
    const d = await deal('J', 'REVIEW')
    await expect(addRoom(d.inspection.id, 'Balcony')).resolves.toEqual(expect.any(String))
    await expect(renameRoom(d.room.id, d.inspection.id, 'Scullery')).resolves.toBeUndefined()
    await expect(updateItem(d.item.id, d.inspection.id, { name: 'Hob' })).resolves.toBeUndefined()
    await expect(updateItem(d.item.id, d.inspection.id, {
      evidenceCaptureIds: [d.capture.id],
    })).resolves.toBeUndefined()
    await expect(db.itemEvidence.findMany({ where: { itemId: d.item.id } })).resolves.toMatchObject([
      { itemId: d.item.id, captureId: d.capture.id },
    ])
    await expect(updateCaptureNote(d.capture.id, d.inspection.id, 'plate')).resolves.toBeUndefined()
    await expect(requestUploadUrl(d.room.id, d.inspection.id, 'x.jpg')).resolves.toMatchObject({ token: 'tok' })
  })
})

describe('native action boundaries', () => {
  it('rejects a room or capture paired with another inspection', async () => {
    const d = await deal('PAIR', 'REVIEW')
    const other = await db.inspection.create({
      data: { tenancyId: d.inspection.tenancyId, kind: 'CHECK_IN', status: 'REVIEW' },
    })

    await expect(renameRoom(d.room.id, other.id, 'Wrong')).rejects.toThrow('Room not found')
    await expect(markRoomReviewed(d.room.id, other.id)).rejects.toThrow('Room not found')
    await expect(markRoomReviewed(d.room.id, other.id, { nothingToRecord: true })).rejects.toThrow('Room not found')
    await expect(addItem(d.room.id, other.id)).rejects.toThrow('Room not found')
    await expect(updateCaptureNote(d.capture.id, other.id, 'Wrong')).rejects.toThrow('Capture not found')
    await expect(deleteCapture(d.capture.id, other.id)).rejects.toThrow('Capture not found')
    await expect(finishRoomCapture(d.room.id, other.id)).rejects.toThrow('Room not found')
    expect((await db.room.findUniqueOrThrow({ where: { id: d.room.id } })).name).toBe('Kitchen')
  })

  it('rejects evidence from another room', async () => {
    const d = await deal('ITEM-EVIDENCE', 'REVIEW')
    const otherRoom = await db.room.create({
      data: {
        inspectionId: d.inspection.id,
        name: 'Bedroom',
        order: 1,
        status: 'REVIEW',
      },
    })
    const otherCapture = await db.capture.create({
      data: {
        roomId: otherRoom.id,
        kind: 'PHOTO',
        storagePath: `${otherRoom.id}/other.jpg`,
        mimeType: 'image/jpeg',
        sizeBytes: 10,
      },
    })

    await expect(updateItem(d.item.id, d.inspection.id, {
      evidenceCaptureIds: [otherCapture.id],
    })).rejects.toThrow('Evidence not found')
    await expect(db.itemEvidence.count({ where: { itemId: d.item.id } })).resolves.toBe(0)
  })

  it('does not register the same native capture twice after a lost response', async () => {
    const d = await deal('RETRY', 'REVIEW')
    const clientId = randomUUID()
    const input = {
      inspectionId: d.inspection.id,
      roomId: d.room.id,
      clientId,
      kind: 'PHOTO' as const,
      storagePath: `${d.room.id}/${clientId}.jpg`,
      mimeType: 'image/jpeg',
      sizeBytes: 20,
      durationSec: null,
      note: null,
    }

    vi.mocked(captureExists).mockResolvedValueOnce(true)
    const first = await registerCapture(input)
    expect(await registerCapture(input)).toBe(first)
    expect(await db.capture.count({ where: { clientId } })).toBe(1)
    await expect(registerCapture({ ...input, sizeBytes: 21 })).rejects.toThrow('different media')
  })

  it('registers item evidence and its marks together, and reports them on a lost-response retry', async () => {
    const d = await deal('ITEM-CAPTURE', 'REVIEW')
    const clientId = randomUUID()
    const annotations = { w: 100, h: 100, marks: [{ shape: 'ring', cx: 0.5, cy: 0.5, rx: 0.1, ry: 0.1 }] }
    const input = {
      itemId: d.item.id,
      clientId,
      kind: 'PHOTO',
      storagePath: `${d.room.id}/${clientId}.jpg`,
      mimeType: 'image/jpeg',
      sizeBytes: 20,
      annotations,
    }
    const request = () => new Request('http://localhost/api/v1/captures', {
      method: 'POST', body: JSON.stringify(input),
    })
    const context = { params: Promise.resolve({ id: d.inspection.id, roomId: d.room.id }) }

    vi.mocked(captureExists).mockResolvedValueOnce(true)
    const first = await registerCaptureRoute(request(), context)
    expect(first.status).toBe(200)
    const registered = await first.json()
    expect(registered).toEqual({ id: expect.any(String), itemApplied: true, annotationsApplied: true })
    expect(await db.itemEvidence.findMany({ where: { itemId: d.item.id } })).toMatchObject([
      { itemId: d.item.id, captureId: registered.id },
    ])
    expect((await db.capture.findUniqueOrThrow({ where: { id: registered.id } })).annotations)
      .toMatchObject({ ...annotations, by: d.agent.id })
    expect((await db.room.findUniqueOrThrow({ where: { id: d.room.id } })).status).toBe('REVIEW')

    // A response can be lost just before Send; retrying must confirm the existing
    // capture without touching the frozen content.
    await markRoomReviewed(d.room.id, d.inspection.id)
    await completeReview(d.inspection.id)
    const retry = await registerCaptureRoute(request(), context)
    expect(await retry.json()).toEqual(registered)
    expect(await db.capture.count({ where: { clientId } })).toBe(1)
    expect(await db.itemEvidence.count({ where: { captureId: registered.id } })).toBe(1)
  })

  it('rejects missing and other-room inventory targets without registering their captures', async () => {
    const d = await deal('CAPTURE-TARGET', 'REVIEW')
    const otherRoom = await db.room.create({
      data: { inspectionId: d.inspection.id, name: 'Bedroom', order: 1 },
    })
    const otherItem = await db.inspectionItem.create({
      data: { roomId: otherRoom.id, name: 'Bed', category: 'FURNITURE', condition: 'GOOD' },
    })
    vi.mocked(captureExists).mockResolvedValue(true)
    for (const itemId of [otherItem.id, 'missing-item']) {
      const response = await registerCaptureRoute(new Request('http://localhost/api/v1/captures', {
        method: 'POST',
        body: JSON.stringify({
          itemId,
          kind: 'PHOTO',
          storagePath: `${d.room.id}/${itemId}.jpg`,
          mimeType: 'image/jpeg',
          sizeBytes: 20,
        }),
      }), { params: Promise.resolve({ id: d.inspection.id, roomId: d.room.id }) })
      expect(response.status).toBe(404)
      expect(await response.json()).toEqual({ error: 'not_found' })
    }
    expect(await db.capture.count({ where: { roomId: d.room.id } })).toBe(1)
    expect(await db.itemEvidence.count({ where: { itemId: otherItem.id } })).toBe(0)
  })

  it('keeps late item media in storage without changing evidence or marks after Send', async () => {
    const d = await deal('ITEM-AFTER-SEND', 'AWAITING_SIGNATURE')
    vi.mocked(captureExists).mockResolvedValueOnce(true)
    const response = await registerCaptureRoute(new Request('http://localhost/api/v1/captures', {
      method: 'POST',
      body: JSON.stringify({
        itemId: d.item.id,
        kind: 'PHOTO',
        storagePath: `${d.room.id}/late-item.jpg`,
        mimeType: 'image/jpeg',
        sizeBytes: 20,
        annotations: { w: 100, h: 100, marks: [{ shape: 'ring', cx: 0.5, cy: 0.5, rx: 0.1, ry: 0.1 }] },
      }),
    }), { params: Promise.resolve({ id: d.inspection.id, roomId: d.room.id }) })
    expect(response.status).toBe(200)
    const registered = await response.json()
    expect(registered).toEqual({ id: expect.any(String), itemApplied: false, annotationsApplied: false })
    expect(await db.itemEvidence.count({ where: { itemId: d.item.id } })).toBe(0)
    expect(await db.capture.findUniqueOrThrow({ where: { id: registered.id } }))
      .toMatchObject({ annotations: null, processedAt: null })
    expect((await db.room.findUniqueOrThrow({ where: { id: d.room.id } })).status).toBe('REVIEWED')
  })

  it('does not use a registration retry to move evidence onto another inventory item', async () => {
    const d = await deal('ITEM-RETRY', 'REVIEW')
    const otherItem = await db.inspectionItem.create({
      data: { roomId: d.room.id, name: 'Hob', category: 'APPLIANCE', condition: 'GOOD' },
    })
    const clientId = randomUUID()
    const input = {
      inspectionId: d.inspection.id,
      roomId: d.room.id,
      itemId: d.item.id,
      clientId,
      kind: 'PHOTO' as const,
      storagePath: `${d.room.id}/${clientId}.jpg`,
      mimeType: 'image/jpeg',
      sizeBytes: 20,
      durationSec: null,
      note: null,
    }
    vi.mocked(captureExists).mockResolvedValueOnce(true)
    const id = await registerCapture(input)
    const response = await registerCaptureRoute(new Request('http://localhost/api/v1/captures', {
      method: 'POST', body: JSON.stringify({ ...input, itemId: otherItem.id }),
    }), { params: Promise.resolve({ id: d.inspection.id, roomId: d.room.id }) })
    expect(await response.json()).toEqual({ id, itemApplied: false, annotationsApplied: true })
    expect(await db.itemEvidence.findMany({ where: { captureId: id } })).toMatchObject([
      { itemId: d.item.id },
    ])
  })

  it('recognizes an already uploaded native object without issuing an overwrite token', async () => {
    const d = await deal('OBJECT', 'REVIEW')
    const clientId = randomUUID()
    vi.mocked(captureExists).mockResolvedValueOnce(true)
    await expect(requestUploadUrl(d.room.id, d.inspection.id, 'plate.jpg', clientId))
      .resolves.toEqual({
        storagePath: `${d.room.id}/${clientId}.jpg`,
        signedUrl: null,
        token: null,
        alreadyUploaded: true,
      })
  })

  it('requires reviewed rooms and freezes after sending', async () => {
    const d = await deal('REVIEW', 'REVIEW')
    await completeReview(d.inspection.id)
    expect((await db.inspection.findUniqueOrThrow({ where: { id: d.inspection.id } })).status)
      .toBe('AWAITING_SIGNATURE')
    await expect(completeReview(d.inspection.id)).rejects.toThrow(SENT)
  })

  it('refuses a capture row until storage confirms its bytes', async () => {
    const d = await deal('MISSING', 'REVIEW')
    await expect(registerCapture({
      inspectionId: d.inspection.id,
      roomId: d.room.id,
      kind: 'PHOTO',
      storagePath: `${d.room.id}/missing.jpg`,
      mimeType: 'image/jpeg',
      sizeBytes: 20,
      durationSec: null,
      note: null,
    })).rejects.toThrow('Capture has not reached storage')
    expect(await db.capture.count({ where: { roomId: d.room.id } })).toBe(1)
  })

  it('requires another human review when media lands before Send', async () => {
    const d = await deal('LATE', 'REVIEW')
    vi.mocked(captureExists).mockResolvedValueOnce(true)
    await registerCapture({
      inspectionId: d.inspection.id,
      roomId: d.room.id,
      kind: 'PHOTO',
      storagePath: `${d.room.id}/late.jpg`,
      mimeType: 'image/jpeg',
      sizeBytes: 20,
      durationSec: null,
      note: null,
    })
    expect((await db.room.findUniqueOrThrow({ where: { id: d.room.id } })).status).toBe('REVIEW')
    await expect(completeReview(d.inspection.id)).rejects.toThrow('rooms still need review')
    await markRoomReviewed(d.room.id, d.inspection.id)
    expect(await db.capture.count({ where: { roomId: d.room.id, processedAt: null } })).toBe(0)
    await expect(completeReview(d.inspection.id)).resolves.toBeUndefined()
  })

  it('keeps media that lands after Send off the agreed report', async () => {
    const d = await deal('AFTER-SEND', 'AWAITING_SIGNATURE')
    vi.mocked(captureExists).mockResolvedValueOnce(true)
    const id = await registerCapture({
      inspectionId: d.inspection.id,
      roomId: d.room.id,
      kind: 'PHOTO',
      storagePath: `${d.room.id}/after.jpg`,
      mimeType: 'image/jpeg',
      sizeBytes: 20,
      durationSec: null,
      note: null,
    })
    // The report shows only captures a person reviewed the room with.
    expect((await db.capture.findUniqueOrThrow({ where: { id } })).processedAt).toBeNull()
    expect((await db.room.findUniqueOrThrow({ where: { id: d.room.id } })).status).toBe('REVIEWED')
  })

  it('moves a finished room to review with no model in between', async () => {
    const d = await deal('FINISH', 'CAPTURING')
    await db.room.update({ where: { id: d.room.id }, data: { status: 'CAPTURING' } })
    await expect(markRoomReviewed(d.room.id, d.inspection.id)).rejects.toThrow('Finish capturing')
    await finishRoomCapture(d.room.id, d.inspection.id)
    expect((await db.room.findUniqueOrThrow({ where: { id: d.room.id } })).status).toBe('REVIEW')
    await markRoomReviewed(d.room.id, d.inspection.id)
    // Tapping Done again on a reviewed room does not undo the review.
    await finishRoomCapture(d.room.id, d.inspection.id)
    expect((await db.room.findUniqueOrThrow({ where: { id: d.room.id } })).status).toBe('REVIEWED')
  })

  it('refuses to review a room with no inventory', async () => {
    const d = await deal('EMPTY', 'CAPTURING')
    await db.inspectionItem.deleteMany({ where: { roomId: d.room.id } })
    await db.room.update({ where: { id: d.room.id }, data: { status: 'REVIEW' } })
    await expect(markRoomReviewed(d.room.id, d.inspection.id)).rejects.toThrow('Add at least one item')
    await expect(markRoomReviewed(d.room.id, d.inspection.id, { nothingToRecord: false }))
      .rejects.toThrow('Add at least one item')
  })

  it('reviews an empty room once the inspector confirms there is nothing to record', async () => {
    const d = await deal('NOTHING', 'CAPTURING')
    await db.inspectionItem.deleteMany({ where: { roomId: d.room.id } })
    await db.capture.update({ where: { id: d.capture.id }, data: { processedAt: null } })
    await db.room.update({ where: { id: d.room.id }, data: { status: 'CAPTURING' } })
    // The confirmation is about the inventory, not a way round the other checks.
    await expect(markRoomReviewed(d.room.id, d.inspection.id, { nothingToRecord: true }))
      .rejects.toThrow('Finish capturing')

    await finishRoomCapture(d.room.id, d.inspection.id)
    await markRoomReviewed(d.room.id, d.inspection.id, { nothingToRecord: true })
    expect((await db.room.findUniqueOrThrow({ where: { id: d.room.id } })).status).toBe('REVIEWED')
    expect(await db.capture.count({ where: { roomId: d.room.id, processedAt: null } })).toBe(0)
    await expect(completeReview(d.inspection.id)).resolves.toBeUndefined()
  })

  it('reviews a room with items the same way whether or not the flag is sent', async () => {
    const d = await deal('FLAGGED', 'CAPTURING')
    await db.capture.update({ where: { id: d.capture.id }, data: { processedAt: null } })
    await db.room.update({ where: { id: d.room.id }, data: { status: 'REVIEW' } })
    await markRoomReviewed(d.room.id, d.inspection.id, { nothingToRecord: true })
    expect((await db.room.findUniqueOrThrow({ where: { id: d.room.id } })).status).toBe('REVIEWED')
    expect(await db.capture.count({ where: { roomId: d.room.id, processedAt: null } })).toBe(0)
    expect(await db.inspectionItem.count({ where: { roomId: d.room.id } })).toBe(1)
  })

  it('only accepts tenancy parties and never overwrites a signature', async () => {
    const d = await deal('SIGN', 'AWAITING_SIGNATURE')
    const tenancy = await db.tenancy.findUniqueOrThrow({ where: { id: d.inspection.tenancyId } })
    const image = 'data:image/png;base64,iVBORw0KGgo='
    await expect(signInspection(d.inspection.id, d.agent.id, image)).rejects.toThrow('Signature party not found')
    await signInspection(d.inspection.id, tenancy.landlordId, image)
    await signInspection(d.inspection.id, tenancy.landlordId, 'data:image/png;base64,AAAA')
    const landlordSignature = await db.signature.findUniqueOrThrow({
      where: { inspectionId_stakeholderId: { inspectionId: d.inspection.id, stakeholderId: tenancy.landlordId } },
    })
    expect(landlordSignature.imageData).toBe(image)
    await signInspection(d.inspection.id, tenancy.tenantId, image)
    expect((await db.inspection.findUniqueOrThrow({ where: { id: d.inspection.id } })).status)
      .toBe('COMPLETED')
  })

  it('only starts check-out from a completed check-in and returns an existing check-out', async () => {
    const open = await deal('OPEN', 'REVIEW')
    await expect(startCheckOut(open.inspection.id)).rejects.toThrow('Only a completed check-in')
    const completed = await deal('BASELINE', 'COMPLETED')
    const first = await startCheckOut(completed.inspection.id)
    expect(await startCheckOut(completed.inspection.id)).toBe(first)
    expect(await db.inspection.count({ where: { baselineId: completed.inspection.id } })).toBe(1)
  })
})
