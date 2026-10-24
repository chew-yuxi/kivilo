import { afterAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '@/lib/db'
import { propertyHistory } from '@/lib/property-history'
import { updateTenancyDetails } from '@/lib/tenancy-details'

const tag = randomUUID().slice(0, 8)
const postalCode = `8${tag.slice(0, 5)}`
const propertyIds: string[] = []
const stakeholderIds: string[] = []

async function fixture(status: 'DRAFT' | 'AWAITING_SIGNATURE' = 'DRAFT') {
  const [agent, landlord, tenant, stranger] = await Promise.all([
    db.stakeholder.create({ data: { name: `Details agent ${tag}` } }),
    db.stakeholder.create({ data: { name: `Details landlord ${tag}` } }),
    db.stakeholder.create({ data: { name: `Details tenant ${tag}` } }),
    db.stakeholder.create({ data: { name: `Details stranger ${tag}` } }),
  ])
  stakeholderIds.push(agent.id, landlord.id, tenant.id, stranger.id)
  const property = await db.property.create({
    data: { line1: `Details ${tag}`, postalCode, type: 'PRIVATE_NON_LANDED' },
  })
  propertyIds.push(property.id)
  const tenancy = await db.tenancy.create({
    data: {
      propertyId: property.id,
      agentId: agent.id,
      landlordId: landlord.id,
      tenantId: tenant.id,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2027-01-01'),
      monthlyRent: '3000',
      deposit: '6000',
      inspections: { create: { kind: 'CHECK_IN', status } },
    },
  })
  return { agent, stranger, property, tenancy }
}

const details = {
  line1: `Corrected Details ${tag}`,
  unit: '#02-03',
  postalCode: `7${tag.slice(0, 5)}`,
  propertyType: 'HDB' as const,
  landlordName: `Corrected landlord ${tag}`,
  landlordEmail: `landlord-${tag}@details.test`,
  tenantName: `Corrected tenant ${tag}`,
  tenantEmail: `tenant-${tag}@details.test`,
  startDate: '2026-02-01',
  endDate: '2028-02-01',
  monthlyRent: '3250.50',
  deposit: '6501',
}

afterAll(async () => {
  await db.property.deleteMany({ where: { id: { in: propertyIds } } })
  await db.stakeholder.deleteMany({ where: {
    OR: [{ id: { in: stakeholderIds } }, { email: { endsWith: `-${tag}@details.test` } }],
  } })
  await db.$disconnect()
})

describe('tenancy details', () => {
  it('adds party emails, updates the draft terms and records the change', async () => {
    const { agent, property, tenancy } = await fixture()
    await updateTenancyDetails(tenancy.id, agent.id, details)

    const updated = await db.tenancy.findUniqueOrThrow({
      where: { id: tenancy.id }, include: { landlord: true, tenant: true, property: true },
    })
    expect(updated.property).toMatchObject({
      line1: details.line1, unit: details.unit, postalCode: details.postalCode, type: details.propertyType,
    })
    expect(updated.landlord.name).toBe(details.landlordName)
    expect(updated.landlord.email).toBe(details.landlordEmail)
    expect(updated.tenant.name).toBe(details.tenantName)
    expect(updated.tenant.email).toBe(details.tenantEmail)
    expect(updated.startDate).toEqual(new Date('2026-02-01'))
    expect(updated.monthlyRent.toString()).toBe('3250.5')
    expect((await propertyHistory(property.id, agent.id)).events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'TENANCY_DETAILS_CHANGED', summary: 'changed the tenancy details' }),
      expect.objectContaining({ kind: 'PROPERTY_DETAILS_CHANGED', summary: 'changed the property details' }),
    ]))
  })

  it('refuses another person and freezes details when the report is sent', async () => {
    const draft = await fixture()
    await expect(updateTenancyDetails(draft.tenancy.id, draft.stranger.id, details))
      .rejects.toThrow('Tenancy not found')

    const sent = await fixture('AWAITING_SIGNATURE')
    await expect(updateTenancyDetails(sent.tenancy.id, sent.agent.id, details))
      .rejects.toThrow('fixed after a report is sent')
  })
})
