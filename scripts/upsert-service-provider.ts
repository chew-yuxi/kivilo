import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma'

const values = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, ...rest] = argument.replace(/^--/, '').split('=')
    return [key, rest.join('=')]
  }),
)

const name = values.get('name')?.trim()
const category = values.get('category')?.trim().toUpperCase()
const phone = values.get('phone')?.trim()
const serviceAreas = values.get('areas')?.split(',').map((area) => area.trim()).filter(Boolean)
if (!name || !phone || !serviceAreas?.length || !['PLUMBING', 'LOCKSMITH'].includes(category ?? '')) {
  throw new Error('Usage: pnpm provider:upsert --name=... --category=PLUMBING|LOCKSMITH --phone=... --areas=ALL|01,02 [--whatsapp=...] [--hours=...]')
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

try {
  const provider = await db.serviceProvider.upsert({
    where: {
      category_phone: {
        category: category as 'PLUMBING' | 'LOCKSMITH',
        phone,
      },
    },
    create: {
      name,
      category: category as 'PLUMBING' | 'LOCKSMITH',
      phone,
      whatsapp: values.get('whatsapp')?.trim() || null,
      serviceAreas,
      hours: values.get('hours')?.trim() || null,
      lastVerifiedAt: new Date(),
    },
    update: {
      name,
      whatsapp: values.get('whatsapp')?.trim() || null,
      serviceAreas,
      hours: values.get('hours')?.trim() || null,
      lastVerifiedAt: new Date(),
      active: true,
    },
  })
  console.log(`Upserted ${provider.category.toLowerCase()} provider ${provider.name}`)
} finally {
  await db.$disconnect()
}
