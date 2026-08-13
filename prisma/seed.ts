import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma'

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

async function main() {
  const landlord = await db.stakeholder.create({
    data: { name: 'Tan Wei Ming', idNumber: 'S8123456A', email: 'weiming.tan@example.com' },
  })
  const tenant = await db.stakeholder.create({
    data: { name: 'Priya Raman', idNumber: 'G4567890T', email: 'priya.raman@example.com' },
  })
  const agent = await db.stakeholder.create({
    data: { name: 'Jocelyn Ng', idNumber: 'S9012345B', email: 'jocelyn@example.com' },
  })

  const property = await db.property.create({
    data: {
      line1: 'The Sail @ Marina Bay, 2 Marina Boulevard',
      unit: '#28-05',
      postalCode: '018987',
      type: 'PRIVATE_NON_LANDED',
    },
  })

  const tenancy = await db.tenancy.create({
    data: {
      propertyId: property.id,
      landlordId: landlord.id,
      tenantId: tenant.id,
      agentId: agent.id,
      startDate: new Date('2024-09-01'),
      endDate: new Date('2026-08-31'),
      monthlyRent: '6800.00',
      deposit: '13600.00',
    },
  })

  await db.inspection.create({
    data: { tenancyId: tenancy.id, kind: 'CHECK_IN', status: 'DRAFT', conductedById: agent.id },
  })

  console.log(`Seeded tenancy ${tenancy.id} at ${property.unit} ${property.line1}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
