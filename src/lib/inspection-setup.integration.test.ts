import { afterAll, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'

/// A check-in can be created with its rooms already set up, each with the standard
/// editable lines a room added by hand gets, and a create retried by the phone after a
/// lost response returns the same check-in rather than a second property.

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn(), currentStakeholder: vi.fn() }
})

import { db } from '@/lib/db'
import { currentStakeholder, requireAgent } from '@/lib/auth'
import { createInspection } from '@/lib/actions'
import { createRenewal } from '@/lib/renewal-actions'
import { startableProperties } from '@/lib/property-work'
import { contactSuggestions } from '@/lib/contacts'
import { templateRows } from '@/lib/room-templates'
import * as renewalRoute from '@/app/api/v1/renewals/[tenancyId]/route'

const postalCode = '993344'
const people: string[] = []

async function agent(name: string) {
  const person = await db.stakeholder.create({
    data: { name, subscription: { create: { plan: 'PRO', seats: 1, status: 'comped' } } },
  })
  people.push(person.id)
  return person
}

function create(by: { id: string }, extra: {
  clientId?: string; rooms?: string[]; propertyId?: string; agencyId?: string; sameLandlord?: boolean
  landlordName?: string; landlordEmail?: string | null; tenantName?: string; tenantEmail?: string | null
} = {}) {
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

  it('starts a new tenancy at a property its lead or team manager manages, and nobody else', async () => {
    const lead = await agent('Lead SETUP-EXISTING')
    const manager = await agent('Manager SETUP-EXISTING')
    const colleague = await agent('Colleague SETUP-EXISTING')
    const viewer = await agent('Viewer SETUP-EXISTING')
    const agency = await db.agency.create({ data: { name: 'SETUP-EXISTING team' } })
    await db.agencyMembership.createMany({ data: [
      { agencyId: agency.id, stakeholderId: lead.id, role: 'AGENT', status: 'ACTIVE' },
      { agencyId: agency.id, stakeholderId: manager.id, role: 'MANAGER', status: 'ACTIVE' },
      { agencyId: agency.id, stakeholderId: colleague.id, role: 'AGENT', status: 'ACTIVE' },
    ] })
    const first = await create(lead, { agencyId: agency.id, rooms: ['Kitchen', 'Bedroom'] })
    const { tenancy } = await db.inspection.findUniqueOrThrow({ where: { id: first }, include: { tenancy: true } })
    await db.tenancyCollaborator.create({ data: { tenancyId: tenancy.id, stakeholderId: colleague.id } })
    await db.inspectionAccessGrant.create({ data: { inspectionId: first, stakeholderId: viewer.id } })

    for (const person of [lead, manager]) {
      expect((await startableProperties(person.id)).filter((row) => row.id === tenancy.propertyId)).toEqual([
        expect.objectContaining({ agencyId: agency.id, rooms: ['Kitchen', 'Bedroom'], furnishingLevel: 'PARTIALLY_FURNISHED' }),
      ])
    }
    // A full collaborator in the team, and an old-report grant outside it, manage nothing.
    for (const [person, agencyId] of [[colleague, agency.id], [viewer, undefined]] as const) {
      expect((await startableProperties(person.id)).map((row) => row.id)).not.toContain(tenancy.propertyId)
      await expect(create(person, { propertyId: tenancy.propertyId, agencyId })).rejects.toThrow('Property not found')
    }
    // It stays in its team's workspace.
    await expect(create(manager, { propertyId: tenancy.propertyId })).rejects.toThrow('workspace')

    const next = await create(manager, { propertyId: tenancy.propertyId, agencyId: agency.id, rooms: ['Kitchen'] })
    const created = await db.inspection.findUniqueOrThrow({ where: { id: next }, include: { tenancy: { include: { property: true } } } })
    expect(created.tenancy.propertyId).toBe(tenancy.propertyId)
    expect(created.tenancy.property).toMatchObject({ line1: 'Setup Road', unit: '#04-11' })
    expect(await db.property.count({ where: { postalCode, id: tenancy.propertyId } })).toBe(1)

    await db.property.update({ where: { id: tenancy.propertyId }, data: { archivedAt: new Date() } })
    await expect(create(manager, { propertyId: tenancy.propertyId, agencyId: agency.id })).rejects.toThrow('Property not found')
    expect((await startableProperties(manager.id)).map((row) => row.id)).not.toContain(tenancy.propertyId)
  })

  it('offers a renewal the last check-in\'s room names and starts it with those chosen', async () => {
    const by = await agent('Agent SETUP-RENEW')
    const first = await create(by, { rooms: ['Living room', 'Kitchen', 'Bedroom'] })
    const { tenancy } = await db.inspection.findUniqueOrThrow({ where: { id: first }, include: { tenancy: true } })
    vi.mocked(currentStakeholder).mockResolvedValue(by as never)
    const offered = await renewalRoute.GET(new Request('http://test/'), { params: Promise.resolve({ tenancyId: tenancy.id }) })
    expect((await offered.json()).rooms).toEqual(['Living room', 'Kitchen', 'Bedroom'])

    vi.mocked(requireAgent).mockResolvedValue(by as never)
    const renewal = await createRenewal(tenancy.id, {
      startDate: '2028-11-01', endDate: '2030-10-31', monthlyRent: '3200', deposit: '6400', rooms: ['Living room', 'Kitchen'],
    })
    const rooms = await db.room.findMany({ where: { inspectionId: renewal }, orderBy: { order: 'asc' }, include: { items: true } })
    expect(rooms.map((room) => room.name)).toEqual(['Living room', 'Kitchen'])
    // Names only: a fresh room's standard lines, nothing from the earlier report.
    expect(rooms.every((room) => room.items.every((item) => item.condition === 'GOOD'))).toBe(true)
  })

  it('suggests only the people on tenancies this agent works, and links the same landlord', async () => {
    const by = await agent('Agent SETUP-PEOPLE')
    const outsider = await agent('Outsider SETUP-PEOPLE')
    const tag = randomUUID().slice(0, 8)
    const landlordEmail = `landlord-${tag}@example.com`
    const first = await create(by, { landlordName: 'Lee Landlord', landlordEmail, tenantName: 'Tan Tenant', tenantEmail: `tenant-${tag}@example.com` })
    const { tenancy } = await db.inspection.findUniqueOrThrow({ where: { id: first }, include: { tenancy: true } })

    expect(await contactSuggestions(by.id)).toEqual(expect.arrayContaining([
      { name: 'Lee Landlord', email: landlordEmail, roles: ['LANDLORD'] },
      { name: 'Tan Tenant', email: `tenant-${tag}@example.com`, roles: ['TENANT'] },
    ]))
    expect((await contactSuggestions(outsider.id)).map((contact) => contact.email)).not.toContain(landlordEmail)
    expect((await startableProperties(by.id)).find((row) => row.id === tenancy.propertyId)?.lastLandlord)
      .toEqual({ name: 'Lee Landlord', email: landlordEmail })

    // The same person, whatever name was sent, and never one the agent could not name.
    const next = await create(by, { propertyId: tenancy.propertyId, sameLandlord: true, landlordName: '', tenantName: 'New Tenant' })
    const created = await db.inspection.findUniqueOrThrow({ where: { id: next }, include: { tenancy: { include: { landlord: true } } } })
    expect(created.tenancy.landlordId).toBe(tenancy.landlordId)
    expect(created.tenancy.landlord.name).toBe('Lee Landlord')
    await expect(create(by, { sameLandlord: true })).rejects.toThrow('existing property')
    await expect(create(by, { propertyId: tenancy.propertyId, sameLandlord: true, tenantEmail: landlordEmail }))
      .rejects.toThrow('different email addresses')
  })
})
