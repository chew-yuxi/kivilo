import { randomUUID } from 'node:crypto'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { signPhotos } = vi.hoisted(() => ({
  signPhotos: vi.fn(async (paths: string[]) => ({
    data: paths.map((path) => ({ path, signedUrl: `https://storage.test/signed/${path}?token=test`, error: null })),
    error: null,
  })),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/storage', () => ({
  CAPTURE_BUCKET: 'captures',
  createDownloadUrl: vi.fn(async (path: string) => `https://storage.test/signed/${path}?token=test`),
  createDownloadUrls: vi.fn(async (paths: string[]) => new Map(paths.map((path) => [path, `https://storage.test/signed/${path}?token=test`]))),
  serviceClient: () => ({ storage: { from: () => ({ createSignedUrls: signPhotos }) } }),
}))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, currentStakeholder: vi.fn(), requireAgent: vi.fn() }
})

import { db } from '@/lib/db'
import { currentStakeholder, requireAgent } from '@/lib/auth'
import { startCheckOut } from '@/lib/actions'
import { GET } from '@/app/api/v1/inspections/[id]/route'
import { roomBaselineSchema } from '@/lib/check-in-reference'
import type { CaptureKind, Prisma, Stakeholder } from '@/generated/prisma'

const propertyIds: string[] = []
const peopleIds: string[] = []
const annotation = {
  v: 1, w: 1000, h: 1200, by: 'Inspector', at: '2026-10-01T09:00:00.000Z',
  marks: [{ shape: 'ring', cx: 0.2, cy: 0.3, rx: 0.05, ry: 0.06 }],
}

function as(person: Stakeholder) {
  vi.mocked(currentStakeholder).mockResolvedValue(person)
  vi.mocked(requireAgent).mockResolvedValue(person)
}

async function capture(roomId: string, label: string, options: { kind?: CaptureKind; agreed?: boolean; itemId?: string; at?: number } = {}) {
  const createdAt = new Date(Date.UTC(2026, 9, 1, 9, 0, options.at ?? 0))
  const row = await db.capture.create({
    data: {
      roomId, kind: options.kind ?? 'PHOTO', storagePath: `${randomUUID()}/${label}.jpg`,
      mimeType: options.kind === 'VIDEO' ? 'video/mp4' : 'image/jpeg', sizeBytes: 100,
      processedAt: options.agreed === false ? null : createdAt, note: label, annotations: annotation, createdAt,
    },
  })
  if (options.itemId) await db.itemEvidence.create({ data: { itemId: options.itemId, captureId: row.id, createdAt } })
  return row
}

async function fixture() {
  const run = randomUUID()
  const [agent, conductor, stranger, landlord, tenant] = await Promise.all(['agent', 'conductor', 'stranger', 'landlord', 'tenant'].map(async (role) => {
    const person = await db.stakeholder.create({ data: { name: `Comparable ${role} ${run}` } })
    peopleIds.push(person.id)
    return person
  }))
  const property = await db.property.create({ data: { line1: `Comparable ${run}`, postalCode: '997735', type: 'HDB' } })
  propertyIds.push(property.id)
  const tenancy = await db.tenancy.create({
    data: {
      propertyId: property.id, landlordId: landlord.id, tenantId: tenant.id, agentId: agent.id,
      startDate: new Date('2024-01-01'), endDate: new Date('2099-12-31'), monthlyRent: '3000', deposit: '6000',
    },
  })
  const checkIn = await db.inspection.create({ data: { tenancyId: tenancy.id, kind: 'CHECK_IN', status: 'COMPLETED', conductedById: agent.id } })
  const [kitchen, firstBedroom, secondBedroom, store] = await Promise.all([
    ['Kitchen', 0], ['Bedroom', 1], ['Bedroom', 2], ['Store', 3],
  ].map(([name, order]) => db.room.create({ data: { inspectionId: checkIn.id, name: name as string, order: order as number, status: 'REVIEWED' } })))
  const hob = await db.inspectionItem.create({ data: {
    roomId: kitchen.id, name: 'Hob', category: 'APPLIANCE', condition: 'GOOD', quantity: 2,
    identifier: 'HOB-123', notes: 'Original signed description', createdAt: new Date('2026-10-01T08:00:00Z'),
  } })
  const wall = await db.inspectionItem.create({ data: { roomId: kitchen.id, name: 'Wall', category: 'SURFACE', condition: 'FAIR', notes: 'Small scuff', createdAt: new Date('2026-10-01T08:00:01Z') } })
  const retired = await db.inspectionItem.create({ data: { roomId: kitchen.id, name: 'Old refrigerator', category: 'APPLIANCE', condition: 'GOOD', createdAt: new Date('2026-10-01T08:00:02Z') } })
  const firstBed = await db.inspectionItem.create({ data: { roomId: firstBedroom.id, name: 'Bed', category: 'FURNITURE', condition: 'GOOD', identifier: 'BED-ONE' } })
  const secondBed = await db.inspectionItem.create({ data: { roomId: secondBedroom.id, name: 'Bed', category: 'FURNITURE', condition: 'POOR', identifier: 'BED-TWO' } })
  const cupboard = await db.inspectionItem.create({ data: { roomId: store.id, name: 'Cupboard', category: 'FIXTURE', condition: 'GOOD', notes: 'Store cupboard' } })
  // An invalid historical cross-room evidence row must not displace the two valid
  // photos, or be presented as this hob. Late uploads/videos/unlinked room photos
  // likewise do not become item thumbnails.
  const crossRoom = await capture(firstBedroom.id, 'other-room', { itemId: hob.id, at: 0 })
  const late = await capture(kitchen.id, 'late-upload', { itemId: hob.id, agreed: false, at: 1 })
  const video = await capture(kitchen.id, 'video', { itemId: hob.id, kind: 'VIDEO', at: 2 })
  const photos = await Promise.all([3, 4, 5].map((at) => capture(kitchen.id, `hob-${at}`, { itemId: hob.id, at })))
  const unlinked = await capture(kitchen.id, 'unlinked-room-photo', { at: 6 })
  const bedOnePhoto = await capture(firstBedroom.id, 'bed-one', { itemId: firstBed.id, at: 7 })
  const bedTwoPhoto = await capture(secondBedroom.id, 'bed-two', { itemId: secondBed.id, at: 8 })
  await capture(store.id, 'cupboard', { itemId: cupboard.id, at: 9 })
  as(agent)
  const checkOutId = await startCheckOut(checkIn.id)
  const rooms = await db.room.findMany({ where: { inspectionId: checkOutId }, orderBy: { order: 'asc' }, include: { items: true } })
  const checkoutKitchen = rooms[0]
  const checkoutHob = checkoutKitchen.items.find((item) => item.baselineKey === `item:${hob.id}`)!
  const frozen = roomBaselineSchema.parse(checkoutKitchen.baseline)
  const frozenHob = frozen.lines.find((line) => line.key === `item:${hob.id}`)!
  frozenHob.condition = 'POOR'
  frozenHob.notes = 'Agreed dent noted at check-in'
  frozenHob.update = true
  // A condition notice was part of the agreed state when this check-out began.
  // Reading the mutable/original check-in row instead would show GOOD above.
  await db.room.update({ where: { id: checkoutKitchen.id }, data: { name: 'Galley', baseline: frozen as Prisma.InputJsonValue } })
  await db.inspectionItem.update({ where: { id: checkoutHob.id }, data: { name: 'Induction hob', condition: 'DAMAGED', notes: 'Newly cracked glass' } })
  const ownPhotos = await Promise.all([10, 11, 12].map((at) => capture(checkoutKitchen.id, `checkout-hob-${at}`, { itemId: checkoutHob.id, at })))
  const checkoutLate = await capture(checkoutKitchen.id, 'checkout-late', { itemId: checkoutHob.id, agreed: false, at: 13 })
  const checkoutCross = await capture(rooms[1].id, 'checkout-cross-room', { itemId: checkoutHob.id, at: 1 })
  await db.inspection.update({ where: { id: checkOutId }, data: { status: 'COMPLETED', conductedById: conductor.id } })
  signPhotos.mockClear()
  return {
    agent, conductor, stranger, landlord, tenant, checkIn, checkOutId, rooms,
    kitchen, firstBedroom, secondBedroom, store, hob, wall, retired, firstBed, secondBed, cupboard,
    checkoutKitchen, checkoutHob, photos, ownPhotos, bedOnePhoto, bedTwoPhoto,
    excludedPaths: [crossRoom.storagePath, late.storagePath, video.storagePath, unlinked.storagePath, checkoutLate.storagePath, checkoutCross.storagePath],
  }
}

type Photo = { id: string; url: string; note: string | null; annotations: unknown }
type Comparable = {
  id: string; label: string; roomId: string; roomName: string; name: string; category: string;
  condition: string; quantity: number; identifier: string | null; meterReading: string | null; notes: string | null;
  baselineKey: string | null; photos: Photo[];
  checkIn: null | { key: string; name: string; condition: string; notes: string | null; photos: Photo[] };
  representedAtCheckOut: boolean; representedByItemIds: string[]; includedAtCheckOutStart: boolean | null;
}
type ResponseBody = { checkOutItems: Comparable[]; checkInItems: Comparable[]; findings: { baselineLabel: string | null; baselineCondition: string | null }[] }

async function get(id: string) {
  return GET(new Request(`http://localhost/api/v1/inspections/${id}`), { params: Promise.resolve({ id }) })
}

beforeEach(() => { signPhotos.mockClear() })
afterAll(async () => {
  await db.property.deleteMany({ where: { id: { in: propertyIds } } })
  await db.stakeholder.deleteMany({ where: { id: { in: peopleIds } } })
  await db.$disconnect()
})

describe('finding chooser comparables', () => {
  it('keeps stable IDs and labels while enriching current and frozen agreed descriptions with bounded linked photos', async () => {
    const record = await fixture()
    // Later changes to original media metadata cannot alter a frozen comparison.
    await db.capture.update({ where: { id: record.photos[0].id }, data: { note: 'Changed after the snapshot', annotations: { obsolete: true } } })
    const response = await get(record.checkOutId)
    expect(response.status).toBe(200)
    const body = await response.json() as ResponseBody
    const current = body.checkOutItems.find((item) => item.id === record.checkoutHob.id)!
    expect(current).toMatchObject({
      id: record.checkoutHob.id, label: 'Galley · Induction hob', roomId: record.checkoutKitchen.id, roomName: 'Galley',
      name: 'Induction hob', category: 'APPLIANCE', condition: 'DAMAGED', quantity: 2, identifier: 'HOB-123',
      meterReading: null, notes: 'Newly cracked glass', baselineKey: `item:${record.hob.id}`,
      checkIn: { key: `item:${record.hob.id}`, name: 'Hob', condition: 'POOR', notes: 'Agreed dent noted at check-in' },
    })
    expect(current.photos.map((photo) => photo.id)).toEqual(record.ownPhotos.slice(0, 2).map((photo) => photo.id))
    expect(current.checkIn!.photos.map((photo) => photo.id)).toEqual(record.photos.slice(0, 2).map((photo) => photo.id))
    expect(current.checkIn!.photos[0]).toMatchObject({ note: 'hob-3', annotations: annotation })
    expect(current.photos[0]).not.toHaveProperty('storagePath')
    const original = body.checkInItems.find((item) => item.id === record.hob.id)!
    expect(original).toMatchObject({
      id: record.hob.id, label: 'Kitchen · Hob', roomId: record.kitchen.id, roomName: 'Kitchen', condition: 'POOR',
      notes: 'Agreed dent noted at check-in', representedAtCheckOut: true, representedByItemIds: [record.checkoutHob.id], includedAtCheckOutStart: true,
    })
    expect(original.photos).toEqual(current.checkIn!.photos)
    expect(body.checkOutItems.find((item) => item.baselineKey === `item:${record.wall.id}`)!.photos).toEqual([])
    expect(signPhotos).toHaveBeenCalledTimes(1)
    const paths = signPhotos.mock.calls[0][0]
    expect(new Set(paths).size).toBe(paths.length)
    for (const excluded of [...record.excludedPaths, record.photos[2].storagePath, record.ownPhotos[2].storagePath]) expect(paths).not.toContain(excluded)
  })

  it('matches renamed and duplicate-named rooms by their frozen keys, not labels', async () => {
    const record = await fixture()
    const first = record.rooms[1].items.find((item) => item.baselineKey === `item:${record.firstBed.id}`)!
    const second = record.rooms[2].items.find((item) => item.baselineKey === `item:${record.secondBed.id}`)!
    await db.room.update({ where: { id: record.rooms[1].id }, data: { name: 'Guest bedroom' } })
    await db.inspectionItem.update({ where: { id: first.id }, data: { name: 'Single bed' } })
    const body = await (await get(record.checkOutId)).json() as ResponseBody
    expect(body.checkOutItems.find((item) => item.id === first.id)).toMatchObject({
      label: 'Guest bedroom · Single bed', checkIn: { name: 'Bed', condition: 'GOOD', photos: [{ id: record.bedOnePhoto.id }] },
    })
    expect(body.checkOutItems.find((item) => item.id === second.id)).toMatchObject({
      label: 'Bedroom · Bed', checkIn: { name: 'Bed', condition: 'POOR', photos: [{ id: record.bedTwoPhoto.id }] },
    })
    expect(body.checkInItems.find((item) => item.id === record.firstBed.id)!.representedByItemIds).toEqual([first.id])
    expect(body.checkInItems.find((item) => item.id === record.secondBed.id)!.representedByItemIds).toEqual([second.id])
  })

  it('distinguishes an absent copied item, a retired original and a deleted whole room conservatively', async () => {
    const record = await fixture()
    const wallCopy = record.checkoutKitchen.items.find((item) => item.baselineKey === `item:${record.wall.id}`)!
    const retiredCopy = record.checkoutKitchen.items.find((item) => item.baselineKey === `item:${record.retired.id}`)!
    const frozen = roomBaselineSchema.parse((await db.room.findUniqueOrThrow({ where: { id: record.checkoutKitchen.id } })).baseline)
    frozen.lines = frozen.lines.filter((line) => line.key !== `item:${record.retired.id}`)
    await db.room.update({ where: { id: record.checkoutKitchen.id }, data: { baseline: frozen as Prisma.InputJsonValue } })
    await db.inspectionItem.deleteMany({ where: { id: { in: [wallCopy.id, retiredCopy.id] } } })
    await db.room.delete({ where: { id: record.rooms[3].id } })
    const body = await (await get(record.checkOutId)).json() as ResponseBody
    expect(body.checkInItems.find((item) => item.id === record.wall.id)).toMatchObject({ representedAtCheckOut: false, representedByItemIds: [], includedAtCheckOutStart: true })
    expect(body.checkInItems.find((item) => item.id === record.retired.id)).toMatchObject({ representedAtCheckOut: false, includedAtCheckOutStart: false })
    expect(body.checkInItems.find((item) => item.id === record.cupboard.id)).toMatchObject({ representedAtCheckOut: false, includedAtCheckOutStart: null })
  })

  it('does not infer linked reference photos when a legacy frozen line has no photoIds', async () => {
    const record = await fixture()
    const frozen = roomBaselineSchema.parse((await db.room.findUniqueOrThrow({ where: { id: record.checkoutKitchen.id } })).baseline)
    delete frozen.lines.find((line) => line.key === `item:${record.hob.id}`)!.photoIds
    await db.room.update({ where: { id: record.checkoutKitchen.id }, data: { baseline: frozen as Prisma.InputJsonValue } })
    const body = await (await get(record.checkOutId)).json() as ResponseBody
    const current = body.checkOutItems.find((item) => item.id === record.checkoutHob.id)!
    expect(current.checkIn).toMatchObject({ condition: 'POOR', notes: 'Agreed dent noted at check-in', photos: [] })
    expect(body.checkInItems.find((item) => item.id === record.hob.id)!.photos).toEqual([])
    expect(current.photos).toHaveLength(2)
    expect(signPhotos.mock.calls[0][0]).not.toContain(record.photos[0].storagePath)
  })

  it('uses legacy name matching only for keyless rows and independently authorizes a linked check-in on another tenancy', async () => {
    const record = await fixture()
    const wallCopy = record.checkoutKitchen.items.find((item) => item.baselineKey === `item:${record.wall.id}`)!
    await db.inspectionItem.update({ where: { id: wallCopy.id }, data: { baselineKey: null } })
    await db.room.update({ where: { id: record.checkoutKitchen.id }, data: { name: 'Kitchen' } })
    let body = await (await get(record.checkOutId)).json() as ResponseBody
    expect(body.checkInItems.find((item) => item.id === record.wall.id)).toMatchObject({ representedAtCheckOut: true, representedByItemIds: [wallCopy.id] })
    await db.finding.create({ data: {
      inspectionId: record.checkOutId, itemId: record.checkoutHob.id, baselineItemId: record.hob.id,
      changeType: 'DAMAGE', verdict: 'UNDECIDED', rationale: 'Crack at check-out', editedByHuman: true,
    } })
    // Even a linked baseline must pass its own scope: a collaboration grant on the
    // check-out's term cannot expose another term's agreed inventory or photos.
    const original = await db.tenancy.findUniqueOrThrow({ where: { id: record.checkIn.tenancyId } })
    const checkOutTenancy = await db.tenancy.create({ data: {
      propertyId: original.propertyId, landlordId: original.landlordId, tenantId: original.tenantId,
      agentId: original.agentId, startDate: original.startDate, endDate: original.endDate,
      monthlyRent: original.monthlyRent, deposit: original.deposit,
      collaborators: { create: { stakeholderId: record.conductor.id, grantedById: record.agent.id } },
    } })
    await db.inspection.update({ where: { id: record.checkOutId }, data: { tenancyId: checkOutTenancy.id } })
    signPhotos.mockClear()
    as(record.conductor)
    const response = await get(record.checkOutId)
    expect(response.status).toBe(200)
    body = await response.json() as ResponseBody
    expect(body.checkInItems).toEqual([])
    expect(body.checkOutItems.every((item) => item.checkIn === null)).toBe(true)
    expect(body.findings[0]).toMatchObject({ baselineLabel: null, baselineCondition: null })
    expect(body.checkOutItems.find((item) => item.id === record.checkoutHob.id)).toMatchObject({ name: 'Induction hob', condition: 'DAMAGED' })
    const paths = signPhotos.mock.calls[0][0]
    expect(paths).toEqual(record.ownPhotos.slice(0, 2).map((photo) => photo.storagePath))
  })

  it('keeps signed-out/foreign IDs indistinguishable and leaves comparable arrays empty before completion', async () => {
    const record = await fixture()
    as(record.stranger)
    const denied = await get(record.checkOutId)
    const missing = await get('not-an-inspection')
    expect(denied.status).toBe(404)
    expect(await denied.json()).toEqual(await missing.json())
    expect(signPhotos).not.toHaveBeenCalled()
    vi.mocked(currentStakeholder).mockResolvedValue(null)
    expect((await get(record.checkOutId)).status).toBe(401)
    as(record.agent)
    await db.inspection.update({ where: { id: record.checkOutId }, data: { status: 'AWAITING_SIGNATURE' } })
    const body = await (await get(record.checkOutId)).json() as ResponseBody
    expect(body.checkOutItems).toEqual([])
    expect(body.checkInItems).toEqual([])
    expect(signPhotos).not.toHaveBeenCalled()
  })
})
