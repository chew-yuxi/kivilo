import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { accessTokenFor, freshEmail, FIXTURES, signIn } from './helpers'

test('a tenant records move-in conditions with evidence and only a landlord-agreed notice enters check-out', async ({ page, request }) => {
  const agentEmail = freshEmail('move-in-agent')
  const agent = { Authorization: `Bearer ${await accessTokenFor(agentEmail)}` }
  const landlordEmail = freshEmail('move-in-landlord')
  const tenantEmail = freshEmail('move-in-tenant')
  const startDate = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const created = await request.post('/api/v1/inspections', {
    headers: agent,
    data: {
      line1: '27 Jalan Merah Saga', unit: '#02-05', postalCode: '278106',
      propertyType: 'PRIVATE_NON_LANDED', fullyFurnished: true,
      landlordName: 'Move-in Landlord', landlordEmail,
      tenantName: 'Move-in Tenant', tenantEmail,
      startDate, endDate: '2028-08-31', monthlyRent: '7200', deposit: '14400',
    },
  })
  expect(created.status()).toBe(200)
  const inspectionId = (await created.json()).id as string
  const roomResponse = await request.post(`/api/v1/inspections/${inspectionId}/rooms`, { headers: agent, data: { name: 'Kitchen' } })
  expect(roomResponse.status()).toBe(200)
  const roomId = (await roomResponse.json()).id as string
  expect((await request.post(`/api/v1/inspections/${inspectionId}/rooms/${roomId}/finish`, { headers: agent })).status()).toBe(200)
  expect((await request.post(`/api/v1/inspections/${inspectionId}/rooms/${roomId}/review`, { headers: agent })).status()).toBe(200)
  expect((await request.post(`/api/v1/inspections/${inspectionId}/review`, { headers: agent })).status()).toBe(200)
  const detail = await (await request.get(`/api/v1/inspections/${inspectionId}`, { headers: agent })).json()
  const png = 'data:image/png;base64,iVBORw0KGgo='
  for (const stakeholderId of [detail.tenantId, detail.landlordId]) {
    expect((await request.post(`/api/v1/inspections/${inspectionId}/signatures`, {
      headers: agent, data: { stakeholderId, imageData: png },
    })).status()).toBe(200)
  }
  const tenant = { Authorization: `Bearer ${await accessTokenFor(tenantEmail)}` }
  const tenancy = await (await request.get(`/api/v1/tenancies/${detail.tenancyRecordId}`, { headers: tenant })).json()
  expect(tenancy.moveInDefects.canSubmit).toBe(true)
  const target = (tenancy.moveInDefects.targets as { key: string; name: string; roomName: string }[]).find((item) => item.name === 'Hob')!
  expect(target).toBeDefined()

  const notices: { addendumId: string; caseId: string }[] = []
  for (const description of ['Small chip on the corner at handover.', 'The right hob ring was already cracked.']) {
    const repair = await request.post(`/api/v1/tenancies/${detail.tenancyRecordId}/maintenance`, {
      headers: tenant,
      data: { clientId: randomUUID(), category: 'APPLIANCE', title: 'Hob condition at move-in', description, wasPresentAtMoveIn: true },
    })
    expect(repair.status()).toBe(200)
    const caseId = (await repair.json()).id as string
    const clientId = randomUUID()
    const media = { clientId, purpose: 'BEFORE', mimeType: 'image/png' }
    const uploadResponse = await request.post(`/api/v1/maintenance/${caseId}/upload-url`, { headers: tenant, data: media })
    expect(uploadResponse.status()).toBe(200)
    const upload = await uploadResponse.json()
    expect((await request.put(upload.signedUrl, { headers: { 'content-type': 'image/png' }, data: FIXTURES.photo.buffer })).ok()).toBe(true)
    expect((await request.post(`/api/v1/maintenance/${caseId}/evidence`, {
      headers: tenant,
      data: { ...media, storagePath: upload.storagePath, sizeBytes: FIXTURES.photo.buffer.length, note: description },
    })).status()).toBe(200)
    const repairDetail = await (await request.get(`/api/v1/maintenance/${caseId}`, { headers: tenant })).json()
    const published = await request.post(`/api/v1/maintenance/${caseId}/move-in-defect`, {
      headers: tenant,
      data: { targetKey: target.key, roomName: target.roomName, condition: 'DAMAGED', evidenceIds: repairDetail.evidence.map((photo: { id: string }) => photo.id) },
    })
    expect(published.status()).toBe(200)
    notices.push({ ...(await published.json()), caseId })
  }

  // A pending claim is shown as the tenant's account and has no agent in-person path.
  const pending = await (await request.get(`/api/v1/inspections/${inspectionId}/report`, { headers: agent })).json()
  expect(pending.addenda).toHaveLength(2)
  expect(pending.addenda.every((notice: { acknowledgedAt: string | null; acknowledgeInPerson: boolean }) => notice.acknowledgedAt === null && !notice.acknowledgeInPerson)).toBe(true)
  expect((await request.post(`/api/v1/addenda/${notices[0].addendumId}/in-person-acknowledgement`, {
    headers: agent, data: { stakeholderId: detail.landlordId },
  })).status()).toBe(404)

  await signIn(page, landlordEmail)
  await page.goto(`/updates/${notices[0].addendumId}`)
  await expect(page.getByRole('heading', { name: 'Move-in condition reported', exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Small chip on the corner at handover.' })).toBeVisible()
  await page.getByRole('button', { name: 'Dispute', exact: true }).click()
  await page.getByLabel('Why do you disagree?').fill('The handover photograph does not show that chip.')
  await page.getByRole('button', { name: 'Record dispute' }).click()
  await expect(page.getByText('Disputed by Move-in Landlord', { exact: false })).toBeVisible()
  await expect(page.getByText('This claim is recorded separately and is not part of the agreed check-in.')).toBeVisible()

  await page.goto(`/updates/${notices[1].addendumId}`)
  await page.getByRole('button', { name: 'I agree this was present at move-in' }).click()
  await expect(page.getByText('Agreed by the landlord. This condition is part of the agreed check-in.')).toBeVisible()
  const checkout = await request.post(`/api/v1/inspections/${inspectionId}/checkout`, { headers: agent })
  expect(checkout.status()).toBe(200)
  const checkoutId = (await checkout.json()).id as string
  const opened = await (await request.get(`/api/v1/inspections/${checkoutId}`, { headers: agent })).json()
  const kitchen = await (await request.get(`/api/v1/inspections/${checkoutId}/rooms/${opened.rooms[0].id}`, { headers: agent })).json()
  const hob = (kitchen.items as { id: string; name: string; condition: string; notes: string }[]).find((item) => item.name === 'Hob')!
  expect(hob.condition).toBe('DAMAGED')
  expect(hob.notes).toContain('The right hob ring was already cracked.')
  expect(hob.notes).not.toContain('Small chip on the corner')
  expect(kitchen.checkIn.photos.some((photo: { caption: string | null }) => photo.caption?.includes('The right hob ring'))).toBe(true)
  expect(kitchen.checkIn.photos.some((photo: { caption: string | null }) => photo.caption?.includes('Small chip'))).toBe(false)

  // The finding comparison must use the agreed frozen condition, rather than the
  // original GOOD item whose physical identity the notice deliberately preserves.
  const copiedRoom = `/api/v1/inspections/${checkoutId}/rooms/${opened.rooms[0].id}`
  expect((await request.post(`${copiedRoom}/finish`, { headers: agent })).status()).toBe(200)
  expect((await request.post(`${copiedRoom}/review`, { headers: agent })).status()).toBe(200)
  expect((await request.post(`/api/v1/inspections/${checkoutId}/review`, { headers: agent })).status()).toBe(200)
  for (const stakeholderId of [detail.tenantId, detail.landlordId]) {
    expect((await request.post(`/api/v1/inspections/${checkoutId}/signatures`, {
      headers: agent, data: { stakeholderId, imageData: png },
    })).status()).toBe(200)
  }
  expect((await request.post(`/api/v1/inspections/${checkoutId}/findings`, {
    headers: agent,
    data: { itemId: hob.id, baselineItemId: null, changeType: 'UNCHANGED', verdict: 'FAIR_WEAR', rationale: 'Same cracked ring recorded and agreed at move-in.', estimatedCost: null },
  })).status()).toBe(200)
  const assessed = await (await request.get(`/api/v1/inspections/${checkoutId}`, { headers: agent })).json()
  expect(assessed.findings[0].baselineCondition).toBe('DAMAGED')
  await page.goto(`/handover/${inspectionId}`)
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  // Sign-out waits for Supabase before replacing the document. Starting signIn's
  // /login navigation before that replacement finishes aborts one of the two loads.
  await expect(page).toHaveURL(/\/login\?/)
  await expect(page.getByRole('heading', { name: 'Welcome to Kivilo', exact: true })).toBeVisible()
  await signIn(page, agentEmail)
  await page.goto(`/inspections/${checkoutId}`)
  await expect(page.getByText('DAMAGED at check-in · DAMAGED at check-out', { exact: true })).toBeVisible()
})
