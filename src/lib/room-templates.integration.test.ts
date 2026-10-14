import { afterAll, describe, expect, it, vi } from 'vitest'

/// A new room arrives with the standard rows for its kind, made in the same write as the
/// room and exactly as Add makes a line, so the web, the app and every installed build
/// get them from the server. A check-out's rooms are the check-in's route walked again,
/// not new rooms, and start with nothing on them.

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn() }
})

import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'
import { addItem, addRoom, startCheckOut } from '@/lib/actions'
import type { InspectionItem } from '@/generated/prisma'

const postalCode = '998811'

async function deal(label: string) {
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
  const inspection = await db.inspection.create({ data: { tenancyId: tenancy.id, kind: 'CHECK_IN' } })
  vi.mocked(requireAgent).mockResolvedValue(agent)
  return inspection
}

const items = (roomId: string) =>
  db.inspectionItem.findMany({ where: { roomId }, orderBy: { createdAt: 'asc' } })

/// Everything about a line except what the template chooses and what is unique to a row.
const made = ({ condition, quantity, editedByHuman, confidence, notes, identifier, meterReading }: InspectionItem) =>
  ({ condition, quantity, editedByHuman, confidence, notes, identifier, meterReading })

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

describe('room templates', () => {
  it('starts a new room with its standard rows, in order, made as Add makes a line', async () => {
    const inspection = await deal('TEMPLATE-KITCHEN')
    const roomId = await addRoom(inspection.id, 'Kitchen')

    const rows = await items(roomId)
    expect(rows.map((row) => [row.name, row.category])).toEqual([
      ['Walls', 'SURFACE'],
      ['Ceiling', 'SURFACE'],
      ['Floor', 'SURFACE'],
      ['Door', 'FIXTURE'],
      ['Lights and switches', 'FIXTURE'],
      ['Cabinets', 'FIXTURE'],
      ['Sink and tap', 'FIXTURE'],
      ['Hob', 'APPLIANCE'],
      ['Cooker hood', 'APPLIANCE'],
    ])

    const added = await db.inspectionItem.findUniqueOrThrow({ where: { id: await addItem(roomId, inspection.id) } })
    expect(made(added)).toEqual({
      condition: 'GOOD',
      quantity: 1,
      editedByHuman: true,
      confidence: null,
      notes: null,
      identifier: null,
      meterReading: null,
    })
    for (const row of rows) expect(made(row)).toEqual(made(added))
    // A line the inspector adds lands after the template's, where they are looking.
    expect((await items(roomId)).at(-1)!.id).toBe(added.id)
  })

  it('chooses the rows by the name the room was given', async () => {
    const inspection = await deal('TEMPLATE-NAMES')
    const bathroom = await addRoom(inspection.id, 'Common bathroom')
    const bedroom = await addRoom(inspection.id, 'Bedroom 2')

    expect((await items(bathroom)).map((row) => row.name)).toEqual([
      'Walls', 'Ceiling', 'Floor', 'Door', 'Lights and switches', 'Toilet', 'Basin and tap', 'Shower', 'Mirror',
    ])
    expect((await items(bedroom)).map((row) => row.name)).toEqual([
      'Walls', 'Ceiling', 'Floor', 'Door', 'Lights and switches',
    ])
  })

  it('gives a check-out the check-in rooms with no template rows on them', async () => {
    const inspection = await deal('TEMPLATE-CHECKOUT')
    const kitchen = await addRoom(inspection.id, 'Kitchen')
    await addRoom(inspection.id, 'Master bathroom')
    expect(await db.inspectionItem.count({ where: { roomId: kitchen } })).toBe(9)
    await db.inspection.update({ where: { id: inspection.id }, data: { status: 'COMPLETED' } })

    const checkOut = await startCheckOut(inspection.id)
    const rooms = await db.room.findMany({
      where: { inspectionId: checkOut },
      orderBy: { order: 'asc' },
      include: { _count: { select: { items: true } } },
    })
    expect(rooms).toMatchObject([
      { name: 'Kitchen', _count: { items: 0 } },
      { name: 'Master bathroom', _count: { items: 0 } },
    ])
  })
})
