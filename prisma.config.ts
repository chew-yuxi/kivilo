import 'dotenv/config'
import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Migrations take advisory locks, which a transaction-mode pooler cannot hold.
    // Production sets DIRECT_URL to a session connection for exactly this; locally
    // there is only the one Postgres and DATABASE_URL is it.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
})
