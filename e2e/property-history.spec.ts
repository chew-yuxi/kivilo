import { test, expect } from '@playwright/test'
import { accessTokenFor, freshEmail, signIn } from './helpers'

const newInspection = {
  line1: '7 History Lane',
  unit: '#02-11',
  postalCode: '238802',
  propertyType: 'PRIVATE_NON_LANDED',
  landlordName: 'Maya Lim',
  tenantName: 'Ravi Tan',
  startDate: '2026-09-01',
  endDate: '2028-08-31',
  monthlyRent: '3200',
  deposit: '6400',
}

test('a deleted room is in History with who deleted it, and Restore brings it back', async ({ page, request }) => {
  const email = freshEmail('history-lead')
  await signIn(page, email)
  const headers = { Authorization: `Bearer ${await accessTokenFor(email)}` }
  const created = await request.post('/api/v1/inspections', { headers, data: newInspection })
  expect(created.status()).toBe(200)
  const inspectionId = (await created.json()).id as string
  const room = await request.post(`/api/v1/inspections/${inspectionId}/rooms`, { headers, data: { name: 'Kitchen' } })
  const roomId = (await room.json()).id as string
  expect((await request.delete(`/api/v1/inspections/${inspectionId}/rooms/${roomId}`, { headers })).status()).toBe(200)

  await page.goto(`/inspections/${inspectionId}`)
  await expect(page.getByRole('link', { name: 'Kitchen' })).toHaveCount(0)
  await page.getByRole('link', { name: 'History', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'History', exact: true })).toBeVisible()
  const owner = email.split('@')[0]
  await expect(page.getByText(`${owner} deleted Kitchen`, { exact: false })).toBeVisible()
  await expect(page.getByText(`${owner} added the room Kitchen`, { exact: false })).toBeVisible()

  await page.screenshot({ path: 'build/property-history-phone.png', fullPage: true })
  await page.getByRole('link', { name: 'Deletions', exact: true }).click()
  await expect(page.getByText('added the room Kitchen', { exact: false })).toHaveCount(0)
  await page.getByRole('button', { name: 'Restore', exact: true }).click()
  await expect(page.getByText('Restored', { exact: true })).toBeVisible()

  await page.goto(`/inspections/${inspectionId}`)
  await expect(page.getByText('Kitchen').first()).toBeVisible()
})

test('a collaborator sees Delete property, and it names who can do it', async ({ browser, request }) => {
  const leadEmail = freshEmail('history-owner')
  const collaboratorEmail = freshEmail('history-collaborator')
  const leadPage = await browser.newPage()
  await signIn(leadPage, leadEmail)
  const headers = { Authorization: `Bearer ${await accessTokenFor(leadEmail)}` }
  const created = await request.post('/api/v1/inspections', { headers, data: { ...newInspection, line1: '9 History Lane' } })
  const inspectionId = (await created.json()).id as string
  const detail = await (await request.get(`/api/v1/inspections/${inspectionId}`, { headers })).json()
  expect((await request.post(`/api/v1/tenancies/${detail.tenancyRecordId}/access`, {
    headers, data: { email: collaboratorEmail },
  })).status()).toBe(200)

  const page = await browser.newPage()
  await signIn(page, collaboratorEmail)
  await page.goto(`/properties/${detail.propertyId}/settings`)
  await page.getByRole('button', { name: 'Delete property', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText(
    `Only the responsible agent or a team owner or manager for every tenancy here can do this. Ask ${leadEmail.split('@')[0]}.`,
  )
  await page.screenshot({ path: 'build/locked-action-phone.png', fullPage: true })
})
