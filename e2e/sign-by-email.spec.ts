import { test, expect } from '@playwright/test'
import { accessTokenFor, freshEmail, latestCodeFor, scribble, signIn } from './helpers'

/// The landlord or tenant who was not at the handover signs from the link in their
/// email. The link is not a credential: it lands on the login page with their address
/// filled in, they sign in with the mailed code as the person on the deal, and only then
/// see the report and sign it. Anyone else signed in sees the same page as for a report
/// that does not exist.
test('a party signs from the emailed link, as themselves and nobody else', async ({ browser, request }) => {
  const agent = { Authorization: `Bearer ${await accessTokenFor(freshEmail('sign-agent'))}` }
  const landlordEmail = freshEmail('sign-landlord')
  const tenantEmail = freshEmail('sign-tenant')

  // A deal with one empty room, reviewed and sent, through the API the app uses.
  const created = await request.post('/api/v1/inspections', {
    headers: agent,
    data: {
      line1: '8 Shenton Way', postalCode: '068811', propertyType: 'PRIVATE_NON_LANDED', fullyFurnished: false,
      landlordName: 'Goh Siew Lan', landlordEmail, tenantName: 'Marcus Lee', tenantEmail,
      startDate: '2026-10-01', endDate: '2028-09-30', monthlyRent: '3800', deposit: '7600',
    },
  })
  const id = (await created.json()).id as string
  const room = await request.post(`/api/v1/inspections/${id}/rooms`, { headers: agent, data: { name: 'Store room' } })
  const roomPath = `/api/v1/inspections/${id}/rooms/${(await room.json()).id}`
  expect((await request.post(`${roomPath}/finish`, { headers: agent })).status()).toBe(200)
  expect((await request.post(`${roomPath}/review`, { headers: agent, data: { nothingToRecord: true } })).status()).toBe(200)
  expect((await request.post(`/api/v1/inspections/${id}/review`, { headers: agent })).status()).toBe(200)

  // Send queued the signing email to both; asking again while it waits adds nothing.
  const detail = await (await request.get(`/api/v1/inspections/${id}`, { headers: agent })).json()
  expect(detail.signingParties).toMatchObject([
    { role: 'LANDLORD', email: landlordEmail, signedAt: null, signingEmail: { state: 'QUEUED' } },
    { role: 'TENANT', email: tenantEmail, signedAt: null, signingEmail: { state: 'QUEUED' } },
  ])
  const resend = await request.post(`/api/v1/inspections/${id}/signing-email`, {
    headers: agent,
    data: { stakeholderId: detail.landlordId },
  })
  expect(resend.status()).toBe(200)
  const notAParty = await request.post(`/api/v1/inspections/${id}/signing-email`, {
    headers: agent,
    data: { stakeholderId: 'cmnope00000000000000000' },
  })
  expect(notAParty.status()).toBe(404)

  // The tenant opens the link signed out and is asked to sign in, address filled in.
  const tenantContext = await browser.newContext()
  const tenant = await tenantContext.newPage()
  await tenant.goto(`/sign/${id}?email=${encodeURIComponent(tenantEmail)}`)
  await expect(tenant).toHaveURL(/\/login\?/)
  await expect(tenant.getByLabel('Email')).toHaveValue(tenantEmail)
  await tenant.getByRole('button', { name: 'Email me a code' }).click()
  await expect.poll(() => latestCodeFor(tenantEmail), { timeout: 20_000 }).not.toBeNull()
  await tenant.getByLabel('Six digit code').fill((await latestCodeFor(tenantEmail))!)
  await tenant.getByRole('button', { name: 'Sign in' }).click()

  // Back on the signing page, as the tenant named on the deal: the frozen report, the
  // fingerprint they are about to sign, and a pad, with none of the inspector's chrome.
  await expect(tenant).toHaveURL(new RegExp(`/sign/${id}$`))
  await expect(tenant.getByText('Awaiting your signature.')).toBeVisible()
  await expect(tenant.getByText('Store room')).toBeVisible()
  await expect(tenant.getByText('Nothing recorded in this room.')).toBeVisible()
  const fingerprint = await tenant.locator('section p .font-mono').textContent()
  expect(fingerprint).toMatch(/^[0-9A-F]{4}( [0-9A-F]{4}){3}$/)
  await expect(tenant.getByRole('button', { name: 'Install app' })).toHaveCount(0)
  await tenant.waitForLoadState('networkidle')
  await scribble(tenant, tenant.locator('canvas'))
  await tenant.getByRole('button', { name: 'Sign', exact: true }).click()
  await expect(tenant.getByText('You signed')).toBeVisible()
  await expect(tenant.getByText('Waiting for Goh Siew Lan to sign')).toBeVisible()
  await expect(tenant.getByText(`Content fingerprint ${fingerprint}`)).toBeVisible()

  // Someone else with a perfectly good session gets what a missing id gets, plus a way
  // to switch to the address the email went to.
  const strangerContext = await browser.newContext()
  const stranger = await strangerContext.newPage()
  await signIn(stranger, freshEmail('sign-stranger'))
  await stranger.goto(`/sign/${id}?email=${encodeURIComponent(landlordEmail)}`)
  await expect(stranger.getByRole('heading', { name: 'Nothing to sign here' })).toBeVisible()
  const refused = await stranger.locator('body').innerText()
  await stranger.goto(`/sign/cmnope00000000000000000?email=${encodeURIComponent(landlordEmail)}`)
  await expect(stranger.getByRole('heading', { name: 'Nothing to sign here' })).toBeVisible()
  expect(await stranger.locator('body').innerText()).toBe(refused)
  await stranger.getByRole('button', { name: 'Sign out' }).click()
  await expect(stranger).toHaveURL(/\/login\?/)
  await expect(stranger.getByLabel('Email')).toHaveValue(landlordEmail)
  await strangerContext.close()

  // The landlord signs from the app instead. Both signatures carry the same fingerprint,
  // and the tenant's page now says the report is complete.
  const landlord = { Authorization: `Bearer ${await accessTokenFor(landlordEmail)}` }
  const signed = await request.post(`/api/v1/inspections/${id}/report/signature`, {
    headers: landlord,
    data: { imageData: 'data:image/png;base64,iVBORw0KGgo=' },
  })
  expect(signed.status()).toBe(200)
  const report = await (await request.get(`/api/v1/inspections/${id}/report`, { headers: landlord })).json()
  expect(report.status).toBe('COMPLETED')
  expect(report.signatures).toHaveLength(2)
  expect(report.signatures[0].contentHash).toMatch(/^[0-9a-f]{64}$/)
  expect(report.signatures[1].contentHash).toBe(report.signatures[0].contentHash)
  expect(report.signatures[0].contentHash.slice(0, 16).toUpperCase()).toBe(fingerprint!.replaceAll(' ', ''))

  await tenant.reload()
  await expect(tenant.getByText('Completed.')).toBeVisible()
  await tenantContext.close()
})
