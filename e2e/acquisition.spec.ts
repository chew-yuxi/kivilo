import { test, expect } from '@playwright/test'
import { freshEmail, signIn } from './helpers'
import { db } from '../src/lib/db'
import { ACQUISITION_COOKIE } from '../src/lib/acquisition-keys'

test('verified OTP signup keeps the public first touch once and excludes the test account', async ({ page }) => {
  const email = freshEmail('acquisition')
  const touch = { source: 'google', medium: 'organic', campaign: null, landing: '/product', capturedAt: Date.now() }
  await page.context().addCookies([{
    name: ACQUISITION_COOKIE, value: encodeURIComponent(JSON.stringify(touch)),
    url: 'http://localhost:3111', sameSite: 'Lax',
  }])
  await signIn(page, email)
  const person = await db.stakeholder.findUniqueOrThrow({ where: { email }, include: { acquisition: true } })
  expect(person.acquisition).toMatchObject({
    source: 'google', medium: 'organic', landing: '/product', entryPoint: 'WEB', excluded: true,
    firstCompletedReportAt: null, firstPaidAt: null,
  })
  expect(person.acquisition!.verifiedAt.getTime()).toBeGreaterThanOrEqual(touch.capturedAt - 1000)

  await page.context().addCookies([{
    name: ACQUISITION_COOKIE,
    value: encodeURIComponent(JSON.stringify({ ...touch, source: 'bing', capturedAt: Date.now() })),
    url: 'http://localhost:3111', sameSite: 'Lax',
  }])
  await page.goto('/inspections')
  const repeated = await db.accountAcquisition.findUniqueOrThrow({ where: { stakeholderId: person.id } })
  expect(repeated).toEqual(person.acquisition)
})
