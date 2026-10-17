import { test, expect } from '@playwright/test'
import { accessTokenFor, freshEmail, signIn } from './helpers'

test('usage ingestion authenticates, deduplicates and rejects private properties and stale owners', async ({ request }) => {
  const event = {
    id: crypto.randomUUID(), name: 'screen_viewed', properties: { screen: 'inspection' },
    occurredAt: new Date().toISOString(),
  }
  expect((await request.post('/api/v1/events', { data: { events: [event] } })).status()).toBe(401)
  const headers = { authorization: `Bearer ${await accessTokenFor(freshEmail('usage'))}` }
  expect(await (await request.post('/api/v1/events', { headers, data: { source: 'IOS', events: [event] } })).json()).toEqual({ recorded: 1 })
  expect(await (await request.post('/api/v1/events', { headers, data: { source: 'IOS', events: [event] } })).json()).toEqual({ recorded: 0 })
  expect((await request.post('/api/v1/events', {
    headers, data: { events: [{ ...event, properties: { screen: 'inspection', path: '/reports/private-token' } }] },
  })).status()).toBe(400)
  expect((await request.post('/api/v1/events', {
    headers: { ...headers, 'x-kivilo-owner': 'old-account' }, data: { events: [event] },
  })).status()).toBe(404)
})

test('web screen events contain only categories and a regular account cannot open admin', async ({ page }) => {
  const batches: unknown[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/v1/events') batches.push(request.postDataJSON())
  })
  await signIn(page, freshEmail('web-usage'))
  await expect.poll(() => batches.length).toBeGreaterThan(0)
  expect(batches[0]).toMatchObject({ source: 'WEB', events: [expect.objectContaining({ name: 'screen_viewed', properties: { screen: 'inspections' } })] })
  const denied = await page.goto('/admin')
  expect(denied?.status()).toBe(404)
})
