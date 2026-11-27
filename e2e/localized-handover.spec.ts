import { expect, test, type Page } from '@playwright/test'
import { accessTokenFor, freshEmail, latestCodeFor, scribble } from './helpers'
import { messages } from '../src/lib/i18n'

for (const locale of ['zh', 'th'] as const) {
  test.describe(`Singapore handover in ${locale}`, () => {
    test.use({ locale: locale === 'zh' ? 'zh-SG' : 'th-TH' })

    test('both parties sign the original report and the tenant answers the deposit statement', async ({ browser, request }, testInfo) => {
      test.setTimeout(150_000)
      const m = messages(locale)
      const roomName = '厨房 · ห้องครัว'
      const landlordEmail = freshEmail('landlord-' + locale)
      const tenantEmail = freshEmail('tenant-' + locale)
      const headers = { Authorization: `Bearer ${await accessTokenFor(freshEmail('agent-' + locale))}` }
      const created = await request.post('/api/v1/inspections', { headers, data: {
        country: 'SG', line1: '8 Shenton Way', postalCode: '068811', propertyType: 'PRIVATE_NON_LANDED',
        furnishingLevel: 'UNFURNISHED', rooms: [roomName], tenantName: 'Tenant Teo', tenantEmail,
        landlordName: 'Landlord Tan', landlordEmail, startDate: '2026-11-01', endDate: '2027-10-31',
        monthlyRent: '1000', deposit: '2000', preservesBlankAmounts: true,
      } })
      expect(created.status()).toBe(200)
      const checkIn = (await created.json()).id as string
      const parties: Page[] = []
      for (const email of [tenantEmail, landlordEmail]) {
        const page = await browser.newPage({ locale, viewport: { width: 390, height: 844 } })
        parties.push(page)
        await page.goto(`/sign/${checkIn}?email=${encodeURIComponent(email)}`)
        await expect(page.getByLabel(m.web.login.email)).toHaveValue(email)
        await page.getByRole('button', { name: m.web.login.emailCode }).click()
        await expect.poll(() => latestCodeFor(email)).not.toBeNull()
        await page.getByLabel(m.web.login.code).fill((await latestCodeFor(email))!)
        await page.getByRole('button', { name: m.web.login.signIn, exact: true }).click()
        await expect(page).toHaveURL(new RegExp('/sign/' + checkIn))
      }

      async function complete(id: string) {
        const base = '/api/v1/inspections/' + id
        const detail = await (await request.get(base, { headers })).json()
        const room = base + '/rooms/' + detail.rooms[0].id
        for (const endpoint of [room + '/finish', room + '/review', base + '/review']) {
          expect((await request.post(endpoint, { headers })).status()).toBe(200)
        }
        for (const page of parties) {
          await page.goto('/sign/' + id)
          await expect(page.getByText(m.web.sign.awaitingLead)).toBeVisible()
          await expect(page.getByText(roomName, { exact: true }).first()).toBeVisible()
          await expect(page.getByText(m.web.sign.agreementBefore, { exact: false })).toBeVisible()
          await page.waitForLoadState('networkidle')
          await scribble(page, page.locator('canvas'))
          const signButton = page.getByRole('button', { name: m.web.signature.sign, exact: true })
          await expect(signButton).toBeEnabled()
          if (page === parties[0] && id === checkIn) {
            await signButton.scrollIntoViewIfNeeded()
            await page.screenshot({ path: testInfo.outputPath('signature-' + locale + '.png') })
          }
          expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
          await signButton.click({ timeout: 15_000 })
          await expect(page.locator('canvas')).toHaveCount(0)
        }
        const report = await (await request.get(base + '/report', { headers })).json()
        expect(report.status).toBe('COMPLETED')
        expect(report.signatures).toHaveLength(2)
        return (await request.get(base, { headers })).json()
      }
      await complete(checkIn)
      const tenant = parties[0]
      await tenant.goto('/handover/' + checkIn)
      await expect(tenant.getByRole('heading', { name: m.web.handover.title })).toBeVisible()
      await expect(tenant.getByText(m.web.handover.completed)).toBeVisible()
      await tenant.getByRole('link', { name: m.pwa.documents }).click()
      await expect(tenant.getByRole('heading', { name: m.pwa.tenancyAgreement })).toBeVisible()

      const started = await request.post(`/api/v1/inspections/${checkIn}/checkout`, { headers })
      expect(started.status()).toBe(200)
      const checkOut = (await started.json()).id as string
      const detail = await complete(checkOut)
      const base = '/api/v1/inspections/' + checkOut
      expect((await request.post(base + '/findings', { headers, data: {
        itemId: detail.checkOutItems[0].id, baselineItemId: null, changeType: 'DAMAGE',
        verdict: 'TENANT_LIABLE', rationale: '柜门裂开 · ประตูตู้แตก', estimatedCost: '250',
      } })).status()).toBe(200)
      expect((await request.post(base + '/findings/publish', { headers, data: {} })).status()).toBe(200)
      await tenant.goto('/sign/' + checkOut)
      await expect(tenant.getByRole('heading', { name: m.web.sign.answerHeading })).toBeVisible()
      const agree = tenant.getByRole('button', { name: m.web.deposit.agreeOwn, exact: true })
      await agree.scrollIntoViewIfNeeded()
      await tenant.screenshot({ path: testInfo.outputPath('deposit-' + locale + '.png') })
      await agree.click()
      await expect(tenant.getByRole('button', { name: m.web.deposit.agreeOwn, exact: true })).toHaveCount(0)
      const final = await (await request.get(base + '/report', { headers })).json()
      expect(final.assessment.statement).toMatchObject({ deposit: 2000, deductions: 250, toReturn: 1750 })
      for (const page of parties) await page.context().close()
    })
  })
}
