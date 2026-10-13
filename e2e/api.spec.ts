import { test, expect } from '@playwright/test'
import { accessTokenFor, freshEmail, signIn, FIXTURES } from './helpers'

/// The native client speaks to the same backend over HTTP with a bearer token instead of
/// a cookie. That is a second front door onto one authorization boundary, so what this
/// suite pins is the refusals: an inspection belonging to another agent has to be as
/// unreachable here as through a server action, and unreachable in the same words, or the
/// API becomes a way to find out which ids are real.
test('the native API serves its agent, refuses everyone else, and leaks nothing', async ({
  page,
  request,
}) => {
  const email = freshEmail('api-owner')
  await signIn(page, email)

  // A real deal, made the way the product makes one.
  await page.getByRole('link', { name: 'New check-in' }).first().click()
  await page.getByLabel('Address').fill('9 Battery Road')
  await page.getByLabel('Postal code').fill('049910')
  await page.getByLabel('Landlord', { exact: true }).fill('Lim Boon Keng')
  await page.getByLabel('Tenant', { exact: true }).fill('Aisha Rahman')
  await page.getByLabel('Deposit (SGD)').fill('9000')
  await page.getByRole('button', { name: 'Create and start capturing' }).click()
  await expect(page).toHaveURL(/\/inspections\/c[a-z0-9]{20,}$/)
  const id = page.url().split('/').pop()!

  // The same person, arriving with a token instead of a cookie, is the same agent and
  // sees the same deal. That is the whole point of sharing one boundary.
  const owner = { Authorization: `Bearer ${await accessTokenFor(email)}` }

  const me = await request.get('/api/v1/me', { headers: owner })
  expect(me.status()).toBe(200)
  expect(await me.json()).toMatchObject({ email, id: expect.any(String) })

  const list = await request.get('/api/v1/inspections', { headers: owner })
  expect(list.status()).toBe(200)
  expect(await list.json()).toMatchObject([{
    id,
    tenancyId: expect.any(String),
    property: expect.stringContaining('Battery'),
  }])

  const detail = await request.get(`/api/v1/inspections/${id}`, { headers: owner })
  expect(detail.status()).toBe(200)
  expect(await detail.json()).toMatchObject({
    id,
    tenancyRecordId: expect.any(String),
    tenant: 'Aisha Rahman',
    rooms: [],
  })

  // No credential, a forged one, and a token without the Bearer scheme.
  const badCredentials: Record<string, string>[] = [
    {},
    { Authorization: 'Bearer forged' },
    { Authorization: 'x' },
  ]
  for (const headers of badCredentials) {
    const denied = await request.get('/api/v1/me', { headers })
    expect(denied.status()).toBe(401)
    expect(await denied.json()).toEqual({ error: 'unauthorized' })
  }

  // A second agent, with a perfectly valid token of their own, gets exactly what they
  // would get for an id that never existed. Same status, same body, so the endpoint
  // cannot be used to enumerate.
  const outsider = { Authorization: `Bearer ${await accessTokenFor(freshEmail('api-outsider'))}` }
  const foreign = await request.get(`/api/v1/inspections/${id}`, { headers: outsider })
  const missing = await request.get('/api/v1/inspections/cmnope00000000000000000', {
    headers: outsider,
  })

  expect(foreign.status()).toBe(404)
  expect(missing.status()).toBe(404)
  expect(await foreign.json()).toEqual(await missing.json())
  expect(await foreign.json()).toEqual({ error: 'not_found' })

  const theirList = await request.get('/api/v1/inspections', { headers: outsider })
  expect(await theirList.json()).toEqual([])
})

/// The capture path as a native client walks it: no browser, no cookie, bytes going
/// straight to storage with a one-shot credential. Deliberately no page at all, because
/// the point is that the app never needs one.
test('a native client takes a check-in from capture to both signatures', async ({ request }) => {
  const headers = { Authorization: `Bearer ${await accessTokenFor(freshEmail('api-capture'))}` }
  const landlordEmail = freshEmail('api-landlord')

  const created = await request.post('/api/v1/inspections', {
    headers,
    data: {
      line1: '1 Raffles Place',
      postalCode: '048616',
      propertyType: 'PRIVATE_NON_LANDED',
      landlordName: 'Ng Wei Liang',
      landlordEmail,
      tenantName: 'Sofia Alvarez',
      startDate: '2026-09-01',
      endDate: '2028-08-31',
      monthlyRent: '4200',
      deposit: '8400',
    },
  })
  expect(created.status()).toBe(200)
  const inspectionId = (await created.json()).id as string

  const room = await request.post(`/api/v1/inspections/${inspectionId}/rooms`, {
    headers,
    data: { name: 'Kitchen' },
  })
  expect(room.status()).toBe(200)
  const roomId = (await room.json()).id as string

  // A one-shot credential for one object. The bytes never pass through a function.
  const upload = await request.post(
    `/api/v1/inspections/${inspectionId}/rooms/${roomId}/upload-url`,
    { headers, data: { filename: 'label.png' } },
  )
  expect(upload.status()).toBe(200)
  const { storagePath, signedUrl } = await upload.json()

  const put = await request.put(signedUrl, {
    headers: { 'content-type': FIXTURES.photo.mimeType },
    data: FIXTURES.photo.buffer,
  })
  expect(put.ok()).toBeTruthy()

  const registered = await request.post(
    `/api/v1/inspections/${inspectionId}/rooms/${roomId}/captures`,
    {
      headers,
      data: {
        kind: 'PHOTO',
        storagePath,
        mimeType: FIXTURES.photo.mimeType,
        sizeBytes: FIXTURES.photo.buffer.length,
        note: 'Fridge rating plate',
        annotations: {
          w: 640,
          h: 480,
          marks: [{ shape: 'ring', cx: 0.425, cy: 0.425, rx: 0.12, ry: 0.16 }],
        },
      },
    },
  )
  expect(registered.status()).toBe(200)

  // The room reads back with the capture, a signed URL for it, and the marks parsed
  // into the same shape the web client stores, because it is the same column.
  const context = await request.get(`/api/v1/inspections/${inspectionId}/rooms/${roomId}`, {
    headers,
  })
  expect(context.status()).toBe(200)
  const body = await context.json()
  expect(body.position).toEqual({ index: 1, total: 1 })
  expect(body.next).toBeNull()
  expect(body.captures).toHaveLength(1)
  expect(body.captures[0]).toMatchObject({
    kind: 'PHOTO',
    note: 'Fridge rating plate',
    annotations: { w: 640, h: 480, marks: [{ shape: 'ring' }] },
  })
  expect(body.captures[0].url).toContain('token=')

  // Installed app builds up to 19 consent before finishing and stop if it fails.
  const consent = await request.post(`/api/v1/inspections/${inspectionId}/ai-consent`, {
    headers,
    data: { consent: true },
  })
  expect(consent.status()).toBe(200)

  const finished = await request.post(
    `/api/v1/inspections/${inspectionId}/rooms/${roomId}/finish`,
    { headers },
  )
  expect(finished.status()).toBe(200)

  // Finishing hands the room straight to the inspector to write. Nothing drafts it, so
  // an empty room cannot be reviewed until a person adds a line.
  const detail = await request.get(`/api/v1/inspections/${inspectionId}`, { headers })
  expect((await detail.json()).rooms[0]).toMatchObject({ status: 'REVIEW', items: 0 })
  const empty = await request.post(
    `/api/v1/inspections/${inspectionId}/rooms/${roomId}/review`,
    { headers },
  )
  expect(empty.status()).toBe(409)
  expect(await empty.json()).toEqual({ error: 'review_incomplete' })

  const item = await request.post(`/api/v1/inspections/${inspectionId}/rooms/${roomId}/items`, {
    headers,
  })
  expect(item.status()).toBe(200)
  const reviewed = await request.post(
    `/api/v1/inspections/${inspectionId}/rooms/${roomId}/review`,
    { headers },
  )
  expect(reviewed.status()).toBe(200)
  const after = await request.get(`/api/v1/inspections/${inspectionId}`, { headers })
  // newSinceDraft and editedByHuman are required fields in installed app builds up to 19.
  expect((await after.json()).rooms[0]).toMatchObject({
    status: 'REVIEWED',
    items: 1,
    newSinceDraft: 0,
  })
  const reviewedRoom = await request.get(
    `/api/v1/inspections/${inspectionId}/rooms/${roomId}`,
    { headers },
  )
  expect((await reviewedRoom.json()).items[0]).toMatchObject({ editedByHuman: true })

  // Send for signature. The tenant signs on the agent's phone at the handover; the
  // landlord, who was not there, signs from their own login.
  expect((await request.post(`/api/v1/inspections/${inspectionId}/review`, { headers })).status()).toBe(200)
  const { tenantId } = await (await request.get(`/api/v1/inspections/${inspectionId}`, { headers })).json()
  const png = 'data:image/png;base64,iVBORw0KGgo='
  const tenantSigned = await request.post(`/api/v1/inspections/${inspectionId}/signatures`, {
    headers,
    data: { stakeholderId: tenantId, imageData: png },
  })
  expect(tenantSigned.status()).toBe(200)

  const landlord = { Authorization: `Bearer ${await accessTokenFor(landlordEmail)}` }
  const toSign = await request.get(`/api/v1/inspections/${inspectionId}/report`, { headers: landlord })
  expect(await toSign.json()).toMatchObject({ status: 'AWAITING_SIGNATURE', signAs: 'LANDLORD' })
  // The report, never the agent's working copy.
  expect((await request.get(`/api/v1/inspections/${inspectionId}`, { headers: landlord })).status()).toBe(404)
  const landlordSigned = await request.post(`/api/v1/inspections/${inspectionId}/report/signature`, {
    headers: landlord,
    data: { imageData: png },
  })
  expect(landlordSigned.status()).toBe(200)
  const signed = await request.get(`/api/v1/inspections/${inspectionId}/report`, { headers: landlord })
  expect(await signed.json()).toMatchObject({ status: 'COMPLETED', signAs: null })
})
