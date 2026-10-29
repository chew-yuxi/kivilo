import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { freshEmail, latestCodeFor } from './helpers'
import { db } from '../src/lib/db'
import { parseTsfaFirstSchedule } from '../src/lib/screening/sg-tsfa'
import { parseUnConsolidated } from '../src/lib/screening/un-list'

const fixture = (name: string) => readFileSync(path.join(process.cwd(), 'src/lib/screening/fixtures', name), 'utf8')

const cleanup: { caseIds: string[]; people: string[] } = { caseIds: [], people: [] }

// Due-diligence records block deleting the people they name (they are kept five years),
// so this test removes its own case before anything else cleans up test accounts.
test.afterAll(async () => {
  const runs = await db.screeningRun.findMany({ where: { caseId: { in: cleanup.caseIds } }, select: { id: true } })
  await db.screeningCandidate.deleteMany({ where: { runId: { in: runs.map((run) => run.id) } } })
  await db.screeningRun.deleteMany({ where: { caseId: { in: cleanup.caseIds } } })
  await db.cddEvent.deleteMany({ where: { caseId: { in: cleanup.caseIds } } })
  await db.cddParticulars.deleteMany({ where: { caseId: { in: cleanup.caseIds } } })
  await db.cddCase.deleteMany({ where: { id: { in: cleanup.caseIds } } })
  await db.stakeholder.deleteMany({ where: { id: { in: cleanup.people } } })
})

/// A client opens their agent's "please send your particulars" link, signs in with the
/// emailed code as themselves, fills in their details and sees only a thank-you. The case
/// moves to the agent with the ID number encrypted (plans/compliance-pack.md).
test('a client sends their due-diligence particulars from the emailed link', async ({ page }) => {
  if ((await db.sanctionsList.count()) === 0) {
    for (const [source, list] of [
      ['UN', parseUnConsolidated(fixture('un-consolidated-sample.xml'))],
      ['SG', parseTsfaFirstSchedule(fixture('sg-tsfa-first-schedule.html'))],
    ] as const) {
      await db.sanctionsList.create({
        data: { source, checksum: `e2e-${source}`, publishedAt: list.generatedAt, entryCount: list.entries.length, entries: list.entries },
      })
    }
  }
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

  await expect(page.getByRole('heading', { name: 'Your details for your rental' })).toBeVisible()
  await expect(page.getByText('Jane Agent is your property agent for this rental, as the landlord.')).toBeVisible()
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: 'test-results/cdd-particulars-form.png', fullPage: true })

  await page.getByLabel('Full name, as on your ID').fill('Tan Wei Ming')
  await page.getByLabel('ID number').fill('S1234567A')
  await page.getByLabel('Nationality').fill('Singapore')
  await page.getByLabel('Date of birth').fill('1985-04-12')
  await page.getByLabel('Residential address').fill('1 Orchard Road, #10-01, Singapore 238823')
  await page.getByRole('button', { name: 'Send my details' }).click()

  await expect(page.getByRole('heading', { name: 'Thank you' })).toBeVisible()
  await expect(page.getByText('Your details have been sent to Jane Agent.')).toBeVisible()
  await page.screenshot({ path: 'test-results/cdd-particulars-thanks.png', fullPage: true })
  const shown = (await page.locator('body').innerText()).toLowerCase()
  for (const word of ['screen', 'sanction', 'match', 'review']) expect(shown).not.toContain(word)

  const stored = await db.cddParticulars.findUniqueOrThrow({ where: { caseId: deal.id } })
  expect(stored).toMatchObject({ legalName: 'Tan Wei Ming', idNumberLast4: '567A', submittedInPerson: false })
  expect(stored.idNumberEncrypted).not.toContain('1234567')
  expect((await db.cddCase.findUniqueOrThrow({ where: { id: deal.id } })).status).toBe('NEEDS_REVIEW')
})
