import { afterAll, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'

/// The landlord is rarely at the handover, so they sign the report from their own phone.
/// Only as themselves, only on their own tenancy, and only while it awaits signature; the
/// result is the same record, and the same completion, as a signature on the agent's phone.

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/storage', () => ({
  createDownloadUrl: vi.fn(async (path: string) => `https://storage.test/${path}`),
}))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireStakeholder: vi.fn() }
})

import { db } from '@/lib/db'
import { requireStakeholder } from '@/lib/auth'
import { signOwnReport } from '@/lib/actions'
import { signedReport } from '@/lib/report'
import { listTenancies } from '@/lib/maintenance'
import type { InspectionStatus, Stakeholder } from '@/generated/prisma'

const postalCode = '997788'
const tag = randomUUID().slice(0, 8)
const created: string[] = []
const png = 'data:image/png;base64,iVBORw0KGgo='

async function person(name: string) {
  const row = await db.stakeholder.create({ data: { name: `${name} ${tag}` } })
  created.push(row.id)
  return row
}

async function deal(status: InspectionStatus) {
  const [landlord, tenant, agent] = [await person('Landlord'), await person('Tenant'), await person('Agent')]
  const property = await db.property.create({
    data: { line1: `Signing ${tag}`, postalCode, type: 'PRIVATE_NON_LANDED' },
  })
  const tenancy = await db.tenancy.create({
    data: {
      propertyId: property.id, landlordId: landlord.id, tenantId: tenant.id, agentId: agent.id,
      startDate: new Date('2026-01-01'), endDate: new Date('2099-01-01'), monthlyRent: '3000', deposit: '6000',
    },
  })
  const inspection = await db.inspection.create({ data: { tenancyId: tenancy.id, kind: 'CHECK_IN', status } })
  return { landlord, tenant, agent, inspection }
}

function signedInAs(person: Stakeholder) {
  vi.mocked(requireStakeholder).mockResolvedValueOnce(person)
}

describe('signing your own report', () => {
  afterAll(async () => {
    await db.property.deleteMany({ where: { postalCode } })
    await db.stakeholder.deleteMany({ where: { id: { in: created } } })
    await db.$disconnect()
  })

  it('lets the landlord sign from their own phone, completing a report the tenant signed at handover', async () => {
    const { landlord, tenant, inspection } = await deal('AWAITING_SIGNATURE')
    await db.signature.create({ data: { inspectionId: inspection.id, stakeholderId: tenant.id, imageData: png } })

    expect((await signedReport(inspection.id, landlord.id)).signAs).toBe('LANDLORD')
    expect((await listTenancies(landlord.id))[0].latestReport).toMatchObject({ awaitingMySignature: true })

    signedInAs(landlord)
    await signOwnReport(inspection.id, png)

    const after = await signedReport(inspection.id, landlord.id)
    expect(after.status).toBe('COMPLETED')
    expect(after.signAs).toBeNull()
    expect(after.signatures).toHaveLength(2)
    expect((await listTenancies(landlord.id))[0].latestReport).toMatchObject({ awaitingMySignature: false })
  })

  it('waits for the other party when the first signature comes from a phone', async () => {
    const { landlord, tenant, inspection } = await deal('AWAITING_SIGNATURE')

    signedInAs(landlord)
    await signOwnReport(inspection.id, png)

    expect((await signedReport(inspection.id, landlord.id)).status).toBe('AWAITING_SIGNATURE')
    expect((await signedReport(inspection.id, tenant.id)).signAs).toBe('TENANT')
  })

  it("refuses a report still being written, one already complete, and someone else's", async () => {
    const draft = await deal('REVIEW')
    const done = await deal('COMPLETED')
    const theirs = await deal('AWAITING_SIGNATURE')

    signedInAs(draft.landlord)
    await expect(signOwnReport(draft.inspection.id, png)).rejects.toThrow('Report not found')
    signedInAs(done.landlord)
    await expect(signOwnReport(done.inspection.id, png)).rejects.toThrow('Report not found')
    signedInAs(draft.landlord)
    await expect(signOwnReport(theirs.inspection.id, png)).rejects.toThrow('Report not found')
    // The agent collects signatures; they cannot sign one as themselves.
    signedInAs(theirs.agent)
    await expect(signOwnReport(theirs.inspection.id, png)).rejects.toThrow('Report not found')
    expect(await db.signature.count({ where: { inspectionId: theirs.inspection.id } })).toBe(0)
  })
})
