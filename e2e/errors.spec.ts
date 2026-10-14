import { test, expect, type Page } from '@playwright/test'
import { freshEmail, signIn } from './helpers'

/// The browser half of error tracking, on the real path. A report left over from an
/// earlier visit goes on the next page load, an error nothing caught is posted for the
/// signed-in agent, and one raised with no signal waits on the phone until it returns.
const KEY = 'kivilo:error-reports'

const pendingReports = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '[]').length, KEY)

const nextReport = (page: Page) =>
  page.waitForResponse((response) => new URL(response.url()).pathname === '/api/v1/errors')

test('error reports reach the server, and wait out a lost connection', async ({ page, context }) => {
  await signIn(page, freshEmail('errors'))
  const tag = `e2e-${Date.now().toString(36)}`

  await page.evaluate(({ key, message }) => localStorage.setItem(key, JSON.stringify([{
    id: crypto.randomUUID(), context: 'window', name: 'TypeError', message, stack: null,
    path: '/inspections', release: null, occurredAt: new Date().toISOString(),
  }])), { key: KEY, message: `left over ${tag}` })
  let posted = nextReport(page)
  await page.reload()
  expect(await (await posted).json()).toEqual({ recorded: 1 })
  await expect.poll(() => pendingReports(page)).toBe(0)

  posted = nextReport(page)
  await page.evaluate((message) => { setTimeout(() => { throw new Error(message) }) }, `uncaught ${tag}`)
  const response = await posted
  expect(await response.json()).toEqual({ recorded: 1 })
  expect(response.request().postDataJSON().errors).toEqual([expect.objectContaining({
    context: 'window', name: 'Error', message: `uncaught ${tag}`, path: '/inspections',
  })])

  await context.setOffline(true)
  await page.evaluate((message) => { void Promise.reject(new Error(message)) }, `offline ${tag}`)
  await expect.poll(() => pendingReports(page)).toBe(1)

  posted = nextReport(page)
  await context.setOffline(false)
  expect(await (await posted).json()).toEqual({ recorded: 1 })
  await expect.poll(() => pendingReports(page)).toBe(0)
})
