import { defineConfig, devices } from '@playwright/test'
import 'dotenv/config'

/// End-to-end suite against the local Supabase stack. `pnpm test:e2e` starts the dev
/// server itself, on its own port so a `pnpm dev` already running is left alone.
/// Extraction is faked (see `fakeExtraction` in src/lib/inspection/extract.ts) so a
/// run costs nothing and finishes in under a minute; everything else, including the
/// six digit code sign-in and the upload to storage, is the real path.
const PORT = 3111

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    ...devices['Pixel 7'],
  },
  webServer: {
    command: `pnpm exec next dev --port ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { KIVILO_FAKE_EXTRACTION: '1' },
  },
})
