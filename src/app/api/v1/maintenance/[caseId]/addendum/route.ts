import { addendumFromMaintenanceCase } from '@/lib/addendum-actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

/// "Add to the report as an update" on a resolved repair: prefills an entry on the draft
/// update to the tenancy's signed check-in, which the agent finishes and publishes.
export const POST = authed(async (_agent, { caseId }: { caseId: string }) => addendumFromMaintenanceCase(caseId))
