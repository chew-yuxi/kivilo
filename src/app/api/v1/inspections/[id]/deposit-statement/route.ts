import { z } from 'zod'
import { answerDepositStatement, answerDepositStatementInPerson } from '@/lib/statement-actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

/// Answers the deposit statement: `{ version, answer: 'AGREED' }`, or `'DISPUTED'` with a
/// `reason`. With no `stakeholderId` the party is whoever holds the token. With one, it
/// is a party answering on the agent's phone; the data layer checks they belong to the
/// tenancy, and anyone else is the same 404 as a missing statement. A revision published
/// since the version named, or a second answer, is 409 `statement_changed`.
const party = z.object({ stakeholderId: z.string().min(1).optional() }).passthrough()

export const POST = authed(async (_caller, { id }: { id: string }, request) => {
  const { stakeholderId, ...answer } = party.parse(await request.json())
  if (stakeholderId === undefined) await answerDepositStatement(id, answer)
  else await answerDepositStatementInPerson(id, stakeholderId, answer)
  return { ok: true }
})
