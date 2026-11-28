import { expect, test } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { accessTokenFor, freshEmail, signIn, FIXTURES } from './helpers'

const signature = {
  imageData:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAQCAYAAAB+690jAAAAnUlEQVR4nOVUAQqAIAz0Rv//8kWgYtKmMyWhgRBzzfPOHUiGnULCZnG0CgBkCkniU4ZQgPmtZDKTHcR/3jAr3ncDgGlZYEZBmZKxAHN9a4doF+gFVdah9qG6OR6aWvkWSA1oqlHHXhtxPuS1nCafZR83QC2KGRv1elMC5fEvGTFAxv2eg7xmKqPvgItcWyyp6GBiVuQp82odVgPaJU7UAIEZC8LLpgAAAABJRU5ErkJggg==',
}

test('first visit at move-out saves evidence before tenancy setup and yields the deposit statement', async ({
  page,
  request,
}) => {
  test.setTimeout(150000)
  const email = freshEmail('walkthrough-agent')
  await signIn(page, email)
  await page.goto('/properties')
  await page.getByRole('link', { name: 'Start check-out' }).first().click()
  await page.getByLabel('Property address and unit').fill('18 Palm Walk #06-02')
  await page.getByRole('button', { name: 'Start walkthrough' }).click()
  await page.getByRole('button', { name: 'Record an issue' }).click()
  await page.getByLabel('What did you find?').fill('Living room · missing air-con remote')
  await page.getByLabel('Type', { exact: true }).selectOption('MISSING')
  await page.getByLabel('Evidence note').fill('Listed in the printed inventory.')
  await page.getByLabel('Add photos').setInputFiles(FIXTURES.photo)
  await expect(page.getByText('1 photo saved on this device')).toBeVisible()
  await page.getByRole('button', { name: 'Save issue' }).click()
  await page.reload()
  await expect(page.getByText('Living room · missing air-con remote', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Review visit' }).click()
  await page.getByLabel('Postal code').fill('018987')
  await page.getByLabel('Landlord name').fill('Test Landlord')
  await page.getByLabel('Tenant name').fill('Test Tenant')
  await page.getByLabel('Tenancy start').fill('2024-11-28')
  await page.getByLabel('Tenancy end').fill('2026-11-28')
  await page.getByLabel('Deposit').fill('2000')
  await page.getByRole('button', { name: 'Create check-out report' }).click()
  await expect(page).toHaveURL(/\/inspections\/(?!move-out)[^/?]+$/)
  const id = page.url().split('/').pop()!
  const base = '/api/v1/inspections/' + id
  const api = page.request
  const report = await (await api.get(base)).json()
  expect(report.kind).toBe('CHECK_OUT')
  expect(report.rooms).toHaveLength(1)
  expect(report.findings).toHaveLength(0)
  const room = base + '/rooms/' + report.rooms[0].id
  await expect.poll(async () => (await (await api.get(room)).json()).captures.length).toBe(1)
  expect((await (await api.get(room)).json()).items[0].evidenceCaptureIds).toHaveLength(1)
  expect((await api.post(room + '/review')).status()).toBe(200)
  expect((await api.post(base + '/review')).status()).toBe(200)
  const sent = await (await api.get(base)).json()
  expect(sent.findings).toHaveLength(1)
  for (const stakeholderId of [report.landlordId, report.tenantId]) {
    expect((await api.post(base + '/signatures', { data: { stakeholderId, ...signature } })).status()).toBe(
      200,
    )
  }
  expect((await api.post(base + '/findings/publish', { data: {} })).status()).toBe(409)
  expect(
    (
      await api.patch(base + '/findings/' + sent.findings[0].id, {
        data: { verdict: 'TENANT_LIABLE', estimatedCost: '60' },
      })
    ).status(),
  ).toBe(200)
  expect((await api.post(base + '/findings/publish', { data: {} })).status()).toBe(200)
  const signed = await (await api.get(base + '/report')).json()
  expect(signed.standaloneMoveOut).toBe(true)
  expect(signed.assessment.statement).toMatchObject({ deposit: 2000, deductions: 60, toReturn: 1940 })
  const other = { Authorization: `Bearer ${await accessTokenFor(freshEmail('walkthrough-other'))}` }
  expect(await (await request.get('/api/v1/move-out', { headers: other })).json()).toEqual([])
  expect((await request.get(base, { headers: other })).status()).toBe(404)
})

test('an expressly clear visit creates one check-out even when retried', async ({ request }) => {
  const headers = { Authorization: `Bearer ${await accessTokenFor(freshEmail('clear-visit'))}` }
  const data = {
    line1: 'Clear Visit',
    postalCode: '018987',
    landlordName: 'L',
    tenantName: 'T',
    startDate: '2024-01-01',
    endDate: '2026-01-01',
    clientId: randomUUID(),
    deposit: '2000',
    moveOut: { issues: [], noIssues: true },
  }
  expect(
    (
      await request.post('/api/v1/inspections', {
        headers,
        data: { ...data, moveOut: { issues: [], noIssues: false } },
      })
    ).status(),
  ).toBe(400)
  const results = await Promise.all([1, 2].map(() => request.post('/api/v1/inspections', { headers, data })))
  for (const response of results) expect(response.status()).toBe(200)
  const id = (await results[0].json()).id
  expect((await results[1].json()).id).toBe(id)
  const terms = await (await request.get('/api/v1/move-out', { headers })).json()
  expect(terms).toHaveLength(1)
  expect(terms[0]).toMatchObject({ checkOutId: id, baselineId: null })
  const base = '/api/v1/inspections/' + id
  const report = await (await request.get(base, { headers })).json()
  expect(report.findings).toHaveLength(0)
  expect(
    (
      await request.post(base + '/rooms/' + report.rooms[0].id + '/review', {
        headers,
        data: { nothingToRecord: true },
      })
    ).status(),
  ).toBe(200)
  expect((await request.post(base + '/review', { headers })).status()).toBe(200)
  for (const stakeholderId of [report.landlordId, report.tenantId]) {
    expect(
      (await request.post(base + '/signatures', { headers, data: { stakeholderId, ...signature } })).status(),
    ).toBe(200)
  }
  expect(
    (await request.post(base + '/findings/publish', { headers, data: { noFindings: true } })).status(),
  ).toBe(200)
  expect(
    (await (await request.get(base + '/report', { headers })).json()).assessment.statement,
  ).toMatchObject({ deductions: 0, toReturn: 2000 })
})

test('an existing tenancy accepts an expressly standalone visit, and waits for its on-device photo', async ({
  request,
}) => {
  const headers = { Authorization: `Bearer ${await accessTokenFor(freshEmail('visit-existing'))}` }
  const other = { Authorization: `Bearer ${await accessTokenFor(freshEmail('visit-unassigned'))}` }
  const checkIn = await request.post('/api/v1/inspections', {
    headers,
    data: {
      line1: '12 Grove Lane',
      postalCode: '018987',
      landlordName: 'Owner',
      tenantName: 'Tenant',
      startDate: '2024-11-01',
      endDate: '2026-11-01',
      deposit: '2000',
    },
  })
  expect(checkIn.status()).toBe(200)
  const [term] = await (await request.get('/api/v1/move-out', { headers })).json()
  expect(term).toMatchObject({ baselineId: null, checkOutId: null })
  const photo = randomUUID()
  const data = {
    tenancyId: term.id,
    clientId: randomUUID(),
    moveOut: {
      issues: [
        {
          id: randomUUID(),
          label: 'Kitchen tile',
          note: 'Cracked',
          change: 'DAMAGE',
        },
      ],
      noIssues: false,
      photoIds: [photo],
    },
  }
  expect((await request.post('/api/v1/move-out', { headers: other, data })).status()).toBe(404)
  const response = await request.post('/api/v1/move-out', { headers, data })
  expect(response.status()).toBe(200)
  const { id } = await response.json()
  expect((await (await request.post('/api/v1/move-out', { headers, data })).json()).id).toBe(id)
  expect(
    (
      await request.post('/api/v1/move-out', {
        headers,
        data: { ...data, moveOut: { issues: [], noIssues: true } },
      })
    ).status(),
  ).toBe(409)
  const room = '/api/v1/inspections/' + id + '/rooms/walk-' + id
  expect((await request.post(room + '/review', { headers })).status()).toBe(409)
  const cancel = { clientId: photo, inspectionId: id, roomId: 'walk-' + id }
  expect((await request.delete('/api/v1/move-out', { headers: other, data: cancel })).status()).toBe(404)
  expect((await request.delete('/api/v1/move-out', { headers, data: cancel })).status()).toBe(200)
  expect((await request.post(room + '/review', { headers })).status()).toBe(200)
  expect((await (await request.get('/api/v1/move-out', { headers })).json())[0].checkOutId).toBe(id)
})
