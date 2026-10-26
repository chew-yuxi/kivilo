import { test, expect } from '@playwright/test'
import { accessTokenFor, freshEmail, signIn } from './helpers'
import { db } from '../src/lib/db'

/// A new agent is on Free, which holds five active properties. Past it, the API refuses in
/// its own words and the web app explains before the agent fills in a form for nothing.
test('a Free agent holds five active properties, then meets the limit on both clients', async ({
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

  expect(await (await request.get('/api/v1/me/plan', { headers })).json()).toMatchObject({
    plan: 'FREE', activeProperties: 0, limit: 5, seats: 1, team: null,
  })
  for (let index = 0; index < 5; index += 1) {
    expect((await request.post('/api/v1/inspections', {
      headers,
      data: { ...deal, line1: `${10 + index} Anson Road` },
    })).status()).toBe(200)
  }

  const refused = await request.post('/api/v1/inspections', { headers, data: deal })
  expect(refused.status()).toBe(403)
  expect(await refused.json()).toEqual({ error: 'plan_limit' })

  await page.goto('/inspections/new')
  await expect(page.getByTestId('plan-limit')).toContainText('5 active properties are in use')
  await expect(page.getByRole('button', { name: 'Create and start capturing' })).toHaveCount(0)

  await page.getByRole('link', { name: 'See your plan' }).click()
  await expect(page).toHaveURL(/\/account$/)
  await expect(page.getByTestId('plan-usage')).toHaveText('5 of 5 active properties')
})

test('team creation uses its own plan and changing workspace keeps the entered form', async ({ page, request }) => {
  const email = freshEmail('agency-plan')
  await signIn(page, email)
  const headers = { Authorization: `Bearer ${await accessTokenFor(email)}` }
  const created = await request.post('/api/v1/agencies', { headers, data: { name: 'Paid team' } })
  expect(created.status()).toBe(200)
  const agency = await created.json() as { id: string }
  const owner = await db.stakeholder.findUniqueOrThrow({ where: { email } })
  await db.subscription.create({ data: { agencyId: agency.id, plan: 'PRO', seats: 2, status: 'comped', managedById: owner.id } })
  for (let index = 0; index < 5; index += 1) {
    const response = await request.post('/api/v1/inspections', { headers, data: {
      line1: `${index + 1} Personal Road`, postalCode: '079903', propertyType: 'HDB',
      landlordName: 'Landlord', tenantName: 'Tenant', startDate: '2026-09-01', endDate: '2028-08-31',
      monthlyRent: '3000', deposit: '6000',
    } })
    expect(response.status()).toBe(200)
  }
  await page.goto(`/inspections/new?workspace=${agency.id}`)
  await expect(page.getByRole('button', { name: 'Create and start capturing' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Address (required)' }).fill('Preserve this address')
  await page.getByRole('combobox', { name: 'Workspace', exact: true }).selectOption('personal')
  await expect(page.getByTestId('plan-limit')).toContainText('5 active properties are in use')
  await expect(page.getByRole('button', { name: 'Create and start capturing' })).toHaveCount(0)
  await page.getByRole('combobox', { name: 'Workspace', exact: true }).selectOption(agency.id)
  await expect(page.getByRole('textbox', { name: 'Address (required)' })).toHaveValue('Preserve this address')
  await page.goto(`/account?agencyId=${agency.id}`)
  await expect(page.getByTestId('plan-usage')).toHaveText('0 of 50 active properties')
  await page.getByRole('navigation', { name: 'Billing workspace' }).getByRole('link', { name: 'Personal', exact: true }).click()
  await expect(page.getByTestId('plan-usage')).toHaveText('5 of 5 active properties')
})
