import { expect, test } from '@playwright/test'

/// A landlord or tenant arriving from an email has no account language yet, so the
/// sign-in page follows the browser's.
test.describe('Chinese browser', () => {
  test.use({ locale: 'zh-SG' })

  test('signs in in Chinese', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: '登录' })).toBeVisible()
    await expect(page.getByRole('button', { name: '用电邮发送验证码' })).toBeVisible()
    await expect(page.locator('[lang="zh"]').first()).toBeVisible()
  })
})

test.describe('Thai browser', () => {
  test.use({ locale: 'th-TH' })

  test('signs in in Thai', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'ลงชื่อเข้าใช้' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'ส่งรหัสทางอีเมล' })).toBeVisible()
  })
})
