import { startAddendum } from '@/lib/addendum-actions'
import { addendaWorkspace } from '@/lib/addenda-workspace'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

/// Updates since signing on a countersigned check-in, as the web panel shows them: the
/// published ones with their acknowledgements, the open draft, and what a change can name.
export const GET = authed(async (agent, { id }: { id: string }) => addendaWorkspace(id, agent.id))

/// Opens the draft update, or returns the one already open.
export const POST = authed(async (_agent, { id }: { id: string }) => ({ id: await startAddendum(id) }))
