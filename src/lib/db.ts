import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Bounded, because Fluid Compute keeps instances warm and each one holds its own
    // pool. Left at the pg default of 10, a couple of warm instances can take every
    // client slot the pooler will hand out and the next render has nothing to connect on.
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 5 }),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
