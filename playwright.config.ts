import { defineConfig, devices } from '@playwright/test'
import 'dotenv/config'

/// End-to-end suite against the local Supabase stack. `pnpm test:e2e` starts the dev
/// server itself, on its own port so a `pnpm dev` already running is left alone.
/// Everything, including the six digit code sign-in and the upload to storage, is the
/// real path.
const PORT = 3111
const origin = `http://localhost:${PORT}`

for (const key of ['DATABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'] as const) {
  const url = new URL(process.env[key] ?? '')
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error(`Browser tests require a local ${key}`)
  }
}
// Override any developer delivery keys: browser tests never send external email.
const testEmail = {
  KIVILO_APP_URL: origin,
  RESEND_API_KEY: 're_kivilo_e2e',
  RESEND_BASE_URL: 'http://127.0.0.1:3112',
  RESEND_FROM_EMAIL: 'Kivilo <noreply@kivilo.test>',
  // And never spend the real PEP screening quota.
  DILISENSE_API_KEY: 'dilisense_kivilo_e2e',
  DILISENSE_BASE_URL: 'http://127.0.0.1:3113',
}
Object.assign(process.env, testEmail)

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: origin,
    trace: 'retain-on-failure',
    ...devices['Pixel 7'],
  },
  webServer: [
    {
      command: `"${process.execPath}" e2e/mailpit-resend.mjs`,
      url: 'http://127.0.0.1:3112/health',
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `"${process.execPath}" e2e/dilisense-stub.mjs`,
      url: 'http://127.0.0.1:3113/health',
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `"${process.execPath}" node_modules/next/dist/bin/next dev --port ${PORT}`,
      url: `${origin}/login`,
      env: testEmail,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
