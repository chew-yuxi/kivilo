import { authed } from '@/lib/api/route'
import { submitParticularsInPerson } from '@/lib/cdd/cases'
import { individualParticulars } from '@/lib/cdd/input'

export const dynamic = 'force-dynamic'

/// The agent takes the particulars with the client present, having seen their ID.
export const POST = authed(async (agent, { id }: { id: string }, request) => {
  const input = individualParticulars.parse(await request.json())
  await submitParticularsInPerson(id, agent.id, { ...input, kind: 'INDIVIDUAL' })
  return { ok: true }
})
