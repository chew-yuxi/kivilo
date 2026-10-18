import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'

vi.mock('@/lib/auth', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/auth')>()),
  currentStakeholder: vi.fn(),
}))

import { db } from '@/lib/db'
import { currentStakeholder } from '@/lib/auth'
import { inspectionHandover } from '@/lib/handover'
import { GET } from '@/app/api/v1/inspections/[id]/handover/route'
import type { Stakeholder } from '@/generated/prisma'

const postalCode = '995522'
const tag = randomUUID().slice(0, 8)
const people: string[] = []
const teams: string[] = []

async function person(name: string, teamId?: string) {
  const person = await db.stakeholder.create({ data: { name: `${name} ${tag}`, teamId } })
  people.push(person.id)
  return person
}

async function deal() {
  const team = await db.team.create({ data: { name: `Handover ${tag}-${randomUUID()}` } })
  teams.push(team.id)
  const agent = await person('Agent', team.id)
  const teammate = await person('Teammate', team.id)
  const landlord = await person('Landlord')
  const tenant = await person('Tenant')
  const property = await db.property.create({ data: { line1: `Handover ${tag}`, postalCode, type: 'PRIVATE_NON_LANDED' } })
  const tenancy = await db.tenancy.create({
    data: {
      propertyId: property.id, agentId: agent.id, landlordId: landlord.id, tenantId: tenant.id,
      startDate: new Date('2026-06-01T00:00:00+08:00'), endDate: new Date('2099-01-01'),
      defectWindowDays: 30, monthlyRent: '3000', deposit: '6000',
    },
  })
  const inspection = await db.inspection.create({ data: { tenancyId: tenancy.id, kind: 'CHECK_IN', status: 'AWAITING_SIGNATURE' } })
  return { agent, teammate, landlord, tenant, tenancy, inspection }
}

describe('tenant handover access', () => {
  beforeEach(() => { process.env.KIVILO_APP_URL = 'https://kivilo.test' })
  afterAll(async () => {
    await db.property.deleteMany({ where: { postalCode } })
    await db.stakeholder.deleteMany({ where: { id: { in: people } } })
    await db.team.deleteMany({ where: { id: { in: teams } } })
    await db.$disconnect()
  })

  it('becomes available at the tenant signature, with an uncredentialed QR and the exact Singapore deadline', async () => {
    const record = await deal()
    await expect(inspectionHandover(record.inspection.id, record.agent.id)).rejects.toThrow('Report not found')
    await db.signature.create({ data: { inspectionId: record.inspection.id, stakeholderId: record.tenant.id, imageData: 'data:,' } })
    for (const viewer of [record.agent, record.teammate, record.landlord, record.tenant]) {
      const handover = await inspectionHandover(record.inspection.id, viewer.id)
      expect(handover).toMatchObject({ tenancyId: record.tenancy.id, url: `https://kivilo.test/handover/${record.inspection.id}`, deadline: '2026-06-30', windowDays: 30 })
      expect(handover.modules.length).toBeGreaterThan(20)
      expect(handover.modules.every((row) => row.length === handover.modules.length && row.every((bit) => typeof bit === 'boolean'))).toBe(true)
      expect(handover.url).not.toContain('email')
      expect(handover.url).not.toContain('/reports/')
    }
  })

  it('returns one identical API refusal for an outsider, a missing report, a check-out and an unsigned tenant', async () => {
    const record = await deal()
    const stranger = await person('Stranger')
    const responseFor = async (id: string, viewer: Stakeholder) => {
      vi.mocked(currentStakeholder).mockResolvedValueOnce(viewer)
      const response = await GET(new Request(`https://kivilo.test/api/v1/inspections/${id}/handover`), { params: Promise.resolve({ id }) })
      return [response.status, await response.text()]
    }
    const missing = await responseFor('cmissing0000000000000000', record.tenant)
    expect(missing).toEqual([404, '{"error":"not_found"}'])
    expect(await responseFor(record.inspection.id, record.tenant)).toEqual(missing)
    await db.signature.create({ data: { inspectionId: record.inspection.id, stakeholderId: record.tenant.id, imageData: 'data:,' } })
    expect(await responseFor(record.inspection.id, stranger)).toEqual(missing)
    await db.inspection.update({ where: { id: record.inspection.id }, data: { kind: 'CHECK_OUT' } })
    expect(await responseFor(record.inspection.id, record.agent)).toEqual(missing)
    vi.mocked(currentStakeholder).mockResolvedValueOnce(null)
    const signedOut = await GET(new Request('https://kivilo.test/api/v1/inspections/anything/handover'), { params: Promise.resolve({ id: record.inspection.id }) })
    expect(signedOut.status).toBe(401)
  })
})
