import { test, expect, type Page } from '@playwright/test'
import { accessTokenFor, freshEmail, signIn } from './helpers'

/// The browser half of error tracking, on the real path. A report left over from an
/// earlier visit goes on the next page load, an error nothing caught is posted for the
/// signed-in agent, and one raised with no signal waits on the phone until it returns.
const KEY = 'kivilo:error-reports'

const pendingReports = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '[]').length, KEY)

const nextReport = (page: Page, message: string) =>
  page.waitForResponse((response) => new URL(response.url()).pathname === '/api/v1/errors' &&
    response.request().postDataJSON().errors.some((error: { message: string }) => error.message === message))

test('error reports reach the server, and wait out a lost connection', async ({ page, context }) => {
  await signIn(page, freshEmail('errors'))
  const tag = `e2e-${Date.now().toString(36)}`

  await page.evaluate(({ key, message }) => localStorage.setItem(key, JSON.stringify([{
    id: crypto.randomUUID(), context: 'window', name: 'TypeError', message, stack: null,
    path: '/inspections', release: null, occurredAt: new Date().toISOString(),
  }])), { key: KEY, message: `left over ${tag}` })
  let posted = nextReport(page, `left over ${tag}`)
  await page.reload()
  expect([0, 1]).toContain((await (await posted).json()).recorded)
  await expect.poll(() => pendingReports(page)).toBe(0)

  posted = nextReport(page, `uncaught ${tag}`)
  await page.evaluate((message) => { setTimeout(() => { throw new Error(message) }) }, `uncaught ${tag}`)
  const response = await posted
  // Page-load and online flushes can overlap. A confirmed replay records zero
  // additional rows; it is the same successful delivery, not a missing report.
  expect([0, 1]).toContain((await response.json()).recorded)
  expect(response.request().postDataJSON().errors).toEqual([expect.objectContaining({
    context: 'window', name: 'Error', message: `uncaught ${tag}`, path: '/inspections',
  })])

  await context.setOffline(true)
  await page.evaluate((message) => { void Promise.reject(new Error(message)) }, `offline ${tag}`)
  await expect.poll(() => pendingReports(page)).toBe(1)

  posted = nextReport(page, `offline ${tag}`)
  await context.setOffline(false)
  expect([0, 1]).toContain((await (await posted).json()).recorded)
  await expect.poll(() => pendingReports(page)).toBe(0)
})

/// The app has no cookie, only its access token, exactly as for every other /api/v1 call.
test('the app reports through its bearer, and nobody reports without one', async ({ request }) => {
  const report = {
    id: crypto.randomUUID(), context: 'caught', name: 'StateError', message: `app e2e-${Date.now()}`,
    stack: null, path: null, release: '1.0.0+22 patch 12', occurredAt: new Date().toISOString(),
  }
  const anonymous = await request.post('/api/v1/errors', { data: { source: 'ANDROID', errors: [report] } })
  expect(anonymous.status()).toBe(401)

  const token = await accessTokenFor(freshEmail('app-errors'))
  const posted = await request.post('/api/v1/errors', {
    headers: { authorization: `Bearer ${token}` },
    data: { source: 'ANDROID', errors: [report] },
  })
  expect(await posted.json()).toEqual({ recorded: 1 })
})
