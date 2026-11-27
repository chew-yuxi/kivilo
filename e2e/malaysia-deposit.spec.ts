import { expect, test } from '@playwright/test'
import { accessTokenFor, freshEmail } from './helpers'

test('a Malaysian handover can be signed with an unknown deposit, then assessed in MYR', async ({ request }) => {
  const agent = { Authorization: `Bearer ${await accessTokenFor(freshEmail('my-agent'))}` }
  const tenantEmail = freshEmail('my-tenant')
  const landlordEmail = freshEmail('my-landlord')
  const created = await request.post('/api/v1/inspections', { headers: agent, data: {
    country: 'MY', line1: '12 Jalan Ampang', unit: 'A-12-3', postalCode: '50450',
    propertyType: 'PRIVATE_NON_LANDED', furnishingLevel: 'FULLY_FURNISHED',
    tenantName: 'Test Tenant', landlordName: 'Test Landlord', tenantEmail, landlordEmail,
    startDate: '2026-11-01', endDate: '2027-10-31', rooms: ['Kitchen'],
    monthlyRent: '', deposit: '', preservesBlankAmounts: true,
  } })
  expect(created.status()).toBe(200)
  const checkIn = (await created.json()).id as string
  const tenant = { Authorization: `Bearer ${await accessTokenFor(tenantEmail)}` }
  const landlord = { Authorization: `Bearer ${await accessTokenFor(landlordEmail)}` }
  const signature = { imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAQCAYAAAB+690jAAAAnUlEQVR4nOVUAQqAIAz0Rv//8kWgYtKmMyWhgRBzzfPOHUiGnULCZnG0CgBkCkniU4ZQgPmtZDKTHcR/3jAr3ncDgGlZYEZBmZKxAHN9a4doF+gFVdah9qG6OR6aWvkWSA1oqlHHXhtxPuS1nCafZR83QC2KGRv1elMC5fEvGTFAxv2eg7xmKqPvgItcWyyp6GBiVuQp82odVgPaJU7UAIEZC8LLpgAAAABJRU5ErkJggg==' }
  async function sign(id: string) {
    const base = `/api/v1/inspections/${id}`
    const detail = await (await request.get(base, { headers: agent })).json()
    expect(detail).toMatchObject({ country: 'MY', currency: 'MYR', needsDeposit: true })
    expect(detail.property).toContain('50450 Malaysia')
    const room = `${base}/rooms/${detail.rooms[0].id}`
    expect((await request.post(room + '/finish', { headers: agent })).status()).toBe(200)
    expect((await request.post(room + '/review', { headers: agent })).status()).toBe(200)
    expect((await request.post(base + '/review', { headers: agent })).status()).toBe(200)
    for (const party of [landlord, tenant]) {
      expect((await request.post(base + '/report/signature', { headers: party, data: signature })).status()).toBe(200)
    }
    const report = await (await request.get(base + '/report', { headers: tenant })).json()
    expect(report).toMatchObject({ status: 'COMPLETED', currency: 'MYR' })
    expect(report.signatures).toHaveLength(2)
    return (await request.get(base, { headers: agent })).json()
  }
  await sign(checkIn)
  const started = await request.post(`/api/v1/inspections/${checkIn}/checkout`, { headers: agent })
  expect(started.status()).toBe(200)
  const checkOut = (await started.json()).id as string
  const detail = await sign(checkOut)
  const base = `/api/v1/inspections/${checkOut}`
  const signedBefore = await (await request.get(base + '/report', { headers: tenant })).json()
  const finding = await request.post(base + '/findings', { headers: agent, data: {
    itemId: detail.checkOutItems[0].id, baselineItemId: null, changeType: 'DAMAGE',
    verdict: 'TENANT_LIABLE', rationale: 'A cracked cupboard door at handback.', estimatedCost: '250',
  } })
  expect(finding.status()).toBe(200)
  const missing = await request.post(base + '/findings/publish', { headers: agent, data: {} })
  expect(missing.status()).toBe(409)
  expect((await missing.json()).error).toBe('deposit_required')
  for (const data of [{ confirmedDeposit: '2000.00' }, {}]) {
    expect((await request.post(base + '/findings/publish', { headers: agent, data })).status()).toBe(200)
  }
  const report = await (await request.get(base + '/report', { headers: tenant })).json()
  expect(report.assessment.version).toBe(1)
  expect(report.assessment.statement).toMatchObject({ deposit: 2000, deductions: 250, toReturn: 1750 })
  expect(report.signatures).toEqual(signedBefore.signatures)
})
