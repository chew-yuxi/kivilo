import { expect, test } from '@playwright/test'
import { freshEmail, signIn } from './helpers'

test('property tabs keep the selected view visible on a narrow phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await signIn(page, freshEmail('view-tabs'))
  await page.goto('/properties?filter=trash&q=Bayview')
  const stages = page.locator('nav').filter({ has: page.getByRole('link', { name: 'Recently deleted', exact: true }) })
  const selected = stages.locator('a[aria-current="page"]')
  await expect(selected).toHaveText('Recently deleted')
  await expect(selected).toBeInViewport({ ratio: 1 })
  await expect(stages.locator('[data-measured]')).toBeVisible()
  const mark = await selected.evaluate(element => {
    const link = element as HTMLAnchorElement
    const strip = link.parentElement!
    const style = getComputedStyle(strip, '::after')
    return {
      width: style.width,
      height: style.height,
      center: new DOMMatrixReadOnly(style.transform).m41 + parseFloat(style.width) / 2,
      labelCenter: link.offsetLeft + link.offsetWidth / 2,
      duration: style.transitionDuration,
    }
  })
  expect(mark.width).toBe('18px')
  expect(mark.height).toBe('3px')
  expect(mark.center).toBeCloseTo(mark.labelCenter, 0)
  expect(mark.duration).toBe('0s')
  await stages.getByRole('link', { name: 'Archived', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(selected).toHaveText('Archived')
  await expect(page).toHaveURL(/filter=archived&q=Bayview/)
  await page.goBack()
  await expect(selected).toHaveText('Recently deleted')
  await expect(selected).toBeInViewport({ ratio: 1 })
})
