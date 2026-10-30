import { afterAll, describe, expect, it, vi } from 'vitest'

/// Faster inventory writing: a duplicated line copies structure only, and one condition
/// for several selected lines stays inside their room and an open report.

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn() }
})

import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'
import { createInspection, duplicateItem, setItemsCondition, updateItem } from '@/lib/actions'

const postalCode = '993355'
const people: string[] = []

async function agent(name: string) {
  const person = await db.stakeholder.create({
    data: { name, subscription: { create: { plan: 'PRO', seats: 1, status: 'comped' } } },
  })
  people.push(person.id)
  return person
}

const as = (person: { id: string }) => vi.mocked(requireAgent).mockResolvedValue(person as never)

async function checkIn(by: { id: string }) {
  as(by)
  const id = await createInspection({
    line1: 'Shortcut Road', unit: null, postalCode, propertyType: 'HDB', furnishingLevel: 'FULLY_FURNISHED',
    landlordName: 'Landlord', landlordEmail: null, tenantName: 'Tenant', tenantEmail: null,
    startDate: '2026-11-01', endDate: '2028-10-31', monthlyRent: '3000', deposit: '6000',
    rooms: ['Kitchen', 'Bedroom'],
  })
  const rooms = await db.room.findMany({ where: { inspectionId: id }, orderBy: { order: 'asc' }, include: { items: true } })
  return { id, kitchen: rooms[0], bedroom: rooms[1] }
}

afterAll(async () => {
  const tenancies = await db.tenancy.findMany({ where: { property: { postalCode } }, select: { landlordId: true, tenantId: true } })
  await db.property.deleteMany({ where: { postalCode } })
  await db.stakeholder.deleteMany({ where: { id: { in: [...people, ...tenancies.flatMap((t) => [t.landlordId, t.tenantId])] } } })
  await db.$disconnect()
})

describe('inventory shortcuts', () => {
  it('duplicates a line as structure only', async () => {
    const by = await agent('Agent SHORTCUT-COPY')
    const { id, kitchen } = await checkIn(by)
    const fridge = kitchen.items.find((item) => item.name === 'Fridge')!
    await updateItem(fridge.id, id, { condition: 'FAIR', quantity: 2, notes: 'Dent on left door', identifier: 'SN-123', meterReading: '42' })

    const copyId = await duplicateItem(fridge.id, id)
    const copy = await db.inspectionItem.findUniqueOrThrow({ where: { id: copyId }, include: { evidence: true } })
    expect(copy).toMatchObject({
      roomId: kitchen.id, name: 'Fridge', category: 'APPLIANCE', condition: 'FAIR', quantity: 2,
      notes: null, identifier: null, meterReading: null, baselineKey: null, propertyAssetId: null, editedByHuman: true,
    })
    expect(copy.evidence).toEqual([])
    expect(await db.propertyEvent.count({ where: { inspectionId: id, summary: { contains: 'a copy of Fridge' } } })).toBe(1)
  })

  it('sets one condition on selected lines of one room, and nowhere else', async () => {
    const by = await agent('Agent SHORTCUT-BULK')
    const other = await agent('Other SHORTCUT-BULK')
    const { id, kitchen, bedroom } = await checkIn(by)
    const [first, second, untouched] = kitchen.items

    await setItemsCondition(kitchen.id, id, [first.id, second.id], 'POOR')
    const after = await db.inspectionItem.findMany({ where: { roomId: { in: [kitchen.id, bedroom.id] } } })
    const condition = (itemId: string) => after.find((item) => item.id === itemId)!.condition
    expect([condition(first.id), condition(second.id), condition(untouched.id)]).toEqual(['POOR', 'POOR', 'GOOD'])
    expect(after.filter((item) => item.roomId === bedroom.id).every((item) => item.condition === 'GOOD')).toBe(true)
    expect(await db.propertyEvent.count({ where: { inspectionId: id, kind: 'ITEM_EDITED' } })).toBe(2)

    // A line from another room, someone else, or a sent report: nothing changes.
    await expect(setItemsCondition(kitchen.id, id, [first.id, bedroom.items[0].id], 'FAIR')).rejects.toThrow('Item not found')
    as(other)
    await expect(setItemsCondition(kitchen.id, id, [first.id], 'FAIR')).rejects.toThrow()
    await expect(duplicateItem(first.id, id)).rejects.toThrow()
    as(by)
    await db.inspection.update({ where: { id }, data: { status: 'AWAITING_SIGNATURE' } })
    await expect(setItemsCondition(kitchen.id, id, [first.id], 'FAIR')).rejects.toThrow()
    await expect(duplicateItem(first.id, id)).rejects.toThrow()
    expect((await db.inspectionItem.findUniqueOrThrow({ where: { id: first.id } })).condition).toBe('POOR')
  })
})
