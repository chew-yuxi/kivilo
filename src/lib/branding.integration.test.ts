import { readFileSync } from 'node:fs'
import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn() }
})

import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'
import { getBranding, removeBrandingLogo, saveBranding, saveBrandingLogo } from '@/lib/branding'
import { reportPdfUrl } from '@/lib/report-pdf'

afterAll(async () => {
  await db.property.deleteMany({ where: { postalCode: '996666' } })
  await db.stakeholder.deleteMany({ where: { name: { startsWith: 'Branding ' } } })
  await db.$disconnect()
})

describe('agent branding', () => {
  it('accepts a real raster logo only after the agency is named, and can remove it', async () => {
    const agent = await db.stakeholder.create({ data: { name: 'Branding agent' } })
    const png = new Uint8Array(readFileSync('public/icon-192.png'))

    await expect(saveBrandingLogo(agent.id, png)).rejects.toThrow('Save your agency name')
    await expect(saveBranding(agent.id, { agencyName: '  ' })).rejects.toThrow()
    expect(await saveBranding(agent.id, {
      agencyName: 'Harbourline Realty Pte Ltd', agencyLicence: '', ceaRegistration: 'R061234B',
    })).toMatchObject({ agencyName: 'Harbourline Realty Pte Ltd', agencyLicence: null, logoUrl: null })

    // Named as an image, but the bytes are not one.
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
    await expect(saveBrandingLogo(agent.id, svg)).rejects.toThrow('Unsupported logo')
    await expect(saveBrandingLogo(agent.id, new Uint8Array(1_000_001).fill(0x89)))
      .rejects.toThrow('Unsupported logo')

    expect((await saveBrandingLogo(agent.id, png))?.logoUrl).toMatch(/branding%2F|branding\//)
    expect((await removeBrandingLogo(agent.id))?.logoUrl).toBeNull()
    expect(await getBranding(agent.id)).toMatchObject({ ceaRegistration: 'R061234B' })
  })

  it('prints only a countersigned report, for the agent on the deal', async () => {
    const agent = await db.stakeholder.create({ data: { name: 'Branding pdf agent' } })
    const stranger = await db.stakeholder.create({ data: { name: 'Branding stranger' } })
    const landlord = await db.stakeholder.create({ data: { name: 'Branding landlord' } })
    const tenant = await db.stakeholder.create({ data: { name: 'Branding tenant' } })
    const property = await db.property.create({
      data: { line1: 'Branding test', postalCode: '996666', type: 'PRIVATE_NON_LANDED' },
    })
    const tenancy = await db.tenancy.create({
      data: {
        propertyId: property.id, landlordId: landlord.id, tenantId: tenant.id, agentId: agent.id,
        startDate: new Date('2026-01-01'), endDate: new Date('2027-01-01'), monthlyRent: '3000', deposit: '6000',
      },
    })
    const inspection = await db.inspection.create({
      data: { tenancyId: tenancy.id, kind: 'CHECK_IN', status: 'AWAITING_SIGNATURE' },
    })

    vi.mocked(requireAgent).mockResolvedValue(agent)
    await expect(reportPdfUrl(inspection.id, 'http://localhost'))
      .rejects.toThrow('Only a countersigned report')

    vi.mocked(requireAgent).mockResolvedValue(stranger)
    await expect(reportPdfUrl(inspection.id, 'http://localhost')).rejects.toThrow('Inspection not found')
  })
})
