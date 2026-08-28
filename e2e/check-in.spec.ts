import { test, expect } from '@playwright/test'
import { signIn, freshEmail, scribble, FIXTURES } from './helpers'

/// The whole check-in, as an agent does it on a phone: create the deal, capture one
/// room, let extraction draft it, review, send for signature, both parties sign, share
/// the report. Then the two things the product promises on top: a report link works
/// without a session and dies on revoke, and another agent cannot see any of it.
test('check-in from capture to countersigned report', async ({ page, browser }) => {
  await signIn(page, freshEmail('agent'))

  // Create the deal.
  await page.getByRole('link', { name: 'New check-in' }).first().click()
  await page.getByLabel('Address').fill('2 Marina Boulevard')
  await page.getByLabel('Unit').fill('#28-05')
  await page.getByLabel('Postal code').fill('018987')
  await page.getByLabel('Landlord', { exact: true }).fill('Tan Wei Ming')
  await page.getByLabel('Tenant', { exact: true }).fill('Priya Raman')
  await page.getByLabel('Deposit (SGD)').fill('13600')
  await page.getByRole('button', { name: 'Create and start capturing' }).click()
  await expect(page).toHaveURL(/\/inspections\/c[a-z0-9]{20,}$/)
  await expect(page.getByRole('heading', { name: 'Check-in', exact: true })).toBeVisible()
  const inspectionUrl = page.url()

  // Capture the kitchen: one label photo and one walkthrough, through the offline
  // queue and a signed upload URL, exactly as the phone does it. The photo is on
  // screen from the phone's own copy before the upload has finished, and its note is
  // typed against it afterwards.
  await page.getByRole('button', { name: 'Kitchen' }).click()
  await page.getByRole('link', { name: 'Start with Kitchen' }).click()
  await expect(page).toHaveURL(/\/rooms\/c[a-z0-9]{20,}\/capture$/)
  await page.locator('input[type=file][accept="image/*"]').setInputFiles(FIXTURES.photo)
  await page.getByRole('button', { name: /^Photo 1/ }).click()
  await page.getByRole('textbox', { name: 'Note' }).fill('Fridge rating plate')
  await page.getByRole('button', { name: 'Save note' }).click()
  await expect(page.getByText('Fridge rating plate')).toBeVisible()

  // Circle the damage. The ring is stored as geometry over an untouched original, so
  // the assertion that matters is not that it saved but that it lands on the same part
  // of the picture later, at a different size, in the landlord's report.
  await page.getByRole('button', { name: /^Photo 1/ }).click()
  await page.getByRole('button', { name: 'Mark up' }).click()
  // The <img> fills the media area and the picture is letterboxed inside it, exactly as
  // the overlay is, so the drag has to target the picture rather than the element box.
  const shotBox = (await page.locator('dialog img').boundingBox())!
  const scale = Math.min(shotBox.width / 640, shotBox.height / 480)
  const picture = {
    w: 640 * scale,
    h: 480 * scale,
    x: shotBox.x + (shotBox.width - 640 * scale) / 2,
    y: shotBox.y + (shotBox.height - 480 * scale) / 2,
  }
  await page.mouse.move(picture.x + picture.w * 0.25, picture.y + picture.h * 0.25)
  await page.mouse.down()
  await page.mouse.move(picture.x + picture.w * 0.6, picture.y + picture.h * 0.6, { steps: 10 })
  await page.mouse.up()
  await page.getByRole('button', { name: 'Save marks' }).click()
  await expect(page.getByRole('button', { name: /^Photo 1.*marked/ })).toBeVisible()

  // A second, portrait photo. It is the taller item in the review strip's grid row,
  // which is what makes a stretched overlay observable there.
  await page.locator('input[type=file][accept="image/*"]').setInputFiles(FIXTURES.portrait)
  await expect(page.getByRole('button', { name: /^Photo 2/ })).toBeVisible()

  await page.locator('input[type=file][accept="video/*"]').setInputFiles(FIXTURES.video)
  await expect(page.getByRole('button', { name: /^Video 3/ })).toBeVisible()

  // Done waits for the room's uploads, hands it to extraction, and moves on; with no
  // next room that is the list, which polls until the draft is in.
  await page.getByRole('button', { name: 'Done with Kitchen' }).click()
  await expect(page).toHaveURL(inspectionUrl)
  await expect(page.getByText('Needs review')).toBeVisible({ timeout: 30_000 })

  // Review: the draft is the model's, and a person touching a line takes it over.
  await page.getByRole('link', { name: 'Continue with Kitchen' }).click()
  await expect(page.getByText('2 items · 2 not yet touched by a person')).toBeVisible()

  // The evidence strip becomes a two-column grid from sm up, where a row is as tall as
  // its tallest item. That is the one surface where the overlay can stretch away from
  // its photograph, and the phone viewport this suite runs at never reaches it.
  await page.setViewportSize({ width: 1100, height: 900 })
  const strip = page.locator('svg[data-marks="1"]')
  await expect(strip).toBeVisible()
  const stripPhoto = (await page.locator('div:has(> svg[data-marks="1"]) > img').boundingBox())!
  const stripRing = (await strip.locator('path').first().boundingBox())!
  expect((stripRing.x + stripRing.width / 2 - stripPhoto.x) / stripPhoto.width).toBeCloseTo(0.425, 2)
  expect((stripRing.y + stripRing.height / 2 - stripPhoto.y) / stripPhoto.height).toBeCloseTo(
    0.425,
    2,
  )
  await page.setViewportSize({ width: 412, height: 915 })
  await expect(page.locator('input[value="SAMSUNG RF48A4000S9/SS SERIAL 0KM74BDT200341N"]')).toBeVisible()
  await expect(page.getByText('unsure')).toBeVisible()
  const worktop = page.locator('input[value="Worktop"]')
  await worktop.fill('Quartz worktop')
  await worktop.blur()
  await expect(page.getByText('2 items · 1 not yet touched by a person')).toBeVisible()
  await page.getByRole('button', { name: 'Mark room reviewed' }).click()
  await expect(page).toHaveURL(inspectionUrl)
  await expect(page.getByText('Reviewed', { exact: true })).toBeVisible()

  // Freeze the report and collect both signatures.
  await page.getByRole('button', { name: 'Send for signature' }).click()
  await expect(page.getByText('Awaiting signatures')).toBeVisible()
  await expect(page.getByText('Quartz worktop')).toBeVisible()

  // Landlord first, then tenant. A signed pad is replaced by its receipt, so the
  // first remaining canvas is always the next party.
  for (const party of ['Tan Wei Ming', 'Priya Raman']) {
    await scribble(page, page.locator('canvas').first())
    await page.getByRole('button', { name: 'Sign', exact: true }).first().click()
    await expect(page.getByText(party).locator('..').getByText(/^Signed /)).toBeVisible()
  }
  await expect(page.getByText('Completed', { exact: true })).toBeVisible()

  // Share: the link is the credential, so it must open with no session at all.
  await page.getByRole('button', { name: 'Create report link' }).click()
  const link = await page.locator('code').filter({ hasText: '/reports/' }).textContent()
  expect(link).toMatch(/\/reports\/[A-Za-z0-9_-]{40,}$/)

  const outsider = await browser.newContext()
  const report = await outsider.newPage()
  await report.goto(link!)
  await expect(report.getByText('Kivilo condition report')).toBeVisible()
  await expect(report.getByText('#28-05')).toBeVisible()
  await expect(report.getByText('Quartz worktop')).toBeVisible()
  await expect(report.getByText('SAMSUNG RF48A4000S9/SS SERIAL 0KM74BDT200341N')).toBeVisible()
  await expect(report.getByRole('button', { name: 'Install app' })).toHaveCount(0)

  // The mark survived to the document both parties argue over, and it is still pointing
  // at the same 42.5 percent of the photo it was drawn against on the phone. This is the
  // failure that would otherwise be invisible until a landlord noticed.
  await expect(report.getByText('1 area marked')).toBeVisible()
  const overlay = report.locator('svg[data-marks="1"]')
  await expect(overlay).toBeVisible()
  const reportBox = (await report.locator('figure img').first().boundingBox())!
  const ringBox = (await overlay.locator('path').first().boundingBox())!
  expect((ringBox.x + ringBox.width / 2 - reportBox.x) / reportBox.width).toBeCloseTo(0.425, 2)
  expect((ringBox.y + ringBox.height / 2 - reportBox.y) / reportBox.height).toBeCloseTo(0.425, 2)

  // And under print, which is where an absolutely positioned overlay most often comes
  // adrift. This document exists to be printed and argued over.
  await report.emulateMedia({ media: 'print' })
  const printedBox = (await report.locator('figure img').first().boundingBox())!
  const printedRing = (await overlay.locator('path').first().boundingBox())!
  expect((printedRing.x + printedRing.width / 2 - printedBox.x) / printedBox.width).toBeCloseTo(
    0.425,
    2,
  )
  expect((printedRing.y + printedRing.height / 2 - printedBox.y) / printedBox.height).toBeCloseTo(
    0.425,
    2,
  )
  await report.emulateMedia({ media: 'screen' })

  await page.getByRole('button', { name: 'Revoke' }).click()
  await expect(page.getByRole('button', { name: 'Create report link' })).toBeVisible()
  const revoked = await report.goto(link!)
  expect(revoked!.status()).toBe(404)
  await outsider.close()

  // Authorization lives in the data layer: a second agent sees nothing of this deal.
  const other = await browser.newContext()
  const otherPage = await other.newPage()
  await signIn(otherPage, freshEmail('other'))
  await expect(otherPage.getByText('Nothing here yet')).toBeVisible()
  const denied = await otherPage.goto(inspectionUrl)
  expect(denied!.status()).toBe(404)
  await other.close()
})
