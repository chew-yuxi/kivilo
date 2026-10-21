import { test, expect } from '@playwright/test'
import { db } from '../src/lib/db'
import { accessTokenFor, freshEmail, signIn } from './helpers'

test.afterAll(async () => { await db.$disconnect() })

test('a lead shares one tenancy, keeps another private, and can revoke working access', async ({
  page, browser, request, baseURL,
}) => {
  test.setTimeout(120_000)
  const ownerEmail = freshEmail('collaboration-owner')
  const collaboratorEmail = freshEmail('collaboration-colleague')
  const collaboratorName = collaboratorEmail.split('@')[0]
  await signIn(page, ownerEmail)
  const owner = { Authorization: `Bearer ${await accessTokenFor(ownerEmail)}` }
  const ownerId = (await (await request.get('/api/v1/me', { headers: owner })).json()).id as string

  // Two properties require Pro. Only the local subscription is fixture setup; the
  // properties, sharing, sign-in and edits all use the real application paths.
  expect(new URL(process.env.DATABASE_URL!).hostname).toMatch(/^(localhost|127\.0\.0\.1|\[::1\])$/)
  await db.subscription.create({
    data: { stakeholderId: ownerId, plan: 'PRO', seats: 1, status: 'comped' },
  })
  const colleagueContext = await browser.newContext({ baseURL, viewport: { width: 393, height: 851 } })
  try {
    const propertyIds: string[] = []
    for (const line1 of ['12 Shared Grove', '24 Private Court']) {
      const created = await request.post('/api/v1/inspections', {
        headers: owner,
        data: {
          line1, unit: '#03-12', postalCode: '238801', propertyType: 'PRIVATE_NON_LANDED',
          landlordName: 'Maya Lim', tenantName: 'Ravi Tan', startDate: '2026-09-01',
          endDate: '2028-08-31', monthlyRent: '3200', deposit: '6400',
        },
      })
      expect(created.status()).toBe(200)
      propertyIds.push((await created.json()).id as string)
    }
    const [sharedId, privateId] = propertyIds

    await page.goto(`/inspections/${sharedId}`)
    const access = page.getByTestId('tenancy-access')
    await expect(access.getByText('Private', { exact: true })).toBeVisible()
    await access.getByText('Manage access', { exact: true }).click()
    await access.getByLabel('Collaborator email').fill(ownerEmail)
    await access.getByRole('button', { name: 'Add collaborator', exact: true }).click()
    await expect(access.getByRole('alert')).toBeVisible()
    await expect(access.getByLabel('Collaborator email')).toHaveValue(ownerEmail)

    // Sharing with an address before first sign-in is claimed only by that verified
    // mailbox; no fake session or pre-created collaborator account is needed.
    await access.getByLabel('Collaborator email').fill(collaboratorEmail)
    await access.getByRole('button', { name: 'Add collaborator', exact: true }).click()
    await expect(access.getByText(`Shared with ${collaboratorName}`, { exact: true })).toBeVisible()
    await expect(access.getByLabel('Collaborator email')).toHaveValue('')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: 'build/collaboration-access.png', fullPage: true })

    const colleaguePage = await colleagueContext.newPage()
    await signIn(colleaguePage, collaboratorEmail)
    await expect(colleaguePage.getByRole('link', { name: /12 Shared Grove/ })).toBeVisible()
    await expect(colleaguePage.getByRole('link', { name: /24 Private Court/ })).toHaveCount(0)
    await colleaguePage.getByRole('link', { name: /12 Shared Grove/ }).click()
    await expect(colleaguePage.getByText('View access', { exact: true })).toBeVisible()
    await colleaguePage.getByText('View access', { exact: true }).click()
    await expect(colleaguePage.getByRole('button', { name: 'Add collaborator' })).toHaveCount(0)
    await colleaguePage.getByRole('button', { name: 'Kitchen', exact: true }).click()
    await expect(colleaguePage.getByRole('link', { name: 'Start with Kitchen' })).toBeVisible()

    const collaborator = { Authorization: `Bearer ${await accessTokenFor(collaboratorEmail)}` }
    const shared = await request.get(`/api/v1/inspections/${sharedId}`, { headers: collaborator })
    expect(shared.status()).toBe(200)
    const sharedBody = await shared.json()
    expect(sharedBody.rooms).toEqual([expect.objectContaining({ name: 'Kitchen' })])
    const tenancyId = sharedBody.tenancyRecordId as string
    expect((await colleaguePage.goto(`/renewals/${tenancyId}`))?.status()).toBe(404)
    await page.goto(`/renewals/${tenancyId}`)
    const keepSharing = page.getByRole('checkbox', { name: `Keep sharing this renewal with ${collaboratorName}` })
    await expect(keepSharing).not.toBeChecked()
    await keepSharing.check()
    await expect(keepSharing).toBeChecked()
    const refusedShare = await request.post(`/api/v1/tenancies/${tenancyId}/access`, {
      headers: collaborator, data: { email: freshEmail('cannot-reshare') },
    })
    expect(refusedShare.status()).toBe(404)
    const privateResponse = await request.get(`/api/v1/inspections/${privateId}`, { headers: collaborator })
    const missingResponse = await request.get('/api/v1/inspections/cmnope00000000000000000', { headers: collaborator })
    expect(privateResponse.status()).toBe(404)
    expect(await privateResponse.json()).toEqual(await missingResponse.json())

    await page.goto(`/inspections/${sharedId}`)
    await access.getByText('Manage access', { exact: true }).click()
    await access.getByRole('button', { name: `Remove ${collaboratorName}`, exact: true }).click()
    await expect(access.getByText(`Remove ${collaboratorName}'s access to this tenancy? Their saved work stays on the property.`)).toBeVisible()
    await access.getByRole('button', { name: 'Remove access', exact: true }).click()
    await expect(access.getByText('Private', { exact: true })).toBeVisible()
    // The colleague's edit stays, while fresh reads and writes lose their authority.
    await expect(page.getByRole('link', { name: 'Start with Kitchen' })).toBeVisible()
    expect((await request.get(`/api/v1/inspections/${sharedId}`, { headers: collaborator })).status()).toBe(404)
    expect((await request.post(`/api/v1/inspections/${sharedId}/rooms`, {
      headers: collaborator, data: { name: 'Bedroom 2' },
    })).status()).toBe(404)
    await colleaguePage.goto('/inspections')
    await expect(colleaguePage.getByRole('link', { name: /12 Shared Grove/ })).toHaveCount(0)

    await page.goto('/inspections')
    await expect(page.getByRole('link', { name: /12 Shared Grove/ })).toContainText('Private')
    await expect(page.getByRole('link', { name: /24 Private Court/ })).toContainText('Private')
  } finally {
    await colleagueContext.close()
    await db.subscription.deleteMany({ where: { stakeholderId: ownerId } })
  }
})
