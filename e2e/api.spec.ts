import { test, expect } from '@playwright/test'
import { accessTokenFor, freshEmail, signIn } from './helpers'

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
  expect(await list.json()).toMatchObject([{ id, property: expect.stringContaining('Battery') }])

  const detail = await request.get(`/api/v1/inspections/${id}`, { headers: owner })
  expect(detail.status()).toBe(200)
  expect(await detail.json()).toMatchObject({ id, tenant: 'Aisha Rahman', rooms: [] })

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
