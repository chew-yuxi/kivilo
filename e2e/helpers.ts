import { expect, type Page } from '@playwright/test'

/// Local Supabase delivers auth email to mailpit; the six digit code is read back
/// out of its API, so sign-in in the suite is the same flow an agent uses.
const MAILPIT = 'http://127.0.0.1:56324'

export function freshEmail(label: string) {
  return `e2e-${label}-${Date.now().toString(36)}@kivilo.test`
}

async function latestCodeFor(email: string): Promise<string | null> {
  const list = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)
  const { messages } = (await list.json()) as { messages: { ID: string }[] }
  if (!messages?.length) return null
  const message = await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`)
  const { Text } = (await message.json()) as { Text: string }
  return Text.match(/\b(\d{6})\b/)?.[1] ?? null
}

export async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: 'Email me a code' }).click()
  await expect(page.getByLabel('Six digit code')).toBeVisible()

  await expect.poll(() => latestCodeFor(email), { timeout: 20_000 }).not.toBeNull()
  const code = (await latestCodeFor(email))!
  await page.getByLabel('Six digit code').fill(code)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Inspections' })).toBeVisible()
}

/// The smallest files the upload path accepts. The video is not decodable, which the
/// capture sheet tolerates (duration falls back to null); the photo is a real 1x1 PNG.
export const FIXTURES = {
  video: {
    name: 'walkthrough.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.from('0000001c667479706d70343200000000', 'hex'),
  },
  photo: {
    name: 'label.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64',
    ),
  },
}

/// Draws a stroke on a signature canvas so the Sign button enables.
export async function scribble(page: Page, canvas: ReturnType<Page['locator']>) {
  await canvas.scrollIntoViewIfNeeded()
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + 20, box.y + 40)
  await page.mouse.down()
  await page.mouse.move(box.x + 120, box.y + 80, { steps: 8 })
  await page.mouse.move(box.x + 200, box.y + 50, { steps: 8 })
  await page.mouse.up()
}
