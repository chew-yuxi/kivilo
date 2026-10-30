import { test, expect } from '@playwright/test'
import { freshEmail, latestCodeFor } from './helpers'
import { ensureSanctionsLists, removeCases } from './cdd-helpers'
import { db } from '../src/lib/db'

const cleanup: { caseIds: string[]; people: string[] } = { caseIds: [], people: [] }

test.afterAll(async () => {
  await removeCases(cleanup)
  await db.stakeholder.deleteMany({ where: { id: { in: cleanup.people } } })
})

/// A client opens their agent's "please send your particulars" link, signs in with the
/// emailed code as themselves, fills in their details and sees only a thank-you. The case
/// moves to the agent with the ID number encrypted (plans/compliance-pack.md).
test('a client sends their due-diligence particulars from the emailed link', async ({ page }) => {
  await ensureSanctionsLists()
  const email = freshEmail('cdd-client')
  const agent = await db.stakeholder.create({ data: { name: 'Jane Agent', email: freshEmail('cdd-agent') } })
  const client = await db.stakeholder.create({ data: { name: 'Tan Wei Ming', email } })
  const deal = await db.cddCase.create({ data: { agentId: agent.id, clientId: client.id, clientRole: 'LANDLORD' } })
  cleanup.caseIds.push(deal.id)
  cleanup.people.push(agent.id, client.id)

  await page.goto(`/cdd/${deal.id}?email=${encodeURIComponent(email)}`)
  await expect(page.getByLabel('Email')).toHaveValue(email)
  await page.getByRole('button', { name: 'Email me a code' }).click()
  await expect(page.getByLabel('Six digit code')).toBeVisible()
  await expect.poll(() => latestCodeFor(email), { timeout: 20_000 }).not.toBeNull()
  await page.getByLabel('Six digit code').fill((await latestCodeFor(email))!)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByRole('heading', { name: 'Verify your identity' })).toBeVisible()
  await expect(page.getByText('Jane Agent is your agent, acting for you as the landlord.', { exact: false })).toBeVisible()
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: 'test-results/cdd-particulars-form.png', fullPage: true })

  await page.getByLabel('Full name, as on your ID').fill('Tan Wei Ming')
  await page.getByLabel('Date of birth').fill('1985-04-12')
  await page.getByLabel('Nationality').fill('Singapore')
  await page.getByLabel('Residential address').fill('1 Orchard Road, #10-01, Singapore 238823')
  await page.getByRole('button', { name: 'Continue' }).click()

  // A mistyped number fails its check letter as it is typed, before anything is sent.
  await page.getByLabel('ID number').fill('S1234567A')
  await expect(page.getByText('This NRIC number is not valid. Check it against the card')).toBeVisible()
  await page.getByLabel('ID number').fill('s1234567d')
  await expect(page.getByLabel('Valid')).toBeVisible()
  await page.getByRole('button', { name: 'No', exact: true }).click()
  await page.screenshot({ path: 'test-results/cdd-particulars-id.png', fullPage: true })
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByText('S1234567D')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send my details' })).toBeDisabled()
  await page.getByRole('checkbox').check()
  await page.screenshot({ path: 'test-results/cdd-particulars-confirm.png', fullPage: true })
  await page.getByRole('button', { name: 'Send my details' }).click()

  await expect(page.getByRole('heading', { name: 'Details sent' })).toBeVisible()
  await expect(page.getByText(/^DD-[0-9A-F]{8}$/)).toBeVisible()
  await page.screenshot({ path: 'test-results/cdd-particulars-thanks.png', fullPage: true })
  const shown = (await page.locator('body').innerText()).toLowerCase()
  for (const word of ['screen', 'sanction', 'match', 'review']) expect(shown).not.toContain(word)

  const stored = await db.cddParticulars.findUniqueOrThrow({ where: { caseId: deal.id } })
  expect(stored).toMatchObject({ legalName: 'Tan Wei Ming', idNumberLast4: '567D', submittedInPerson: false })
  expect(stored.idNumberEncrypted).not.toContain('1234567')
  expect((await db.cddCase.findUniqueOrThrow({ where: { id: deal.id } })).status).toBe('NEEDS_REVIEW')
})
