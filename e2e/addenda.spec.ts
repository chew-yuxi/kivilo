import { test, expect, devices, type APIRequestContext } from '@playwright/test'
import { accessTokenFor, freshEmail, latestCodeFor, signIn, FIXTURES } from './helpers'

/// A countersigned check-in, made through the API because the check-in itself is
/// covered elsewhere, then updated on the web: the agent records a replaced hob with a
/// photo and publishes it, the landlord follows the emailed link and acknowledges in the
/// browser, the tenant acknowledges from the app's endpoint, and the check-out starts
/// from the updated inventory.
async function countersignedCheckIn(request: APIRequestContext, agentEmail: string, landlordEmail: string, tenantEmail: string) {
  const headers = { Authorization: `Bearer ${await accessTokenFor(agentEmail)}` }
  const created = await request.post('/api/v1/inspections', {
    headers,
    data: {
      line1: '27 Jalan Merah Saga',
      unit: '#02-05',
      postalCode: '278106',
      propertyType: 'PRIVATE_NON_LANDED',
      fullyFurnished: true,
      landlordName: 'Tan Wei Ming',
      landlordEmail,
      tenantName: 'Priya Raman',
      tenantEmail,
      startDate: '2026-09-01',
      endDate: '2028-08-31',
      monthlyRent: '7200',
      deposit: '14400',
    },
  })
  expect(created.status()).toBe(200)
  const id = (await created.json()).id as string
  const roomId = (await (await request.post(`/api/v1/inspections/${id}/rooms`, { headers, data: { name: 'Kitchen' } })).json()).id
  const upload = await (await request.post(`/api/v1/inspections/${id}/rooms/${roomId}/upload-url`, {
    headers, data: { filename: 'label.png' },
  })).json()
  expect((await request.put(upload.signedUrl, { headers: { 'content-type': 'image/png' }, data: FIXTURES.photo.buffer })).ok()).toBeTruthy()
  expect((await request.post(`/api/v1/inspections/${id}/rooms/${roomId}/captures`, {
    headers,
    data: { kind: 'PHOTO', storagePath: upload.storagePath, mimeType: 'image/png', sizeBytes: FIXTURES.photo.buffer.length },
  })).status()).toBe(200)
  expect((await request.post(`/api/v1/inspections/${id}/rooms/${roomId}/finish`, { headers })).status()).toBe(200)
  expect((await request.post(`/api/v1/inspections/${id}/rooms/${roomId}/review`, { headers })).status()).toBe(200)
  expect((await request.post(`/api/v1/inspections/${id}/review`, { headers })).status()).toBe(200)
  const { landlordId, tenantId } = await (await request.get(`/api/v1/inspections/${id}`, { headers })).json()
  const png = 'data:image/png;base64,iVBORw0KGgo='
  for (const stakeholderId of [landlordId, tenantId]) {
    expect((await request.post(`/api/v1/inspections/${id}/signatures`, { headers, data: { stakeholderId, imageData: png } })).status()).toBe(200)
  }
  return { id, headers }
}

test('an update to a signed check-in is published on the web and acknowledged by both parties', async ({ page, browser, request }) => {
  const agentEmail = freshEmail('addenda-agent')
  const landlordEmail = freshEmail('addenda-landlord')
  const tenantEmail = freshEmail('addenda-tenant')
  const { id, headers } = await countersignedCheckIn(request, agentEmail, landlordEmail, tenantEmail)

  // The agent writes the update on the web.
  await signIn(page, agentEmail)
  await page.goto(`/inspections/${id}`)
  await page.getByRole('button', { name: 'Start an update' }).click()
  await page.getByLabel('Title').fill('New induction hob')
  await page.getByLabel('Reason').fill('The old hob failed and the landlord replaced it.')
  await page.getByRole('button', { name: 'Save details' }).click()

  const change = page.getByRole('form', { name: 'New change' })
  await change.getByLabel('Change').selectOption('REPLACED')
  await change.getByLabel('Item it changes').selectOption({ label: 'Kitchen · Hob' })
  await change.getByLabel('New item').fill('Induction hob')
  await change.getByLabel('Make, model and serial').fill('Bosch PUE611 SN 9921')
  await change.getByLabel('Notes').fill('Installed by the landlord')
  await change.getByRole('button', { name: 'Add change' }).click()

  const saved = page.getByRole('form', { name: 'Change: Replaced Induction hob' })
  await expect(saved).toBeVisible()
  // A photo the landlord sent, straight from this browser to storage.
  await page.getByLabel('Photos for Induction hob').setInputFiles(FIXTURES.photo)
  await expect(page.getByRole('img', { name: 'Update photo' })).toBeVisible()

  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: 'Publish update' }).click()
  const published = page.getByRole('link', { name: 'Update 1: New induction hob' })
  await expect(published).toBeVisible()
  await expect(page.getByText('Landlord pending · Tenant pending')).toBeVisible()
  const updatePath = (await published.getAttribute('href'))!
  expect(updatePath).toMatch(/^\/updates\/c[a-z0-9]{20,}$/)
  const addendumId = updatePath.split('/').pop()!

  // The landlord follows the emailed link signed out, signs in, and lands back on it.
  const landlord = await browser.newContext({ ...devices['Pixel 7'] })
  const landlordPage = await landlord.newPage()
  await landlordPage.goto(updatePath)
  await expect(landlordPage).toHaveURL(/\/login\?next=/)
  await landlordPage.getByLabel('Email').fill(landlordEmail)
  await landlordPage.getByRole('button', { name: 'Email me a code' }).click()
  await expect.poll(() => latestCodeFor(landlordEmail), { timeout: 20_000 }).not.toBeNull()
  await landlordPage.getByLabel('Six digit code').fill((await latestCodeFor(landlordEmail))!)
  await landlordPage.getByRole('button', { name: 'Sign in' }).click()
  await expect(landlordPage.getByRole('heading', { name: 'Update to the check-in report' })).toBeVisible()
  expect(new URL(landlordPage.url()).pathname).toBe(updatePath)
  await expect(landlordPage.getByText('Updated', { exact: false }).first()).toBeVisible()
  await expect(landlordPage.getByText('Bosch PUE611 SN 9921')).toBeVisible()
  await expect(landlordPage.getByText('Pending acknowledgement')).toHaveCount(2)
  await landlordPage.getByRole('button', { name: 'I acknowledge this update' }).click()
  await expect(landlordPage.getByText('You have acknowledged this update.')).toBeVisible()
  await expect(landlordPage.getByText('Pending acknowledgement')).toHaveCount(1)
  await landlord.close()

  // The tenant acknowledges from the app. The agent is not a party and cannot.
  expect((await request.post(`/api/v1/addenda/${addendumId}/acknowledgement`, { headers })).status()).toBe(404)
  const tenant = { Authorization: `Bearer ${await accessTokenFor(tenantEmail)}` }
  const before = await (await request.get(`/api/v1/inspections/${id}/report`, { headers: tenant })).json()
  expect(before.addenda).toMatchObject([{ number: 1, title: 'New induction hob', acknowledgeAs: 'TENANT', acknowledgedAt: null }])
  expect(before.addenda[0].entries[0].photos[0].url).toContain('token=')
  // A notification names only the update; the app finds its report from it.
  expect(await (await request.get(`/api/v1/addenda/${addendumId}`, { headers: tenant })).json()).toEqual({ inspectionId: id })
  expect((await request.post(`/api/v1/addenda/${addendumId}/acknowledgement`, { headers: tenant })).status()).toBe(200)
  const after = await (await request.get(`/api/v1/inspections/${id}/report`, { headers: tenant })).json()
  expect(after.addenda[0].acknowledgedAt).not.toBeNull()
  expect(after.addenda[0].acknowledgeAs).toBeNull()

  // The shared report shows it after the signatures, acknowledged by both.
  const { token } = await (await request.post(`/api/v1/inspections/${id}/share`, { headers })).json()
  await page.goto(`/reports/${token}`)
  await expect(page.getByRole('heading', { name: 'Updates since signing' })).toBeVisible()
  await expect(page.getByText('Replaced: Hob with Induction hob')).toBeVisible()
  await expect(page.getByText(/^Acknowledged /)).toHaveCount(2)

  // And the check-out starts from the updated kitchen.
  const checkOut = await request.post(`/api/v1/inspections/${id}/checkout`, { headers })
  const checkOutId = (await checkOut.json()).id as string
  const opened = await (await request.get(`/api/v1/inspections/${checkOutId}`, { headers })).json()
  const kitchen = await (await request.get(`/api/v1/inspections/${checkOutId}/rooms/${opened.rooms[0].id}`, { headers })).json()
  const names = (kitchen.items as { name: string; identifier: string | null }[]).map((item) => item.name)
  expect(names).toContain('Induction hob')
  expect(names).not.toContain('Hob')
})
