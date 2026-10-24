import { afterAll, describe, expect, it, vi } from 'vitest'

/// Deleting from a working report moves the rows to a 30-day bin and records who did it;
/// Restore puts back exactly what was there. History is readable by everyone working the
/// property and nobody else.

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn() }
})

import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'
import {
  addRoom, completeReview, deleteCapture, deleteFinding, deleteItem, deleteRoom, restoreFromBin, updateItem,
} from '@/lib/actions'
import { propertyHistory } from '@/lib/property-history'
import { emptyExpiredPropertyTrash } from '@/lib/property-trash'
import type { Stakeholder } from '@/generated/prisma'

const postalCode = '998822'
const DAY = 86_400_000

const person = (name: string) => db.stakeholder.create({ data: { name } })
const actAs = (agent: Stakeholder) => vi.mocked(requireAgent).mockResolvedValue(agent)

async function deal(label: string, propertyId?: string) {
  const agent = await person(`Agent ${label}`)
  const property = propertyId
    ? await db.property.findUniqueOrThrow({ where: { id: propertyId } })
    : await db.property.create({ data: { line1: `${label} block`, postalCode, type: 'PRIVATE_NON_LANDED' } })
  const tenancy = await db.tenancy.create({
    data: {
      propertyId: property.id,
      landlordId: (await person(`Landlord ${label}`)).id,
      tenantId: (await person(`Tenant ${label}`)).id,
      agentId: agent.id,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2028-01-01'),
      monthlyRent: '1000',
      deposit: '2000',
    },
  })
  const inspection = await db.inspection.create({ data: { tenancyId: tenancy.id, kind: 'CHECK_IN', fullyFurnished: false } })
  actAs(agent)
  return { agent, property, tenancy, inspection }
}

/// A room with two lines and two photos, the first photo linked to the first line.
async function furnishedRoom(inspectionId: string) {
  const roomId = await addRoom(inspectionId, 'Kitchen')
  // These bin tests build their own exact two-line fixture; starter rows are covered
  // independently by room-templates.integration.test.ts.
  await db.inspectionItem.deleteMany({ where: { roomId } })
  const [fridge, sink] = await Promise.all([
    db.inspectionItem.create({ data: { roomId, name: 'Fridge', category: 'APPLIANCE', condition: 'GOOD', editedByHuman: true, identifier: 'SN-1' } }),
    db.inspectionItem.create({ data: { roomId, name: 'Sink', category: 'FIXTURE', condition: 'FAIR', editedByHuman: true } }),
  ])
  const plate = await db.capture.create({
    data: { roomId, kind: 'PHOTO', storagePath: `${roomId}/plate.jpg`, mimeType: 'image/jpeg', sizeBytes: 10, processedAt: new Date(), annotations: { v: 1, marks: [] } },
  })
  const wide = await db.capture.create({
    data: { roomId, kind: 'PHOTO', storagePath: `${roomId}/wide.jpg`, mimeType: 'image/jpeg', sizeBytes: 12, processedAt: new Date() },
  })
  await db.itemEvidence.create({ data: { itemId: fridge.id, captureId: plate.id } })
  await db.inspectionItem.update({ where: { id: fridge.id }, data: { sourceCaptureId: plate.id } })
  await db.room.update({ where: { id: roomId }, data: { status: 'REVIEWED' } })
  return { roomId, fridge, sink, plate, wide }
}

const roomState = async (roomId: string) => ({
  room: await db.room.findUnique({ where: { id: roomId }, omit: { updatedAt: true } }),
  items: await db.inspectionItem.findMany({ where: { roomId }, orderBy: { name: 'asc' }, omit: { updatedAt: true } }),
  captures: await db.capture.findMany({ where: { roomId }, orderBy: { storagePath: 'asc' } }),
  evidence: await db.itemEvidence.findMany({ where: { item: { roomId } }, orderBy: { itemId: 'asc' } }),
})

const binOf = async (propertyId: string, kind: string) =>
  db.binItem.findFirstOrThrow({ where: { propertyId, kind }, orderBy: { deletedAt: 'desc' } })

afterAll(async () => {
  await db.property.deleteMany({ where: { postalCode } })
  await db.$disconnect()
})

describe('the bin', () => {
  it('keeps a deleted room for 30 days and restores it exactly as it was', async () => {
    const { agent, property, inspection } = await deal('BIN-ROOM')
    const { roomId } = await furnishedRoom(inspection.id)
    const before = await roomState(roomId)

    await deleteRoom(roomId, inspection.id)
    expect(await db.room.findUnique({ where: { id: roomId } })).toBeNull()
    const bin = await binOf(property.id, 'ROOM')
    expect(bin.label).toBe('Kitchen (2 items, 2 photos and videos)')
    // The media stays as long as it can be restored.
    const purge = await db.storagePurge.findUniqueOrThrow({ where: { path: roomId } })
    expect(purge.isPrefix).toBe(true)
    expect(purge.readyAt.getTime()).toBeGreaterThan(Date.now() + 29 * DAY)

    const history = await propertyHistory(property.id, agent.id)
    const deleted = history.events.find((event) => event.kind === 'ROOM_DELETED')!
    expect(deleted.summary).toBe('deleted Kitchen (2 items, 2 photos and videos)')
    expect(deleted.actorName).toBe(agent.name)
    expect(deleted.bin).toMatchObject({ id: bin.id, restorable: true, restoredAt: null })

    await restoreFromBin(bin.id)
    expect(await roomState(roomId)).toEqual(before)
    expect(await db.storagePurge.findUnique({ where: { path: roomId } })).toBeNull()
    const after = await propertyHistory(property.id, agent.id)
    expect(after.events[0]).toMatchObject({ kind: 'ROOM_RESTORED', summary: 'restored kitchen (2 items, 2 photos and videos)' })
    expect(after.events.find((event) => event.kind === 'ROOM_DELETED')!.bin).toMatchObject({ restorable: false })
    await expect(restoreFromBin(bin.id)).rejects.toThrow('Bin item not found')
  })

  it('brings a line back with its photo and finding links, and sends the room back to review', async () => {
    const { property, inspection } = await deal('BIN-ITEM')
    const { roomId, fridge, plate } = await furnishedRoom(inspection.id)
    const finding = await db.finding.create({ data: { inspectionId: inspection.id, itemId: fridge.id, changeType: 'DAMAGE', rationale: 'Dent' } })

    await deleteItem(fridge.id, inspection.id)
    expect((await db.finding.findUniqueOrThrow({ where: { id: finding.id } })).itemId).toBeNull()
    await restoreFromBin((await binOf(property.id, 'ITEM')).id)

    const restored = await db.inspectionItem.findUniqueOrThrow({ where: { id: fridge.id }, include: { evidence: true } })
    expect(restored).toMatchObject({ name: 'Fridge', identifier: 'SN-1', sourceCaptureId: plate.id })
    expect(restored.evidence.map((link) => link.captureId)).toEqual([plate.id])
    expect((await db.finding.findUniqueOrThrow({ where: { id: finding.id } })).itemId).toBe(fridge.id)
    expect((await db.room.findUniqueOrThrow({ where: { id: roomId } })).status).toBe('REVIEW')
  })

  it('restores a photo unreviewed, with its links, and keeps its bytes until then', async () => {
    const { property, inspection } = await deal('BIN-PHOTO')
    const { roomId, fridge, plate } = await furnishedRoom(inspection.id)

    await deleteCapture(plate.id, inspection.id)
    const purge = await db.storagePurge.findUniqueOrThrow({ where: { path: plate.storagePath } })
    expect(purge.readyAt.getTime()).toBeGreaterThan(Date.now() + 29 * DAY)
    expect((await db.inspectionItem.findUniqueOrThrow({ where: { id: fridge.id } })).sourceCaptureId).toBeNull()

    await restoreFromBin((await binOf(property.id, 'CAPTURE')).id)
    const restored = await db.capture.findUniqueOrThrow({ where: { id: plate.id }, include: { itemEvidence: true } })
    expect(restored.processedAt).toBeNull()
    expect(restored.annotations).toEqual({ v: 1, marks: [] })
    expect(restored.itemEvidence.map((link) => link.itemId)).toEqual([fridge.id])
    expect((await db.inspectionItem.findUniqueOrThrow({ where: { id: fridge.id } })).sourceCaptureId).toBe(plate.id)
    expect((await db.room.findUniqueOrThrow({ where: { id: roomId } })).status).toBe('REVIEW')
    expect(await db.storagePurge.findUnique({ where: { path: plate.storagePath } })).toBeNull()
  })

  it('cannot restore a line into a room that is itself in the bin', async () => {
    const { property, inspection } = await deal('BIN-ORDER')
    const { roomId, sink } = await furnishedRoom(inspection.id)
    await deleteItem(sink.id, inspection.id)
    const item = await binOf(property.id, 'ITEM')
    await deleteRoom(roomId, inspection.id)
    await expect(restoreFromBin(item.id)).rejects.toThrow('Restore the room first')
    await restoreFromBin((await binOf(property.id, 'ROOM')).id)
    await restoreFromBin(item.id)
    expect(await db.inspectionItem.count({ where: { roomId } })).toBe(2)
  })

  it('never changes a sent report, but a finding can come back after Send', async () => {
    const { agent, property, inspection } = await deal('BIN-SENT')
    const { roomId, sink } = await furnishedRoom(inspection.id)
    await deleteItem(sink.id, inspection.id)
    const item = await binOf(property.id, 'ITEM')
    await db.room.update({ where: { id: roomId }, data: { status: 'REVIEWED' } })
    await completeReview(inspection.id)

    await expect(restoreFromBin(item.id)).rejects.toThrow('can no longer be changed')
    const history = await propertyHistory(property.id, agent.id)
    expect(history.events.find((event) => event.kind === 'ITEM_DELETED')!.bin!.restorable).toBe(false)
    expect(history.events[0]).toMatchObject({ kind: 'REPORT_SENT', summary: 'sent the check-in report for signature' })

    const finding = await db.finding.create({ data: { inspectionId: inspection.id, changeType: 'MISSING', rationale: 'Gone', estimatedCost: '45.50' } })
    await deleteFinding(finding.id, inspection.id)
    await restoreFromBin((await binOf(property.id, 'FINDING')).id)
    expect(await db.finding.findUniqueOrThrow({ where: { id: finding.id } })).toMatchObject({ rationale: 'Gone' })
    expect(String((await db.finding.findUniqueOrThrow({ where: { id: finding.id } })).estimatedCost)).toBe('45.5')
  })

  it('expires after 30 days, and the daily cleanup forgets it', async () => {
    const { agent, property, inspection } = await deal('BIN-EXPIRY')
    const { sink } = await furnishedRoom(inspection.id)
    await deleteItem(sink.id, inspection.id)
    const bin = await binOf(property.id, 'ITEM')
    await db.binItem.update({ where: { id: bin.id }, data: { expiresAt: new Date(Date.now() - 1000) } })

    await expect(restoreFromBin(bin.id)).rejects.toThrow('Bin item not found')
    expect((await propertyHistory(property.id, agent.id)).events.find((event) => event.kind === 'ITEM_DELETED')!.bin!.restorable).toBe(false)
    await emptyExpiredPropertyTrash()
    expect(await db.binItem.findUnique({ where: { id: bin.id } })).toBeNull()
    // The record of the deletion outlives the bin.
    const line = (await propertyHistory(property.id, agent.id)).events.find((event) => event.kind === 'ITEM_DELETED')!
    expect(line).toMatchObject({ summary: 'deleted Sink from Kitchen', bin: null })
  })
})

describe('property history', () => {
  it('folds a burst of edits to one line into a single entry with before and after', async () => {
    const { agent, property, inspection } = await deal('HISTORY-BURST')
    const { fridge } = await furnishedRoom(inspection.id)
    await updateItem(fridge.id, inspection.id, { condition: 'FAIR' })
    await updateItem(fridge.id, inspection.id, { condition: 'POOR', notes: 'Door seal torn' })
    await updateItem(fridge.id, inspection.id, { notes: 'Door seal torn' })

    const edits = (await propertyHistory(property.id, agent.id)).events.filter((event) => event.kind === 'ITEM_EDITED')
    expect(edits).toHaveLength(1)
    expect(edits[0].summary).toBe('edited Fridge in Kitchen')
    expect(edits[0].changes).toEqual([
      { field: 'Condition', from: 'GOOD', to: 'POOR' },
      { field: 'Notes', from: null, to: 'Door seal torn' },
    ])
  })

  it('shows each person only the tenancies they work, and nothing to anyone else', async () => {
    const first = await deal('HISTORY-SCOPE-A')
    const second = await deal('HISTORY-SCOPE-B', first.property.id)
    actAs(first.agent)
    await addRoom(first.inspection.id, 'Bedroom')
    actAs(second.agent)
    await addRoom(second.inspection.id, 'Study')

    const firstView = await propertyHistory(first.property.id, first.agent.id)
    expect(firstView.events.map((event) => event.summary)).toEqual(['added the room Bedroom'])
    const secondView = await propertyHistory(first.property.id, second.agent.id)
    expect(secondView.events.map((event) => event.summary)).toEqual(['added the room Study'])

    const outsider = await person('Outsider HISTORY')
    await expect(propertyHistory(first.property.id, outsider.id)).rejects.toThrow('Property not found')
    // A landlord reads the signed report, not the agents' working log.
    await expect(propertyHistory(first.property.id, first.tenancy.landlordId)).rejects.toThrow('Property not found')

    const collaborator = await person('Collaborator HISTORY')
    await db.tenancyCollaborator.create({ data: { tenancyId: first.tenancy.id, stakeholderId: collaborator.id } })
    expect((await propertyHistory(first.property.id, collaborator.id)).events.map((event) => event.summary))
      .toEqual(['added the room Bedroom'])
    expect((await propertyHistory(first.property.id, first.agent.id, 'deletions')).events).toEqual([])
  })
})
