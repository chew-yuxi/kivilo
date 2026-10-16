import { test, expect } from '@playwright/test'
import { accessTokenFor, freshEmail, signIn } from './helpers'

/// A new agent is on Free, which holds one active property. Past it, the API refuses in
/// its own words and the web app explains before the agent fills in a form for nothing.
test('a Free agent holds one active property, then meets the limit on both clients', async ({
  page,
  request,
}) => {
  const email = freshEmail('plan')
  await signIn(page, email)
  const headers = { Authorization: `Bearer ${await accessTokenFor(email)}` }
  const deal = {
    line1: '10 Anson Road',
    postalCode: '079903',
    propertyType: 'COMMERCIAL',
    landlordName: 'Goh Siew Lan',
    tenantName: 'Marcus Chia',
    startDate: '2026-09-01',
    endDate: '2028-08-31',
    monthlyRent: '5200',
    deposit: '10400',
  }

  expect(await (await request.get('/api/v1/me/plan', { headers })).json()).toEqual({
    plan: 'FREE', activeProperties: 0, limit: 1, seats: 1, team: null,
  })
  expect((await request.post('/api/v1/inspections', { headers, data: deal })).status()).toBe(200)

  const refused = await request.post('/api/v1/inspections', { headers, data: deal })
  expect(refused.status()).toBe(403)
  expect(await refused.json()).toEqual({ error: 'plan_limit' })

  await page.goto('/inspections/new')
  await expect(page.getByTestId('plan-limit')).toContainText('1 active property is in use')
  await expect(page.getByRole('button', { name: 'Create and start capturing' })).toHaveCount(0)

  await page.getByRole('link', { name: 'See your plan' }).click()
  await expect(page).toHaveURL(/\/account$/)
  await expect(page.getByTestId('plan-usage')).toHaveText('1 of 1 active property')
})
