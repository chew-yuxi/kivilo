import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma'

/// Comps a workspace onto Pro, or takes a comp away with --plan=free. The workspace is the
/// agent's team when they are on one, so comping one agent of a team comps all of it.
/// For pilot agents, our own accounts and the store reviewers, who must never meet a
/// limit mid-review. A plan someone pays for is Stripe's, and this refuses to touch it.
const values = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, ...rest] = argument.replace(/^--/, '').split('=')
    return [key, rest.join('=')]
  }),
)

const email = values.get('email')?.trim().toLowerCase()
const plan = values.get('plan')
const seats = Number(values.get('seats') ?? '1')
if (!email || (plan !== 'pro' && plan !== 'free') || !Number.isInteger(seats) || seats < 1) {
  throw new Error('Usage: pnpm plan:set --email=agent@example.com --plan=pro|free [--seats=N]')
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

async function main(email: string, plan: 'pro' | 'free', seats: number) {
  const agent = await db.stakeholder.findUniqueOrThrow({ where: { email } })
  const where = agent.teamId ? { teamId: agent.teamId } : { stakeholderId: agent.id }
  const workspace = agent.teamId ? `team ${agent.teamId}` : email

  const existing = await db.subscription.findUnique({ where })
  if (existing?.googlePlayPurchaseId) {
    throw new Error(`${workspace} has a Google Play purchase; change it in Google Play`)
  }
  if (existing?.stripeSubscriptionId) {
    throw new Error(`${workspace} pays through Stripe (${existing.stripeSubscriptionId}); change it there`)
  }

  if (plan === 'free') {
    await db.subscription.deleteMany({ where })
    console.log(`${workspace} is on Free`)
    return
  }
  await db.subscription.upsert({
    where,
    create: { ...where, plan: 'PRO', seats, status: 'comped', managedById: agent.id },
    update: { plan: 'PRO', seats, status: 'comped' },
  })
  console.log(`${workspace} is on Pro, comped, ${seats} ${seats === 1 ? 'seat' : 'seats'}`)
}

main(email, plan, seats)
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => db.$disconnect())
