import { afterAll, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'

/// A check-in can be created with its rooms already set up, each with the standard
/// editable lines a room added by hand gets, and a create retried by the phone after a
/// lost response returns the same check-in rather than a second property.

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn() }
})

import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'
import { createInspection } from '@/lib/actions'
import { templateRows } from '@/lib/room-templates'

const postalCode = '993344'
const people: string[] = []

async function agent(name: string) {
  const person = await db.stakeholder.create({
    data: { name, subscription: { create: { plan: 'PRO', seats: 1, status: 'comped' } } },
  })
  people.push(person.id)
  return person
}

function create(by: { id: string }, extra: { clientId?: string; rooms?: string[] }) {
  vi.mocked(requireAgent).mockResolvedValueOnce(by as never)
  return createInspection({
    line1: 'Setup Road', unit: '#04-11', postalCode, propertyType: 'HDB', furnishingLevel: 'PARTIALLY_FURNISHED',
    landlordName: 'Landlord', landlordEmail: null, tenantName: 'Tenant', tenantEmail: null,
    startDate: '2026-11-01', endDate: '2028-10-31', monthlyRent: '3000', deposit: '6000',
    ...extra,
  })
}

afterAll(async () => {
  const tenancies = await db.tenancy.findMany({ where: { property: { postalCode } }, select: { landlordId: true, tenantId: true } })
  await db.property.deleteMany({ where: { postalCode } })
  await db.stakeholder.deleteMany({ where: { id: { in: [...people, ...tenancies.flatMap((t) => [t.landlordId, t.tenantId])] } } })
  await db.$disconnect()
})

describe('check-in setup', () => {
  it('creates the chosen rooms in order with their standard lines and history', async () => {
    const by = await agent('Agent SETUP-ROOMS')
    const id = await create(by, { rooms: ['Living room', 'Kitchen', ' Bedroom 1 ', 'Bathroom', ''] })
    const rooms = await db.room.findMany({
      where: { inspectionId: id }, orderBy: { order: 'asc' },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    })
    expect(rooms.map((room) => [room.order, room.name])).toEqual([
      [0, 'Living room'], [1, 'Kitchen'], [2, 'Bedroom 1'], [3, 'Bathroom'],
    ])
    for (const room of rooms) {
      expect(room.items.map((item) => item.name)).toEqual(templateRows(room.name, 'PARTIALLY_FURNISHED').map((row) => row.name))
      expect(room.items.every((item) => item.editedByHuman && item.condition === 'GOOD')).toBe(true)
    }
    const history = await db.propertyEvent.findMany({ where: { inspectionId: id, kind: 'ROOM_ADDED' } })
    expect(history).toHaveLength(4)
  })

  it('returns the same check-in for a retried create, and to nobody else', async () => {
    const by = await agent('Agent SETUP-RETRY')
    const other = await agent('Other SETUP-RETRY')
    const clientId = randomUUID()
    const first = await create(by, { clientId, rooms: ['Kitchen'] })
    expect(await create(by, { clientId, rooms: ['Kitchen'] })).toBe(first)
    await expect(create(other, { clientId })).rejects.toThrow('Inspection not found')
    expect(await db.inspection.count({ where: { clientId } })).toBe(1)
    expect(await db.room.count({ where: { inspectionId: first } })).toBe(1)
  })

  it('still creates a check-in with no rooms, as older app builds send', async () => {
    const id = await create(await agent('Agent SETUP-NONE'), {})
    expect(await db.room.count({ where: { inspectionId: id } })).toBe(0)
  })
})
