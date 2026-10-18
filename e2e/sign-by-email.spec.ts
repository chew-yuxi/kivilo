import { test, expect } from '@playwright/test'
import { accessTokenFor, freshEmail, latestCodeFor, scribble, signIn } from './helpers'
import { db } from '../src/lib/db'

test.afterAll(async () => { await db.$disconnect() })

/// The landlord or tenant who was not at the handover signs from the link in their
/// email. The link is not a credential: it lands on the login page with their address
/// filled in, they sign in with the mailed code as the person on the deal, and only then
/// see the report and sign it. Anyone else signed in sees the same page as for a report
/// that does not exist.
test('a party signs from the emailed link, as themselves and nobody else', async ({ browser, request }) => {
  const agentEmail = freshEmail('sign-agent')
  const agent = { Authorization: `Bearer ${await accessTokenFor(agentEmail)}` }
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
  const tenancyId = detail.tenancyRecordId as string
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

  // The agent confirms the period against this tenancy before the tenant signs. The
  // form and API share the same setter; the suggested 30 days is not fixed policy.
  const agentContext = await browser.newContext()
  const inspector = await agentContext.newPage()
  await signIn(inspector, agentEmail)
  await inspector.goto(`/inspections/${id}`)
  await expect(inspector.getByLabel('Calendar days')).toHaveValue('30')
  await expect(inspector.getByRole('img', { name: 'Scan to open your tenant handover' })).toHaveCount(0)
  expect((await request.get(`/api/v1/inspections/${id}/handover`, { headers: agent })).status()).toBe(404)
  await inspector.getByLabel('Calendar days').fill('21')
  await inspector.getByRole('button', { name: 'Save period' }).click()
  await expect(inspector.getByText('Current deadline: 2026-10-21, end of day in Singapore.')).toBeVisible()
  const beforeSigning = await (await request.get(`/api/v1/tenancies/${tenancyId}`, { headers: agent })).json()
  expect(beforeSigning.moveInDefects).toMatchObject({ windowDays: 21, deadline: '2026-10-21', canEditWindow: true })

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
  const handoverLink = tenant.getByRole('link', { name: 'Your handover and move-in defect deadline' })
  await expect(handoverLink).toHaveAttribute('href', `/handover/${id}`)

  // The first tenant signature makes the handover available immediately, before the
  // landlord signs, and fixes the deadline shown in their email and QR destination.
  const handoverResponse = await request.get(`/api/v1/inspections/${id}/handover`, { headers: agent })
  expect(handoverResponse.status()).toBe(200)
  const handover = await handoverResponse.json()
  expect(handover).toMatchObject({ tenancyId, windowDays: 21, deadline: '2026-10-21' })
  const destination = new URL(handover.url)
  expect(destination.pathname).toBe(`/handover/${id}`)
  expect(destination.search).toBe('')
  expect(handover.modules.length).toBeGreaterThan(20)
  expect(handover.modules.every((row: unknown[]) => row.length === handover.modules.length && row.every((bit) => typeof bit === 'boolean'))).toBe(true)
  await inspector.reload()
  await expect(inspector.getByRole('img', { name: 'Scan to open your tenant handover' })).toBeVisible()
  await expect(inspector.getByRole('link', { name: 'Open tenant handover' })).toHaveAttribute('href', handover.url)
  await expect(inspector.getByLabel('Calendar days')).toHaveCount(0)
  const changeAfterSignature = await request.patch(`/api/v1/tenancies/${tenancyId}`, { headers: agent, data: { defectWindowDays: 30 } })
  expect(changeAfterSignature.status()).toBe(409)
  expect((await (await request.get(`/api/v1/tenancies/${tenancyId}`, { headers: agent })).json()).moveInDefects)
    .toMatchObject({ windowDays: 21, deadline: '2026-10-21', canEditWindow: false })

  // Inspect only this local fixture's transactional outbox: the tenant's own email is
  // queued even though the signed PDF must still wait for the landlord's signature.
  const database = new URL(process.env.DATABASE_URL ?? '')
  expect(database.hostname).toBe('127.0.0.1')
  expect(database.port).toBe('56322')
  const queuedHandover = await db.reportEmail.findMany({
    where: { inspectionId: id, kind: 'TENANT_HANDOVER' },
    include: { recipient: { select: { email: true } }, inspection: { select: { tenancy: { select: { defectWindowDays: true } } } } },
  })
  expect(queuedHandover).toHaveLength(1)
  expect(queuedHandover[0]).toMatchObject({ sentAt: null, attempts: 0, recipient: { email: tenantEmail }, inspection: { tenancy: { defectWindowDays: 21 } } })
  expect(queuedHandover[0].dedupeKey).toBe(`tenant-handover:${id}:${queuedHandover[0].recipientId}`)

  const handoverPage = await tenantContext.newPage()
  await handoverPage.goto(`/handover/${id}`)
  await expect(handoverPage.getByRole('heading', { name: 'Your tenant handover' })).toBeVisible()
  await expect(handoverPage.getByText('Move-in defect deadline: 2026-10-21')).toBeVisible()
  await expect(handoverPage.getByText('The landlord has not signed yet', { exact: false })).toBeVisible()
  await expect(handoverPage.getByText('Nothing recorded in this room.')).toBeVisible()
  await expect(handoverPage.getByRole('button', { name: 'Install app' })).toHaveCount(0)
  // Nothing to download until both have signed.
  await expect(tenant.getByRole('link', { name: 'Download PDF' })).toHaveCount(0)
  expect((await tenant.request.get(`/sign/${id}/pdf`)).status()).toBe(404)

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
  await stranger.goto(`/handover/${id}?email=${encodeURIComponent(tenantEmail)}`)
  await expect(stranger.getByRole('heading', { name: 'No tenant handover here' })).toBeVisible()
  const refusedHandover = await stranger.locator('body').innerText()
  await stranger.goto(`/handover/cmnope00000000000000000?email=${encodeURIComponent(tenantEmail)}`)
  await expect(stranger.getByRole('heading', { name: 'No tenant handover here' })).toBeVisible()
  expect(await stranger.locator('body').innerText()).toBe(refusedHandover)
  await stranger.goto(`/sign/${id}?email=${encodeURIComponent(landlordEmail)}`)
  await stranger.getByRole('button', { name: 'Sign out' }).click()
  await expect(stranger).toHaveURL(/\/login\?/)
  await expect(stranger.getByLabel('Email')).toHaveValue(landlordEmail)
  await strangerContext.close()

  // The landlord signs from the app instead. Both signatures carry the same fingerprint,
  // and the tenant's page now says the report is complete.
  const landlord = { Authorization: `Bearer ${await accessTokenFor(landlordEmail)}` }
  const signed = await request.post(`/api/v1/inspections/${id}/report/signature`, {
    headers: landlord,
    // A whole 1x1 PNG: the signed PDF draws it.
    data: { imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' },
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
  // And the tenant downloads the signed PDF from the page, as themselves.
  const download = tenant.getByRole('link', { name: 'Download PDF' })
  await expect(download).toHaveAttribute('href', `/sign/${id}/pdf`)
  const pdf = await tenant.request.get(`/sign/${id}/pdf`)
  expect(pdf.status()).toBe(200)
  expect(pdf.headers()['content-type']).toBe('application/pdf')
  expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-')
  await agentContext.close()
  await tenantContext.close()
})
