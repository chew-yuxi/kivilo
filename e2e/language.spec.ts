import { expect, test } from '@playwright/test'
import { freshEmail, signIn } from './helpers'

/// A landlord or tenant arriving from an email has no account language yet, so the
/// sign-in page follows the browser's.
test.describe('Chinese browser', () => {
  test.use({ locale: 'zh-SG' })

  test('signs in in Chinese', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: '欢迎使用 Kivilo' })).toBeVisible()
    await expect(page.getByRole('button', { name: '用电邮发送验证码' })).toBeVisible()
    await expect(page.locator('[lang="zh"]').first()).toBeVisible()
  })
})

test.describe('Thai browser', () => {
  test.use({ locale: 'th-TH' })

  test('signs in in Thai', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'ยินดีต้อนรับสู่ Kivilo' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'ส่งรหัสทางอีเมล' })).toBeVisible()
  })
})

/// An agent's choice on Account is stored on their account, so it outlasts the browser's
/// language: the whole app, and what Kivilo sends them, follows it.
test('an agent chooses Chinese on Account and the app stays in it', async ({ page, browser }) => {
  const email = freshEmail('language')
  await signIn(page, email)
  await page.goto('/account')
  await page.getByLabel('Language').selectOption('zh')
  await expect(page.getByLabel('语言')).toHaveValue('zh')

  await page.goto('/inspections')
  await expect(page.getByRole('heading', { name: '检查' })).toBeVisible()
  await expect(page.locator('[lang="zh"]').first()).toBeAttached()

  // Another browser on the same account, in English, still reads Chinese.
  const english = await browser.newContext({ locale: 'en-SG', storageState: await page.context().storageState() })
  const other = await english.newPage()
  await other.goto('/inspections')
  await expect(other.getByRole('heading', { name: '检查' })).toBeVisible()
  await english.close()
})
