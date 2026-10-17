import { afterAll, describe, expect, it, vi } from 'vitest'

/// A check-out inspector walking a room sees it as it was at check-in: the lines the
/// check-out was started from and the photos both parties agreed to, and beside each
/// copied row, what that row said at check-in.

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/storage', () => ({
  createDownloadUrl: vi.fn(async (path: string) => `https://storage.test/${path}`),
}))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn() }
})

import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'
import { addRoom, renameRoom, startCheckOut } from '@/lib/actions'
import { checkInReference, checkInReferenceSelect } from '@/lib/check-in-reference'

const postalCode = '998812'

async function signedCheckIn(label: string) {
  const person = (name: string) => db.stakeholder.create({ data: { name: `${name} ${label}` } })
  const agent = await person('Agent')
  const property = await db.property.create({
    data: { line1: `${label} block`, postalCode, type: 'PRIVATE_NON_LANDED' },
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
  vi.mocked(requireAgent).mockResolvedValue(agent)
  return db.inspection.create({
    data: {
      tenancyId: tenancy.id,
      kind: 'CHECK_IN',
      status: 'COMPLETED',
      conductedAt: new Date('2024-01-02T03:00:00Z'),
      rooms: {
        create: [
          {
            name: 'Kitchen',
            order: 0,
            status: 'REVIEWED',
            items: {
              create: [
                { name: 'Hob', category: 'APPLIANCE', condition: 'GOOD', createdAt: new Date('2024-01-02T03:00:01Z') },
                {
                  name: 'Worktop',
                  category: 'SURFACE',
                  condition: 'FAIR',
                  notes: 'Burn mark by the sink',
                  createdAt: new Date('2024-01-02T03:00:02Z'),
                },
              ],
            },
            captures: {
              create: [
                {
                  kind: 'PHOTO',
                  storagePath: `${label}/kitchen-agreed.jpg`,
                  mimeType: 'image/jpeg',
                  sizeBytes: 1,
                  processedAt: new Date('2024-01-02T04:00:00Z'),
                },
                // Landed after Send, so never part of what was agreed.
                { kind: 'PHOTO', storagePath: `${label}/kitchen-late.jpg`, mimeType: 'image/jpeg', sizeBytes: 1 },
              ],
            },
          },
          { name: 'Bathroom', order: 1, status: 'REVIEWED' },
          // Two rooms the inspector happened to give one name.
          {
            name: 'Bedroom',
            order: 2,
            status: 'REVIEWED',
            items: { create: [{ name: 'Bed', category: 'FURNITURE', condition: 'GOOD' }] },
            captures: {
              create: [{
                kind: 'PHOTO',
                storagePath: `${label}/bedroom-1.jpg`,
                mimeType: 'image/jpeg',
                sizeBytes: 1,
                processedAt: new Date('2024-01-02T04:00:00Z'),
              }],
            },
          },
          {
            name: 'Bedroom',
            order: 3,
            status: 'REVIEWED',
            items: { create: [{ name: 'Wardrobe', category: 'FURNITURE', condition: 'POOR' }] },
            captures: {
              create: [{
                kind: 'PHOTO',
                storagePath: `${label}/bedroom-2.jpg`,
                mimeType: 'image/jpeg',
                sizeBytes: 1,
                processedAt: new Date('2024-01-02T04:00:00Z'),
              }],
            },
          },
        ],
      },
    },
    include: { rooms: { include: { items: true } } },
  })
}

const checkOutRooms = (checkOutId: string) =>
  db.room.findMany({
    where: { inspectionId: checkOutId },
    orderBy: { order: 'asc' },
    select: { id: true, name: true, items: true, ...checkInReferenceSelect },
  })

const reference = async (roomId: string) =>
  checkInReference(await db.room.findUniqueOrThrow({ where: { id: roomId }, select: checkInReferenceSelect }))

afterAll(async () => {
  await db.property.deleteMany({ where: { postalCode } })
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

describe('check-in reference', () => {
  it('shows a check-out room its check-in lines and only the agreed photos', async () => {
    const checkIn = await signedCheckIn('REFERENCE-KITCHEN')
    const [kitchen, bathroom] = await checkOutRooms(await startCheckOut(checkIn.id))

    expect(await checkInReference(kitchen)).toMatchObject({
      baselineId: checkIn.id,
      conductedAt: '2024-01-02T03:00:00.000Z',
      photos: [{ url: 'https://storage.test/REFERENCE-KITCHEN/kitchen-agreed.jpg', annotations: null }],
    })
    expect((await checkInReference(kitchen))!.lines.map((line) => [line.name, line.condition, line.notes])).toEqual([
      ['Hob', 'GOOD', null],
      ['Worktop', 'FAIR', 'Burn mark by the sink'],
    ])
    expect(await checkInReference(bathroom)).toMatchObject({ lines: [], photos: [] })
  })

  it('names each copied row by the check-in line it came from, which survives an edit', async () => {
    const checkIn = await signedCheckIn('REFERENCE-KEYS')
    const [kitchen] = await checkOutRooms(await startCheckOut(checkIn.id))
    const checkInKitchen = checkIn.rooms.find((room) => room.name === 'Kitchen')!

    expect(kitchen.items.map((item) => item.baselineKey).sort()).toEqual(
      checkInKitchen.items.map((item) => `item:${item.id}`).sort(),
    )

    const hob = kitchen.items.find((item) => item.name === 'Hob')!
    await db.inspectionItem.update({ where: { id: hob.id }, data: { condition: 'DAMAGED' } })
    expect((await reference(kitchen.id))!.lines.find((line) => line.key === hob.baselineKey)).toMatchObject({
      name: 'Hob',
      condition: 'GOOD',
    })
  })

  it('keeps each room its own check-in, renamed or sharing a name with another', async () => {
    const checkIn = await signedCheckIn('REFERENCE-NAMES')
    const checkOutId = await startCheckOut(checkIn.id)
    const [kitchen, , first, second] = await checkOutRooms(checkOutId)

    await renameRoom(kitchen.id, checkOutId, 'Galley')
    expect((await reference(kitchen.id))!.lines.map((line) => line.name)).toEqual(['Hob', 'Worktop'])

    expect(await checkInReference(first)).toMatchObject({
      lines: [{ name: 'Bed' }],
      photos: [{ url: 'https://storage.test/REFERENCE-NAMES/bedroom-1.jpg' }],
    })
    expect(await checkInReference(second)).toMatchObject({
      lines: [{ name: 'Wardrobe' }],
      photos: [{ url: 'https://storage.test/REFERENCE-NAMES/bedroom-2.jpg' }],
    })
  })

  it('is what the check-out started from, whatever happens to the check-in after', async () => {
    const checkIn = await signedCheckIn('REFERENCE-FROZEN')
    const [kitchen] = await checkOutRooms(await startCheckOut(checkIn.id))
    const hob = checkIn.rooms.find((room) => room.name === 'Kitchen')!.items.find((item) => item.name === 'Hob')!
    await db.inspectionItem.update({ where: { id: hob.id }, data: { condition: 'POOR' } })

    expect((await reference(kitchen.id))!.lines[0]).toMatchObject({ name: 'Hob', condition: 'GOOD' })
  })

  it('has nothing to show on a check-in, or on a room the check-in never had', async () => {
    const checkIn = await signedCheckIn('REFERENCE-NONE')
    expect(await reference(checkIn.rooms.find((room) => room.name === 'Kitchen')!.id)).toBeNull()

    const checkOutId = await startCheckOut(checkIn.id)
    expect(await reference(await addRoom(checkOutId, 'Study'))).toBeNull()
  })
})
