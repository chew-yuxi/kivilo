import { test, expect } from '@playwright/test'
import { db } from '../src/lib/db'
import { PRO_ACTIVE_PROPERTIES_PER_SEAT } from '../src/lib/plan-limits'
import { freshEmail, signIn } from './helpers'

/// Buying Pro, against the Stripe sandbox in `.env.local` (`pnpm billing:setup` once).
/// The real path: Upgrade sends a Free agent to Stripe Checkout, a test card pays, and
/// Stripe returns them to /account, which refreshes the subscription. A sandbox webhook
/// listener and its signing secret are required for checkout and later lifecycle events.
test('a Free agent upgrades to Pro through Stripe Checkout and can then manage billing', async ({ page }) => {
  test.setTimeout(180_000)
  const email = freshEmail('billing')
  await signIn(page, email)

  await page.goto('/account')
  await expect(page.getByText('Pro is S$39 per agent each month')).toBeVisible()
  await page.getByRole('button', { name: 'Upgrade to Pro' }).click()
  await page.waitForURL(/^https:\/\/checkout\.stripe\.com\//, { timeout: 30_000 })

  await page.getByRole('textbox', { name: 'Card number' }).fill('4242 4242 4242 4242')
  await page.getByRole('textbox', { name: 'Expiration' }).fill('12 / 34')
  await page.getByRole('textbox', { name: /CVC/ }).fill('123')
  await page.getByRole('textbox', { name: 'Cardholder name' }).fill('Kivilo Test')
  await page.getByRole('combobox', { name: 'Country or region' }).selectOption('SG')
  await page.getByRole('button', { name: 'Subscribe' }).click()

  await page.waitForURL(/\/account\?checkout=cs_test_/, { timeout: 60_000 })
  await expect(page.getByText('Pro', { exact: true })).toBeVisible()
  await expect(page.getByTestId('plan-usage')).toHaveText(`0 of ${PRO_ACTIVE_PROPERTIES_PER_SEAT} active properties`)
  await expect(page.getByRole('button', { name: 'Upgrade to Pro' })).toHaveCount(0)

  const payer = await db.stakeholder.findUniqueOrThrow({ where: { email } })
  const acquisition = await db.accountAcquisition.findUniqueOrThrow({ where: { stakeholderId: payer.id } })
  expect(acquisition.firstPaidAt).toBeNull() // A real sandbox checkout is still not real revenue.

  await page.getByRole('button', { name: 'Manage billing' }).click()
  await page.waitForURL(/^https:\/\/billing\.stripe\.com\//, { timeout: 30_000 })
})
