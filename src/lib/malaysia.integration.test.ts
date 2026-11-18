import { afterAll, describe, expect, it, vi } from 'vitest'
import { createHash, randomUUID } from 'node:crypto'

/// A Malaysian property, end to end: made in Malaysia by the app, its money in ringgit on
/// every API and document that carries it, and none of Singapore's CEA due diligence.
/// `singapore-hashes.integration.test.ts` pins that none of this moved a Singapore report.

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn(), currentStakeholder: vi.fn() }
})

import { db } from '@/lib/db'
import { currentStakeholder, requireAgent } from '@/lib/auth'
import { publishAssessment } from '@/lib/assessment-actions'
import { signedReport } from '@/lib/report'
import { reportFingerprint } from '@/lib/report-fingerprint'
import { buildReportModel, loadReportRow } from '@/lib/report-pdf/model'
import { verifyTenancyParties } from '@/lib/cdd/cases'
import { updateTenancyDetails } from '@/lib/tenancy-details'
import { tenancyDetail } from '@/lib/maintenance'
import { depositStatement, assessmentSnapshotSchema } from '@/lib/assessment-schema'
import type { Stakeholder } from '@/generated/prisma'
import * as inspectionsRoute from '@/app/api/v1/inspections/route'
import * as inspectionRoute from '@/app/api/v1/inspections/[id]/route'
import * as verificationRoute from '@/app/api/v1/tenancies/[id]/verification/route'
import * as overviewRoute from '@/app/api/v1/properties/[id]/overview/route'

const POSTAL = '50470'
const tag = randomUUID().slice(0, 8)

afterAll(async () => {
  const tenancies = await db.tenancy.findMany({ where: { property: { postalCode: { in: [POSTAL, '993355'] } } }, select: { landlordId: true, tenantId: true } })
  await db.property.deleteMany({ where: { postalCode: { in: [POSTAL, '993355'] } } })
  await db.stakeholder.deleteMany({
    where: { OR: [{ name: { endsWith: tag } }, { id: { in: tenancies.flatMap((each) => [each.landlordId, each.tenantId]) } }] },
  })
  await db.$disconnect()
})

async function agent() {
  return db.stakeholder.create({
    data: { name: `Malaysia agent ${tag}`, subscription: { create: { plan: 'PRO', seats: 1, status: 'comped' } } },
  })
}

const as = (person: Stakeholder) => {
  vi.mocked(currentStakeholder).mockResolvedValue(person)
  vi.mocked(requireAgent).mockResolvedValue(person)
}

function post(body: Record<string, unknown>) {
  return inspectionsRoute.POST(new Request('http://test/api/v1/inspections', {
    method: 'POST',
    body: JSON.stringify({
      line1: 'Residensi Sentral, Jalan Tun Sambanthan, Kuala Lumpur', unit: 'A-12-3', postalCode: POSTAL,
      landlordName: `Landlord ${tag}`, landlordEmail: `landlord-${tag}@malaysia.test`,
      tenantName: `Tenant ${tag}`, tenantEmail: `tenant-${tag}@malaysia.test`,
      startDate: '2026-12-01', endDate: '2028-11-30', monthlyRent: '2500', deposit: '5000.50',
      ...body,
    }),
  }), { params: Promise.resolve({}) })
}

const params = <T,>(value: T) => ({ params: Promise.resolve(value) })

describe('a Malaysian property', () => {
  it('is made in Malaysia when the app says so, and in Singapore when an installed build says nothing', async () => {
    const by = await agent()
    as(by)
    const malaysian = await post({ country: 'MY', propertyType: 'LANDED', verifyParties: true })
    expect(malaysian.status).toBe(200)
    const { id } = await malaysian.json() as { id: string }
    const { tenancy } = await db.inspection.findUniqueOrThrow({ where: { id }, include: { tenancy: { include: { property: true, cddCases: true } } } })
    expect(tenancy.property.country).toBe('MY')
    // Asked for, but CEA due diligence is Singapore law: nothing was started.
    expect(tenancy.cddCases).toEqual([])

    const installed = await post({ postalCode: '993355', unit: null, line1: `Installed ${tag}`, landlordEmail: null, tenantEmail: null })
    const created = await db.inspection.findUniqueOrThrow({ where: { id: (await installed.json() as { id: string }).id }, include: { tenancy: { include: { property: true } } } })
    expect(created.tenancy.property.country).toBe('SG')
  })

  it('refuses HDB, in a new check-in and in an edit', async () => {
    const by = await agent()
    as(by)
    const refused = await post({ country: 'MY', propertyType: 'HDB', landlordEmail: null, tenantEmail: null })
    expect(refused.status).toBe(400)
    const { id } = await (await post({ country: 'MY', propertyType: 'PRIVATE_NON_LANDED', landlordEmail: null, tenantEmail: null })).json() as { id: string }
    const { tenancyId } = await db.inspection.findUniqueOrThrow({ where: { id } })
    await expect(updateTenancyDetails(tenancyId, by.id, {
      propertyType: 'HDB', landlordEmail: null, tenantEmail: null,
      startDate: '2026-12-01', endDate: '2028-11-30', monthlyRent: '2500', deposit: '5000',
    })).rejects.toThrow('That property type is not offered in Malaysia')
  })

  it('carries ringgit on its APIs, reports, PDF and deposit statement, and is never checked under CEA rules', async () => {
    const by = await agent()
    as(by)
    const { id: checkInId } = await (await post({ country: 'MY', propertyType: 'PRIVATE_NON_LANDED', landlordEmail: null, tenantEmail: null })).json() as { id: string }
    const checkIn = await db.inspection.findUniqueOrThrow({ where: { id: checkInId }, include: { tenancy: true } })
    const { tenancyId, tenancy } = checkIn

    const detail = await (await inspectionRoute.GET(new Request(`http://test/api/v1/inspections/${checkInId}`), params({ id: checkInId }))).json()
    expect(detail).toMatchObject({ country: 'MY', currency: 'MYR', deposit: '5000.5', property: `A-12-3, Residensi Sentral, Jalan Tun Sambanthan, Kuala Lumpur, ${POSTAL} Malaysia` })
    expect((await tenancyDetail(tenancyId, by.id)).currency).toBe('MYR')

    await expect(verifyTenancyParties(by.id, tenancyId)).rejects.toThrow('for Singapore properties only')
    const verification = await (await verificationRoute.GET(new Request('http://test/'), params({ id: tenancyId }))).json()
    expect(verification).toMatchObject({ enabled: false })
    const overview = await (await overviewRoute.GET(new Request('http://test/'), params({ id: tenancy.propertyId }))).json()
    expect(overview).toMatchObject({ country: 'MY', currency: 'MYR' })
    expect(overview.terms[0].verification).toBeNull()

    // Signed, then a check-out with one tenant-liable finding, published.
    await db.inspection.update({ where: { id: checkInId }, data: { status: 'COMPLETED' } })
    const checkOut = await db.inspection.create({ data: { tenancyId, kind: 'CHECK_OUT', status: 'COMPLETED', baselineId: checkInId } })
    const room = await db.room.create({ data: { inspectionId: checkOut.id, name: 'Kitchen', order: 0, status: 'REVIEWED' } })
    const item = await db.inspectionItem.create({ data: { roomId: room.id, name: 'Worktop', category: 'SURFACE', condition: 'DAMAGED', editedByHuman: true } })
    await db.finding.create({
      data: { inspectionId: checkOut.id, itemId: item.id, changeType: 'DAMAGE', verdict: 'TENANT_LIABLE', rationale: 'Burn', estimatedCost: '320.10', editedByHuman: true },
    })
    await publishAssessment(checkOut.id)

    const version = await db.assessmentVersion.findFirstOrThrow({ where: { inspectionId: checkOut.id } })
    const snapshot = assessmentSnapshotSchema.parse(version.snapshot)
    expect(snapshot.country).toBe('MY')
    expect(version.contentHash).toBe(createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'))
    expect(depositStatement(snapshot)).toMatchObject({ deposit: 5000.5, deductions: 320.1, toReturn: 4680.4 })
    const asked = await db.notification.findFirstOrThrow({ where: { href: `/sign/${checkOut.id}`, recipientId: tenancy.tenantId } })
    expect(asked.body).toBe('The check-out assessment proposes deductions of RM 320.10 from the deposit of RM 5,000.50. Agree or dispute it.')

    const report = await signedReport(checkOut.id, tenancy.landlordId)
    expect(report).toMatchObject({ currency: 'MYR', property: expect.stringMatching(/50470 Malaysia$/) })
    expect(report.assessment?.statement).toMatchObject({ deposit: 5000.5, toReturn: 4680.4 })

    const model = buildReportModel((await loadReportRow(checkOut.id))!)
    expect(model).toMatchObject({ country: 'MY', address: expect.stringMatching(/50470 Malaysia$/) })
    expect(model.assessment).toMatchObject({ country: 'MY' })

    // The country is part of what is signed: the same report in Singapore is another one.
    const signed = await reportFingerprint(db, checkInId)
    await db.property.update({ where: { id: tenancy.propertyId }, data: { country: 'SG' } })
    expect(await reportFingerprint(db, checkInId)).not.toBe(signed)
    await db.property.update({ where: { id: tenancy.propertyId }, data: { country: 'MY' } })
    expect(await reportFingerprint(db, checkInId)).toBe(signed)
  })
})
