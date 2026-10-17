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
import { renameRoom, startCheckOut } from '@/lib/actions'
import { checkInReference } from '@/lib/check-in-reference'

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
        ],
      },
    },
    include: { rooms: { include: { items: true } } },
  })
}

const checkOutRoom = (checkOutId: string, name: string) =>
  db.room.findFirstOrThrow({
    where: { inspectionId: checkOutId, name },
    include: { items: true, inspection: { select: { kind: true, baselineId: true } } },
  })

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
    const checkOutId = await startCheckOut(checkIn.id)
    const kitchen = await checkOutRoom(checkOutId, 'Kitchen')

    const reference = await checkInReference(kitchen)
    expect(reference).toMatchObject({
      baselineId: checkIn.id,
      conductedAt: '2024-01-02T03:00:00.000Z',
      matched: true,
      photos: [{ url: 'https://storage.test/REFERENCE-KITCHEN/kitchen-agreed.jpg', annotations: null }],
    })
    expect(reference!.lines.map((line) => [line.name, line.condition, line.notes])).toEqual([
      ['Hob', 'GOOD', null],
      ['Worktop', 'FAIR', 'Burn mark by the sink'],
    ])
  })

  it('names each copied row by the check-in line it came from, which survives an edit', async () => {
    const checkIn = await signedCheckIn('REFERENCE-KEYS')
    const checkOutId = await startCheckOut(checkIn.id)
    const kitchen = await checkOutRoom(checkOutId, 'Kitchen')
    const checkInKitchen = checkIn.rooms.find((room) => room.name === 'Kitchen')!

    expect(kitchen.items.map((item) => item.baselineKey).sort()).toEqual(
      checkInKitchen.items.map((item) => `item:${item.id}`).sort(),
    )

    const hob = kitchen.items.find((item) => item.name === 'Hob')!
    await db.inspectionItem.update({ where: { id: hob.id }, data: { condition: 'DAMAGED' } })
    const reference = await checkInReference(kitchen)
    expect(reference!.lines.find((line) => line.key === hob.baselineKey)).toMatchObject({
      name: 'Hob',
      condition: 'GOOD',
    })
  })

  it('says so when no check-in room has the name, and reads an empty one as empty', async () => {
    const checkIn = await signedCheckIn('REFERENCE-RENAMED')
    const checkOutId = await startCheckOut(checkIn.id)

    const bathroom = await checkOutRoom(checkOutId, 'Bathroom')
    expect(await checkInReference(bathroom)).toMatchObject({ matched: true, lines: [], photos: [] })

    const kitchen = await checkOutRoom(checkOutId, 'Kitchen')
    await renameRoom(kitchen.id, checkOutId, 'Galley')
    const renamed = await checkOutRoom(checkOutId, 'Galley')
    expect(await checkInReference(renamed)).toMatchObject({ matched: false, lines: [], photos: [] })
  })

  it('has nothing to show on a check-in', async () => {
    const checkIn = await signedCheckIn('REFERENCE-CHECKIN')
    const kitchen = await db.room.findFirstOrThrow({
      where: { inspectionId: checkIn.id, name: 'Kitchen' },
      include: { inspection: { select: { kind: true, baselineId: true } } },
    })
    expect(await checkInReference(kitchen)).toBeNull()
  })
})
