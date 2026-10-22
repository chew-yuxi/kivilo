import { test, expect } from '@playwright/test'
import { Resend } from 'resend'
import { db } from '../src/lib/db'
import { accessTokenFor, freshEmail, latestCodeFor, signIn } from './helpers'

test.afterAll(async () => {
  await db.$disconnect()
})

const newInspection = {
  line1: '18 Team Grove',
  unit: '#04-22',
  postalCode: '238801',
  propertyType: 'PRIVATE_NON_LANDED',
  landlordName: 'Maya Lim',
  tenantName: 'Ravi Tan',
  startDate: '2026-09-01',
  endDate: '2028-08-31',
  monthlyRent: '3200',
  deposit: '6400',
}

test('browser-test email is delivered only to local Mailpit with attachments intact', async ({
  request,
}) => {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const email = freshEmail('local-email')
  const payload = {
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: 'Local delivery check',
    text: 'Mailpit-only delivery',
    attachments: [{ filename: 'evidence.txt', content: Buffer.from('Evidence bytes') }],
  }
  const options = { idempotencyKey: email }
  const first = await resend.emails.send(payload, options)
  expect(first.error).toBeNull()
  const second = await resend.emails.send(payload, options)
  expect(second.data?.id).toBe(first.data?.id)
  const stored = await request.get(`http://127.0.0.1:56324/api/v1/message/${first.data!.id}`)
  expect(stored.ok()).toBe(true)
  const message = await stored.json()
  expect(message.Text).toContain('Mailpit-only delivery')
  expect(message.Attachments).toEqual([expect.objectContaining({ FileName: 'evidence.txt' })])
})

test('team and property settings links preserve their destination through sign-in', async ({
  page,
  request,
}) => {
  for (const destination of ['/team/invited-workspace', '/properties/draft-property/settings']) {
    const response = await request.get(destination, { maxRedirects: 0 })
    expect(response.status()).toBe(307)
    const login = new URL(response.headers().location, response.url())
    expect(login.pathname).toBe('/login')
    expect(login.searchParams.get('next')).toBe(destination)
  }

  // The invite destination uses the actual emailed-code flow and survives its full
  // page load, so signing in from an invitation does not lose the team screen.
  const email = freshEmail('team-deep-link')
  await page.goto('/team')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByRole('button', { name: 'Email me a code' }).click()
  await expect.poll(() => latestCodeFor(email)).not.toBeNull()
  await page.getByLabel('Six digit code').fill((await latestCodeFor(email))!)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/team')
  await expect(page.getByRole('heading', { name: 'Team', exact: true })).toBeVisible()
})

test('invite once, assign by name, transfer responsibility, and offboard with preserved work', async ({
  page,
  browser,
  request,
  baseURL,
}) => {
  test.setTimeout(180_000)
  const ownerEmail = freshEmail('team-owner')
  const colleagueEmail = freshEmail('team-agent')
  const colleagueName = colleagueEmail.split('@')[0]
  await signIn(page, ownerEmail)
  const owner = { Authorization: `Bearer ${await accessTokenFor(ownerEmail)}` }
  const ownerId = (await (await request.get('/api/v1/me', { headers: owner })).json()).id as string
  await page.getByRole('link', { name: 'Account', exact: true }).click()
  await page.getByRole('link', { name: 'Team members and invitations' }).click()
  await page.getByLabel('Agency name').fill('Grove Agency')
  await page.getByRole('button', { name: 'Create team', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Grove Agency', exact: true })).toBeVisible()
  const agencyId = page.url().split('/').pop()!
  await page.getByLabel('Colleague email').fill(colleagueEmail)
  await page.getByRole('button', { name: 'Send invitation', exact: true }).click()
  await expect(page.getByText('Invitation pending', { exact: false })).toBeVisible()

  const colleagueContext = await browser.newContext({
    baseURL,
    viewport: { width: 393, height: 851 },
  })
  try {
    const colleaguePage = await colleagueContext.newPage()
    await signIn(colleaguePage, colleagueEmail)
    await colleaguePage.getByRole('link', { name: 'Team', exact: true }).click()
    await colleaguePage.getByRole('button', { name: 'Accept invitation' }).click()
    await expect(colleaguePage.getByRole('link', { name: /Grove Agency/ })).toBeVisible()
    const colleague = { Authorization: `Bearer ${await accessTokenFor(colleagueEmail)}` }
    const colleagueId = (await (await request.get('/api/v1/me', { headers: colleague })).json())
      .id as string

    const created = await request.post('/api/v1/inspections', {
      headers: owner,
      data: newInspection,
    })
    expect(created.status()).toBe(200)
    const inspectionId = (await created.json()).id as string
    expect(
      (await request.get(`/api/v1/inspections/${inspectionId}`, { headers: colleague })).status(),
    ).toBe(404)
    await page.goto(`/inspections/${inspectionId}`)
    const assignment = page.getByTestId('tenancy-assignment')
    await assignment.getByText('Manage assignment', { exact: true }).click()
    await assignment.getByLabel('Move to team').selectOption(agencyId)
    await expect(assignment.getByLabel('Responsible agent')).toBeVisible()
    await assignment.getByRole('checkbox', { name: new RegExp(colleagueName) }).check()
    await assignment.getByRole('button', { name: 'Move to team', exact: true }).click()
    await assignment.getByRole('button', { name: 'Confirm move to team', exact: true }).click()
    await expect(assignment.locator('summary')).toContainText('Grove Agency')
    await assignment.getByText('Manage assignment', { exact: true }).click()
    await expect(assignment.getByText('Move to team', { exact: true })).toHaveCount(0)

    // An accepted member gains only explicitly assigned work and can contribute.
    expect(
      (
        await request.post(`/api/v1/inspections/${inspectionId}/rooms`, {
          headers: colleague,
          data: { name: 'Kitchen' },
        })
      ).status(),
    ).toBe(200)
    await assignment.getByLabel('Responsible agent').selectOption(colleagueId)
    await assignment.getByRole('button', { name: 'Save assignment', exact: true }).click()
    await expect(assignment.locator('summary')).toContainText(colleagueName)

    // An agent can hand their own work back without keeping a stale privileged page.
    await colleaguePage.goto(`/inspections/${inspectionId}`)
    const ownAssignment = colleaguePage.getByTestId('tenancy-assignment')
    await ownAssignment.getByText('Manage assignment', { exact: true }).click()
    await ownAssignment.getByLabel('Responsible agent').selectOption(ownerId)
    await ownAssignment.getByRole('button', { name: 'Save assignment', exact: true }).click()
    await expect(colleaguePage).toHaveURL('/inspections')
    await expect(colleaguePage.getByRole('link', { name: /18 Team Grove/ })).toHaveCount(0)

    // Reassign it before offboarding to exercise the required handover choice.
    await page.goto(`/inspections/${inspectionId}`)
    await assignment.getByText('Manage assignment', { exact: true }).click()
    await assignment.getByLabel('Responsible agent').selectOption(colleagueId)
    await assignment.getByRole('button', { name: 'Save assignment', exact: true }).click()
    await expect(assignment.locator('summary')).toContainText(colleagueName)
    await page.goto(`/team/${agencyId}`)
    await expect(page.getByRole('region', { name: 'Team work' })).toContainText(
      `Responsible agent: ${colleagueName}`,
    )
    await page.screenshot({ path: 'build/team-management-phone.png', fullPage: true })
    const colleagueRow = page
      .getByRole('region', { name: 'Team members' })
      .getByRole('listitem')
      .filter({ has: page.getByText(colleagueEmail, { exact: true }) })
    await colleagueRow.getByRole('button', { name: 'Manage member', exact: true }).click()
    await colleagueRow.getByRole('button', { name: 'Remove member', exact: true }).click()
    await expect(colleagueRow.getByRole('button', { name: 'Confirm removal' })).toBeDisabled()
    await colleagueRow.getByLabel('Hand assigned work to').selectOption(ownerId)
    await colleagueRow.getByRole('button', { name: 'Confirm removal' }).click()
    await expect(colleagueRow).toContainText('Removed')
    expect(
      (await request.get(`/api/v1/inspections/${inspectionId}`, { headers: colleague })).status(),
    ).toBe(404)
    await page.goto(`/inspections/${inspectionId}`)
    await expect(page.getByRole('link', { name: 'Start with Kitchen', exact: true })).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  } finally {
    await colleagueContext.close()
  }
})

test('property settings exposes archive, exact-address deletion and recovery', async ({
  page,
  request,
}) => {
  const email = freshEmail('property-settings')
  await signIn(page, email)
  const headers = { Authorization: `Bearer ${await accessTokenFor(email)}` }
  const created = await request.post('/api/v1/inspections', {
    headers,
    data: { ...newInspection, line1: '29 Draft Court' },
  })
  expect(created.status()).toBe(200)
  const inspectionId = (await created.json()).id as string
  await page.goto(`/inspections/${inspectionId}`)
  const settingsLink = page.getByRole('link', { name: 'Property settings', exact: true })
  await expect(settingsLink).toHaveCSS('border-top-style', 'solid')
  expect((await settingsLink.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await settingsLink.click()
  await expect(page.getByRole('heading', { name: 'Danger zone' })).toBeVisible()
  const settingsUrl = page.url()
  await page.getByRole('button', { name: 'Archive property', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Unarchive property', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'My work', exact: true }).click()
  await expect(page.getByRole('link', { name: /29 Draft Court/ })).toHaveCount(0)
  await page.getByRole('link', { name: 'Properties', exact: true }).click()
  await page.getByRole('link', { name: 'Archived', exact: true }).click()
  await page.getByRole('link', { name: /29 Draft Court/ }).click()
  await page.getByRole('button', { name: 'Unarchive property', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Archive property', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Delete property', exact: true }).click()
  const remove = page.getByRole('button', { name: 'Move to Recently deleted', exact: true })
  await expect(remove).toBeDisabled()
  await page.getByLabel('Type the full property address to confirm').fill('29 Draft Court')
  await expect(remove).toBeDisabled()
  await page.screenshot({ path: 'build/property-danger-zone-phone.png', fullPage: true })
  await page
    .getByLabel('Type the full property address to confirm')
    .fill('#04-22, 29 Draft Court, Singapore 238801')
  await remove.click()
  await expect(page.getByRole('button', { name: 'Restore property', exact: true })).toBeVisible()
  expect((await request.get(`/api/v1/inspections/${inspectionId}`, { headers })).status()).toBe(404)
  await page.getByRole('link', { name: 'Properties', exact: true }).click()
  await page.getByRole('link', { name: 'Recently deleted', exact: true }).click()
  await page.getByRole('link', { name: /29 Draft Court/ }).click()
  await expect(page).toHaveURL(settingsUrl)
  await page.getByRole('button', { name: 'Restore property', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Archive property', exact: true })).toBeVisible()
  expect((await request.get(`/api/v1/inspections/${inspectionId}`, { headers })).status()).toBe(200)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})
