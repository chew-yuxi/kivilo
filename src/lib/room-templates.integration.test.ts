import { afterAll, describe, expect, it, vi } from 'vitest'

/// A new room arrives with the standard rows for its kind, made in the same write as the
/// room and exactly as Add makes a line, so the web, the app and every installed build
/// get them from the server. A check-out begins with the check-in's signed room and item
/// state, ready for the inspector to record what changed.

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn() }
})

import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'
import { addItem, addRoom, deleteItem, startCheckOut } from '@/lib/actions'
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

  it('starts rooms empty when the check-in is not fully furnished', async () => {
    const inspection = await deal('TEMPLATE-UNFURNISHED')
    await db.inspection.update({
      where: { id: inspection.id },
      data: { fullyFurnished: false },
    })

    const roomId = await addRoom(inspection.id, 'Kitchen')

    expect(await items(roomId)).toEqual([])
  })

  it('starts a check-out from the check-in room and item state', async () => {
    const inspection = await deal('TEMPLATE-CHECKOUT')
    const kitchen = await addRoom(inspection.id, 'Kitchen')
    await addRoom(inspection.id, 'Master bathroom')
    expect(await db.inspectionItem.count({ where: { roomId: kitchen } })).toBe(9)
    const hob = await db.inspectionItem.findFirstOrThrow({ where: { roomId: kitchen, name: 'Hob' } })
    await db.inspectionItem.update({
      where: { id: hob.id },
      data: {
        condition: 'FAIR',
        quantity: 2,
        notes: 'Light scratches',
        identifier: 'HOB-42',
        meterReading: '17.5 kWh',
      },
    })
    await db.inspection.update({ where: { id: inspection.id }, data: { status: 'COMPLETED' } })

    const checkOut = await startCheckOut(inspection.id)
    const rooms = await db.room.findMany({
      where: { inspectionId: checkOut },
      orderBy: { order: 'asc' },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    })
    expect(rooms.map((room) => [room.name, room.items.length])).toEqual([
      ['Kitchen', 9],
      ['Master bathroom', 9],
    ])
    expect(rooms[0].items.find((item) => item.name === 'Hob')).toMatchObject({
      category: 'APPLIANCE',
      condition: 'FAIR',
      quantity: 2,
      notes: 'Light scratches',
      identifier: 'HOB-42',
      meterReading: '17.5 kWh',
      sourceCaptureId: null,
      confidence: null,
      editedByHuman: true,
    })
  })
})

describe('emptying a reviewed room', () => {
  it('sends it back to review, so "Nothing recorded" is only ever the inspector\'s word', async () => {
    const inspection = await deal('TEMPLATE-EMPTIED')
    const roomId = await addRoom(inspection.id, 'Store room')
    await db.room.update({ where: { id: roomId }, data: { status: 'REVIEWED' } })
    const [last, ...rest] = (await items(roomId)).reverse()

    for (const row of rest) await deleteItem(row.id, inspection.id)
    expect(await db.room.findUniqueOrThrow({ where: { id: roomId } })).toMatchObject({ status: 'REVIEWED' })

    await deleteItem(last.id, inspection.id)
    expect(await db.room.findUniqueOrThrow({ where: { id: roomId } })).toMatchObject({ status: 'REVIEW' })
  })
})
