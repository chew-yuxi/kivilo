import { afterAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '@/lib/db'
import { authorizeInspection, authorizeTenancy } from '@/lib/auth'
import { createPropertyAsset } from '@/lib/maintenance'
import { propertyTimeline } from '@/lib/property-timeline'

/// Small teams cover each other's handovers and check-outs, so a teammate works a deal
/// exactly as its own agent does, and stops the moment they leave the team. Anyone else
/// gets the same refusal as a deal that does not exist.

const postalCode = '996666'
const tag = randomUUID().slice(0, 8)
const created: string[] = []
const teams: string[] = []

async function person(name: string, teamId: string | null = null) {
  const row = await db.stakeholder.create({ data: { name: `${name} ${tag}`, teamId } })
  created.push(row.id)
  return row
}

async function team(name: string) {
  const row = await db.team.create({ data: { name: `${name} ${tag}` } })
  teams.push(row.id)
  return row
}

async function deal(agentId: string) {
  const property = await db.property.create({
    data: { line1: `Team ${tag}`, postalCode, type: 'PRIVATE_NON_LANDED' },
  })
  const [landlord, tenant] = [await person('Landlord'), await person('Tenant')]
  const tenancy = await db.tenancy.create({
    data: {
      propertyId: property.id,
      landlordId: landlord.id,
      tenantId: tenant.id,
      agentId,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2099-01-01'),
      monthlyRent: '3000',
      deposit: '6000',
    },
  })
  const inspection = await db.inspection.create({
    data: {
      tenancyId: tenancy.id,
      kind: 'CHECK_IN',
      status: 'COMPLETED',
      signatures: {
        create: [
          { stakeholderId: landlord.id, imageData: 'data:,' },
          { stakeholderId: tenant.id, imageData: 'data:,' },
        ],
      },
    },
  })
  return { property, tenancy, inspection }
}

describe('teams', () => {
  afterAll(async () => {
    await db.property.deleteMany({ where: { postalCode } })
    await db.stakeholder.deleteMany({ where: { id: { in: created } } })
    await db.team.deleteMany({ where: { id: { in: teams } } })
    await db.$disconnect()
  })

  it('lets a teammate work a deal as its own agent would', async () => {
    const ours = await team('Ng and Lim')
    const owner = await person('Owner', ours.id)
    const teammate = await person('Teammate', ours.id)
    const { property, tenancy, inspection } = await deal(owner.id)

    await expect(authorizeInspection(inspection.id, teammate.id)).resolves.toMatchObject({ id: inspection.id })
    await expect(authorizeTenancy(tenancy.id, teammate.id)).resolves.toMatchObject({ role: 'AGENT' })
    await expect(createPropertyAsset(property.id, teammate.id, { name: 'Aircon', category: 'APPLIANCE' }))
      .resolves.toBeTruthy()
    // The timeline opens the working copy for them, as it does for the deal's agent.
    const timeline = await propertyTimeline(property.id, teammate.id)
    expect(timeline.events.find((event) => event.kind === 'CHECK_IN_SIGNED')?.link)
      .toEqual({ type: 'inspection', id: inspection.id })
  })

  it('refuses an agent on another team, or on none, like a missing deal', async () => {
    const ours = await team('Ours')
    const theirs = await team('Theirs')
    const owner = await person('Owner', ours.id)
    const stranger = await person('Stranger', theirs.id)
    const loner = await person('Loner')
    const { tenancy, inspection } = await deal(owner.id)

    for (const outsider of [stranger, loner]) {
      await expect(authorizeInspection(inspection.id, outsider.id)).rejects.toThrow('Inspection not found')
      await expect(authorizeTenancy(tenancy.id, outsider.id)).rejects.toThrow('Tenancy not found')
    }
  })

  it('ends access the moment someone leaves, and the deal stays with its agent', async () => {
    const ours = await team('Leaving')
    const owner = await person('Owner', ours.id)
    const leaver = await person('Leaver', ours.id)
    const { inspection } = await deal(owner.id)
    await expect(authorizeInspection(inspection.id, leaver.id)).resolves.toBeTruthy()

    await db.stakeholder.update({ where: { id: leaver.id }, data: { teamId: null } })

    await expect(authorizeInspection(inspection.id, leaver.id)).rejects.toThrow('Inspection not found')
    await expect(authorizeInspection(inspection.id, owner.id)).resolves.toBeTruthy()
  })

  it("does not let a teammate's own deals reach the team through the landlord or tenant", async () => {
    const ours = await team('Parties')
    const agent = await person('Agent', ours.id)
    const teammate = await person('Teammate', ours.id)
    // The teammate is only the landlord here; a deal they are a party to is not a team deal.
    const property = await db.property.create({
      data: { line1: `Team ${tag}`, postalCode, type: 'PRIVATE_NON_LANDED' },
    })
    const tenancy = await db.tenancy.create({
      data: {
        propertyId: property.id, landlordId: teammate.id, tenantId: (await person('Tenant')).id,
        agentId: (await person('Outside agent')).id,
        startDate: new Date('2026-01-01'), endDate: new Date('2099-01-01'), monthlyRent: '1', deposit: '1',
      },
    })
    await expect(authorizeTenancy(tenancy.id, agent.id)).rejects.toThrow('Tenancy not found')
  })
})
