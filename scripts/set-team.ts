import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma'

/// Puts an agent on a team, or takes them off one with an empty --team. The agent is found
/// by email, or created unclaimed so their first sign-in claims them already on the team.
const values = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, ...rest] = argument.replace(/^--/, '').split('=')
    return [key, rest.join('=')]
  }),
)

const email = values.get('email')?.trim().toLowerCase()
const team = values.get('team')?.trim()
if (!email || team === undefined) {
  throw new Error('Usage: pnpm team:set --email=agent@example.com --team="Team name" (--team= to leave)')
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

async function main(email: string, team: string) {
  const joining = { connectOrCreate: { where: { name: team }, create: { name: team } } }
  const agent = await db.stakeholder.upsert({
    where: { email },
    create: { name: email.split('@')[0], email, ...(team && { team: joining }) },
    update: { team: team ? joining : { disconnect: true } },
    include: { team: { include: { members: { select: { email: true } } } } },
  })
  console.log(agent.team
    ? `${email} is on ${agent.team.name}: ${agent.team.members.map((member) => member.email).join(', ')}`
    : `${email} is on no team`)
}

main(email, team)
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => db.$disconnect())
