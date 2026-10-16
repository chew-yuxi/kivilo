import 'dotenv/config'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from '@/lib/db'
import { isLive } from '@/lib/plan'

/// Puts an agent on a team, or takes them off one with an empty --team. The agent is found
/// by email, or created unclaimed so their first sign-in claims them already on the team.
///
/// A plan belongs to the workspace, so an agent paying for Pro on their own would keep
/// being charged for a workspace nobody works in once they join a team. That is refused
/// until they cancel it in Manage billing and it has ended.
export async function setTeam(email: string, team: string) {
  const own = await db.subscription.findFirst({ where: { stakeholder: { email } } })
  if (team && own?.stripeSubscriptionId && isLive(own.status)) {
    throw new Error(
      `${email} pays for Pro on their own (${own.stripeSubscriptionId}); joining a team would ` +
      'leave it charging for nothing. Cancel it in Manage billing first, then retry once it has ended.',
    )
  }

  const joining = { connectOrCreate: { where: { name: team }, create: { name: team } } }
  return db.stakeholder.upsert({
    where: { email },
    create: { name: email.split('@')[0], email, ...(team && { team: joining }) },
    update: { team: team ? joining : { disconnect: true } },
    include: { team: { include: { members: { select: { email: true } } } } },
  })
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
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

  setTeam(email, team)
    .then((agent) => {
      console.log(agent.team
        ? `${email} is on ${agent.team.name}: ${agent.team.members.map((member) => member.email).join(', ')}`
        : `${email} is on no team`)
    })
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
    .finally(async () => db.$disconnect())
}
