import { defineConfig } from 'vitest/config'
import path from 'node:path'
import 'dotenv/config'

/// Requires the local Supabase stack (`supabase start`). Runs serially: the tests
/// share one database, and a parallel writer would make the isolation assertions
/// meaningless.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
  },
})
