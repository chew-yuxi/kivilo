import { authed } from '@/lib/api/route'
import { signedReport } from '@/lib/report'

export const dynamic = 'force-dynamic'

/// The signed report, read-only, for the landlord and tenant as well as the agent. The
/// working inspection at /inspections/[id] stays agent-only: it carries draft findings.
export const GET = authed(async (stakeholder, { id }: { id: string }) => signedReport(id, stakeholder.id))
