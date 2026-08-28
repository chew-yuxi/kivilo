import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

/// A report that has gone out for signature is the artefact both parties are agreeing
/// to, and `/reports/[token]` renders its rooms, items and photo captures. So every
/// action that changes what the report says has to stop at that line. This file is the
/// proof, because the UI does not enforce it: the capture page filters on status, but a
/// server action is a public HTTP endpoint and nothing stops a request reaching it.

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/server', () => ({ after: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/storage', () => ({
  createUploadUrl: vi.fn(async () => ({ signedUrl: 'https://x/y', token: 'tok' })),
}))
vi.mock('@/lib/auth', async (importActual) => {
  // Only the session lookup is faked. The authorization boundary itself, which is what
  // these tests exercise, is the real one.
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn() }
})

import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'
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
} from '@/lib/actions'
import type { InspectionStatus } from '@/generated/prisma'

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
    },
  })
  const item = await db.inspectionItem.create({
    data: { roomId: room.id, name: 'Oven', category: 'APPLIANCE', condition: 'GOOD' },
  })

  vi.mocked(requireAgent).mockResolvedValue(agent)
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

beforeEach(() => vi.mocked(requireAgent).mockReset())

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
      await expect(addItem(d.room.id, d.inspection.id)).rejects.toThrow(SENT)
      await expect(updateItem(d.item.id, d.inspection.id, { name: 'Hob' })).rejects.toThrow(SENT)
      await expect(deleteItem(d.item.id, d.inspection.id)).rejects.toThrow(SENT)
      await expect(updateCaptureNote(d.capture.id, d.inspection.id, 'x')).rejects.toThrow(SENT)
      await expect(annotateCapture(d.capture.id, d.inspection.id, marks)).rejects.toThrow(SENT)
      await expect(deleteCapture(d.capture.id, d.inspection.id)).rejects.toThrow(SENT)
      // The worst of them: a re-read deletes and rewrites the room's inventory, which is
      // the very list both parties put their names to.
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
    await expect(requestUploadUrl(d.room.id, 'late.jpg')).resolves.toMatchObject({ token: 'tok' })
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
    await expect(requestUploadUrl(d.room.id, 'late.jpg')).rejects.toThrow(SIGNED)
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
    await expect(updateCaptureNote(d.capture.id, d.inspection.id, 'plate')).resolves.toBeUndefined()
    await expect(requestUploadUrl(d.room.id, 'x.jpg')).resolves.toMatchObject({ token: 'tok' })
  })
})
