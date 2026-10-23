import { test, expect } from '@playwright/test'
import { accessTokenFor, freshEmail, latestCodeFor, signIn, FIXTURES } from './helpers'

test('private payment proof survives an interrupted upload and stays outside the signed report', async ({ page, browser, request, baseURL }) => {
  test.setTimeout(150_000)
  const agentEmail = freshEmail('documents-agent')
  const tenantEmail = freshEmail('documents-tenant')
  const landlordEmail = freshEmail('documents-landlord')
  await signIn(page, agentEmail)
  const agent = { Authorization: `Bearer ${await accessTokenFor(agentEmail)}` }
  const created = await request.post('/api/v1/inspections', {
    headers: agent,
    data: {
      line1: '36 Receipt Lane', unit: '#08-03', postalCode: '238801',
      propertyType: 'PRIVATE_NON_LANDED', landlordName: 'Maya Lim', landlordEmail,
      tenantName: 'Ravi Tan', tenantEmail, startDate: '2026-09-01', endDate: '2028-08-31',
      monthlyRent: '3200', deposit: '6400',
    },
  })
  expect(created.status()).toBe(200)
  const inspectionId = (await created.json()).id as string
  const inspection = await (await request.get(`/api/v1/inspections/${inspectionId}`, { headers: agent })).json()
  const tenancyId = inspection.tenancyRecordId as string
  const documentsPath = `/tenancies/${tenancyId}/documents`
  const documentsApi = `/api/v1/tenancies/${tenancyId}/documents`

  await page.goto(`/inspections/${inspectionId}`)
  await page.getByRole('link', { name: /^Documents/ }).click()
  await expect(page.getByRole('heading', { name: 'Documents', exact: true })).toBeVisible()
  await expect(page.getByLabel('Upload tenancy agreement')).toBeVisible()
  await page.getByTestId('other-documents').locator('summary').click()
  await page.getByLabel('Document to request').fill('Payment proof')
  await page.getByRole('button', { name: 'Request document', exact: true }).click()
  const requested = page.getByRole('region', { name: 'Payment proof', exact: true })
  await expect(requested).toContainText('Requested by')
  await expect(requested.getByLabel('Upload a file')).toHaveCount(0)
  const workspace = await (await request.get(documentsApi, { headers: agent })).json()
  expect(workspace.requests).toHaveLength(1)
  const documentRequestId = workspace.requests[0].id as string
  // A request link must select its own upload even when a newer request is first.
  expect((await request.post(documentsApi, {
    headers: agent, data: { clientId: crypto.randomUUID(), title: 'Rent receipt' },
  })).status()).toBe(200)

  // An unanswered document request never gates Send or either signature.
  const roomResponse = await request.post(`/api/v1/inspections/${inspectionId}/rooms`, {
    headers: agent, data: { name: 'Kitchen' },
  })
  expect(roomResponse.status()).toBe(200)
  const roomId = (await roomResponse.json()).id as string
  const roomApi = `/api/v1/inspections/${inspectionId}/rooms/${roomId}`
  expect((await request.post(`${roomApi}/finish`, { headers: agent })).status()).toBe(200)
  expect((await request.post(`${roomApi}/review`, { headers: agent })).status()).toBe(200)
  expect((await request.post(`/api/v1/inspections/${inspectionId}/review`, { headers: agent })).status()).toBe(200)
  for (const stakeholderId of [inspection.tenantId, inspection.landlordId]) {
    expect((await request.post(`/api/v1/inspections/${inspectionId}/signatures`, {
      headers: agent, data: { stakeholderId, imageData: 'data:image/png;base64,iVBORw0KGgo=' },
    })).status()).toBe(200)
  }
  const before = await (await request.get(`/api/v1/inspections/${inspectionId}/report`, { headers: agent })).json()
  expect(before.status).toBe('COMPLETED')

  const tenantContext = await browser.newContext({ baseURL, viewport: { width: 393, height: 851 } })
  try {
    const tenantPage = await tenantContext.newPage()
    const requestPath = `${documentsPath}?requestId=${documentRequestId}`
    await tenantPage.goto(requestPath)
    await expect(tenantPage).toHaveURL(/\/login\?/)
    expect(new URL(tenantPage.url()).searchParams.get('next')).toBe(requestPath)
    await tenantPage.getByLabel('Email', { exact: true }).fill(tenantEmail)
    await tenantPage.getByRole('button', { name: 'Email me a code', exact: true }).click()
    await expect(tenantPage.getByLabel('Six digit code')).toBeVisible()
    await expect.poll(() => latestCodeFor(tenantEmail), { timeout: 20_000 }).not.toBeNull()
    await tenantPage.getByLabel('Six digit code').fill((await latestCodeFor(tenantEmail))!)
    await tenantPage.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(tenantPage).toHaveURL(requestPath)
    await expect(tenantPage.getByTestId('tenancy-context')).toContainText('Ravi Tan')
    await expect(tenantPage.getByTestId('tenancy-context')).toContainText('2026')
    await expect(tenantPage.getByTestId('tenancy-context')).toContainText('2028')
    await expect(tenantPage.getByRole('button', { name: 'Request document' })).toHaveCount(0)
    await expect(tenantPage.getByTestId('other-documents')).toHaveAttribute('open', '')
    const tenantRequest = tenantPage.getByRole('region', { name: 'Payment proof', exact: true })
    const tenantUpload = tenantRequest.getByLabel('Upload a file', { exact: true })
    await expect(tenantUpload).toBeFocused()
    await expect(tenantUpload).toBeInViewport()
    await expect(tenantPage.getByRole('region', { name: 'Tenancy agreement', exact: true })).toContainText('confirmed by your landlord or agent')

    // Storage accepts the original PDF, but the confirmation fails. The durable
    // copy must survive a page reload and finish without uploading a second file.
    const confirmPattern = `**${documentsApi}/${documentRequestId}/files`
    await tenantPage.route(confirmPattern, (route) => route.fulfill({
      status: 503, contentType: 'application/json', body: '{"error":"temporarily_unavailable"}',
    }))
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n')
    await tenantUpload.setInputFiles({
      name: 'payment-proof.pdf', mimeType: 'application/pdf', buffer: pdf,
    })
    const savedFiles = tenantPage.getByRole('list', { name: 'Files saved on this device' })
    await expect(savedFiles).toContainText('payment-proof.pdf')
    await expect(savedFiles).toContainText('Could not finish this request')
    expect(await tenantPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await tenantPage.reload()
    await expect(tenantPage.getByTestId('other-documents')).toHaveAttribute('open', '')
    await expect(savedFiles).toContainText('payment-proof.pdf')
    await expect(savedFiles).toContainText('Could not finish this request')
    await tenantPage.unroute(confirmPattern)
    // Mount already starts a retry. Signal restored connectivity as well so this
    // remains deterministic if that pass finishes between unroute and the action.
    // Clicking Retry would race its removal when the in-flight pass succeeds.
    await tenantPage.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect(tenantPage.getByRole('button', { name: 'Download payment-proof.pdf', exact: true })).toBeVisible()
    await expect(savedFiles).toHaveCount(0)
    await expect(tenantPage.getByText(/Submitted by Ravi Tan/)).toBeVisible()
    await tenantPage.screenshot({ path: 'build/supporting-documents-tenant.png', fullPage: true })

    const landlord = { Authorization: `Bearer ${await accessTokenFor(landlordEmail)}` }
    const shared = await (await request.get(documentsApi, { headers: landlord })).json()
    expect(shared.canUpload).toBe(false)
    const sharedRequest = shared.requests.find((entry: { id: string }) => entry.id === documentRequestId)
    expect(sharedRequest.files).toHaveLength(1)
    const fileId = sharedRequest.files[0].id as string
    const downloadApi = `${documentsApi}/${documentRequestId}/files/${fileId}`
    const download = await request.get(downloadApi, { headers: landlord })
    expect(download.status()).toBe(200)
    const { url } = await download.json()
    expect((await request.get(url)).ok()).toBe(true)
    expect(await (await request.get(url)).body()).toEqual(pdf)
    const downloadEvent = tenantPage.waitForEvent('download')
    await tenantPage.getByRole('button', { name: 'Download payment-proof.pdf', exact: true }).click()
    expect((await downloadEvent).suggestedFilename()).toBe('payment-proof.pdf')
    await tenantPage.goto(`/sign/${inspectionId}`)
    await tenantPage.getByRole('link', { name: 'Documents', exact: true }).click()
    await expect(tenantPage).toHaveURL(documentsPath)
    await expect(tenantPage.getByTestId('other-documents')).not.toHaveAttribute('open')

    const after = await (await request.get(`/api/v1/inspections/${inspectionId}/report`, { headers: agent })).json()
    expect(after.signatures).toEqual(before.signatures)
    expect(JSON.stringify(after)).not.toContain('payment-proof.pdf')
    const share = await (await request.post(`/api/v1/inspections/${inspectionId}/share`, { headers: agent })).json()
    const publicReport = await request.get(share.shareUrl)
    expect(publicReport.status()).toBe(200)
    expect(await publicReport.text()).not.toContain('payment-proof.pdf')
    expect(await publicReport.text()).not.toContain('Supporting documents')

    const outsider = { Authorization: `Bearer ${await accessTokenFor(freshEmail('documents-outsider'))}` }
    const refused = await request.get(downloadApi, { headers: outsider })
    const missing = await request.get(`${documentsApi}/${documentRequestId}/files/missing-file`, { headers: outsider })
    expect(refused.status()).toBe(404)
    expect(await refused.json()).toEqual(await missing.json())
    expect((await request.get(documentsApi)).status()).toBe(401)
    expect((await request.get(documentsApi, { headers: { ...landlord, 'x-kivilo-owner': 'another-account' } })).status()).toBe(401)
  } finally {
    await tenantContext.close()
  }
})

test('an agreement uploads directly, its clause needs human confirmation, and a newer scan keeps the earlier setting until reviewed', async ({ page, browser, request, baseURL }) => {
  test.setTimeout(150_000)
  const agentEmail = freshEmail('agreement-agent')
  const tenantEmail = freshEmail('agreement-tenant')
  await signIn(page, agentEmail)
  const agent = { Authorization: `Bearer ${await accessTokenFor(agentEmail)}` }
  const created = await request.post('/api/v1/inspections', {
    headers: agent,
    data: {
      line1: '18 Agreement Grove', postalCode: '238801', propertyType: 'PRIVATE_NON_LANDED',
      landlordName: 'Maya Lim', tenantName: 'Ravi Tan', tenantEmail,
      startDate: '2026-09-01', endDate: '2028-08-31', monthlyRent: '3200', deposit: '6400',
    },
  })
  expect(created.status()).toBe(200)
  const inspectionId = (await created.json()).id as string
  const inspection = await (await request.get(`/api/v1/inspections/${inspectionId}`, { headers: agent })).json()
  const tenancyId = inspection.tenancyRecordId as string
  const documentsPath = `/tenancies/${tenancyId}/documents`
  const documentsApi = `/api/v1/tenancies/${tenancyId}/documents`
  const readWorkspace = async () => (await request.get(documentsApi, { headers: agent })).json()

  await page.goto(documentsPath)
  const agreement = page.getByRole('region', { name: 'Tenancy agreement', exact: true })
  await expect(page.getByTestId('other-documents')).not.toHaveAttribute('open')
  await expect(agreement.getByLabel('Upload tenancy agreement', { exact: true })).toBeVisible()
  const clause = 'The Tenant shall pay the first S$150 of each minor repair. The Landlord shall pay the balance.'
  // A small real text PDF: extraction and the source-page selection use the same
  // bytes uploaded through the actual signed storage path.
  const stream = `BT /F1 11 Tf 50 740 Td (${clause}) Tj ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 800 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ]
  let pdfText = '%PDF-1.4\n'
  const offsets = [0]
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdfText))
    pdfText += `${index + 1} 0 obj\n${object}\nendobj\n`
  }
  const xref = Buffer.byteLength(pdfText)
  pdfText += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${offset.toString().padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  await agreement.getByLabel('Upload tenancy agreement', { exact: true }).setInputFiles({
    name: 'tenancy-agreement.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdfText),
  })
  await expect(agreement.getByRole('button', { name: 'Download tenancy-agreement.pdf' })).toBeVisible()
  let workspace = await readWorkspace()
  expect(workspace.requests).toEqual([])
  expect(workspace.agreement.files).toHaveLength(1)
  expect(workspace.currentMinorRepairCap).toBeNull()
  expect(workspace.agreement.terms).toBeNull()

  await agreement.getByRole('button', { name: 'Review maintenance terms', exact: true }).click()
  await expect(agreement.getByText('Possible maintenance clauses', { exact: true })).toBeVisible()
  await agreement.getByRole('button', { name: 'Use this clause', exact: true }).first().click()
  await expect(agreement.getByLabel('Page in agreement', { exact: true })).toHaveValue('1')
  await expect(agreement.getByRole('textbox', { name: 'Exact clause from agreement', exact: true })).toHaveValue(clause)
  await expect(agreement.getByLabel("Tenant's amount per minor repair (SGD)", { exact: true })).toHaveValue('150.00')
  expect((await readWorkspace()).currentMinorRepairCap).toBeNull()
  await agreement.getByRole('textbox', { name: 'Exceptions or notes (optional)', exact: true }).fill('Read alongside the fair wear and tear clause.')
  await agreement.getByRole('button', { name: 'Confirm maintenance terms', exact: true }).click()
  await expect(agreement.getByText('Confirmed', { exact: true })).toBeVisible()
  workspace = await readWorkspace()
  expect(workspace.currentMinorRepairCap).toBe('150')
  expect(workspace.agreement.terms).toMatchObject({ page: 1, quote: clause, rule: 'FIRST_AMOUNT', tenantCap: '150.00' })
  expect(workspace.agreement.termsMatchCurrentFile).toBe(true)
  await page.screenshot({ path: 'build/tenancy-agreement-documents.png', fullPage: true })

  const tenantContext = await browser.newContext({ baseURL, viewport: { width: 393, height: 851 } })
  try {
    const tenantPage = await tenantContext.newPage()
    await signIn(tenantPage, tenantEmail)
    await tenantPage.goto(documentsPath)
    const tenantAgreement = tenantPage.getByRole('region', { name: 'Tenancy agreement', exact: true })
    await expect(tenantAgreement.getByRole('button', { name: /Review.*terms/ })).toHaveCount(0)
    await tenantAgreement.getByLabel('Upload a newer agreement', { exact: true }).setInputFiles({
      ...FIXTURES.photo, name: 'new-agreement-scan.png',
    })
    await expect(tenantAgreement.getByRole('button', { name: 'Download new-agreement-scan.png' })).toBeVisible()
    await expect(tenantAgreement.getByText(/The previous confirmed terms stay in use/)).toBeVisible()
    workspace = await readWorkspace()
    expect(workspace.currentMinorRepairCap).toBe('150')
    expect(workspace.agreement.termsMatchCurrentFile).toBe(false)

    await page.reload()
    await agreement.getByRole('button', { name: 'Review maintenance terms', exact: true }).click()
    await expect(agreement.getByText(/This file has no readable text/)).toBeVisible()
    await agreement.getByLabel('Page in agreement', { exact: true }).fill('2')
    await agreement.getByRole('textbox', { name: 'Exact clause from agreement', exact: true }).fill('The landlord arranges repairs, except damage caused by the tenant.')
    await agreement.getByLabel('Another arrangement or exceptions', { exact: true }).check()
    await agreement.getByRole('textbox', { name: 'Describe the arrangement and exceptions', exact: true }).fill('Tenant-caused damage must be considered separately; no fixed first-amount contribution.')
    await agreement.getByRole('button', { name: 'Confirm maintenance terms', exact: true }).click()
    await expect(agreement.getByText('Confirmed', { exact: true })).toBeVisible()
    workspace = await readWorkspace()
    expect(workspace.currentMinorRepairCap).toBeNull()
    expect(workspace.agreement.terms).toMatchObject({ page: 2, rule: 'OTHER', tenantCap: null, sourceFileName: 'new-agreement-scan.png' })
    expect(workspace.agreement.termsMatchCurrentFile).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  } finally {
    await tenantContext.close()
  }
})
