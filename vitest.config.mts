import { defineConfig } from 'vitest/config'
import path from 'node:path'

/// The default suite is hermetic and fast, so it can run anywhere. Integration tests
/// talk to the local Postgres and are opted into with `pnpm test:integration`, which
/// keeps a missing Supabase stack from looking like a broken build.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['**/*.integration.test.ts', '**/node_modules/**'],
  },
})
