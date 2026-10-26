import Link from 'next/link'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { NewInspectionForm } from '@/components/new-inspection-form'
import { requireAgent } from '@/lib/auth'
import { workspacePlan } from '@/lib/plan'
import { agencyList } from '@/lib/agency'
import { preferredWorkspace, workspaceCookieName } from '@/lib/web-workspace'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'New check-in' }

/// `createInspection` refuses past the plan's limit, and that refusal is the control.
/// This check is the explanation: a thrown server action message is hidden in a
/// production build, so the agent would otherwise fill in the whole form for nothing.
export default async function NewInspectionPage({ searchParams }: PageProps<'/inspections/new'>) {
  const agent = await requireAgent()
  const [directory, query, cookieStore] = await Promise.all([
    agencyList(agent.id), searchParams, cookies(),
  ])
  const requested = typeof query.workspace === 'string' ? query.workspace : undefined
  if (requested && requested !== 'personal' && requested !== 'all' && !directory.agencies.some((team) => team.id === requested)) notFound()
  const workspace = preferredWorkspace(requested ?? cookieStore.get(workspaceCookieName(agent.id))?.value, directory.agencies, false)

  const plans = Object.fromEntries(await Promise.all(['personal', ...directory.agencies.map((team) => team.id)].map(async (id) => {
    const { active, limit, needsMoreSeats } = await workspacePlan(agent, id === 'personal' ? null : id)
    return [id, { active, limit, needsMoreSeats }]
  })))

  return (
    <div className="mx-auto max-w-xl">
      <Link href={`/inspections?workspace=${encodeURIComponent(workspace)}`} className="text-link inline-flex min-h-11 items-center text-sm">
        ← Inspections
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">New check-in</h1>
      <p className="mt-1 text-sm text-gray-500">
        Just enough to start capturing. The landlord and tenant only need names now;
        their details can be filled in before the report is signed.
      </p>
      <NewInspectionForm key={`${agent.id}:${workspace}`} agentId={agent.id} teams={directory.agencies} initialWorkspace={workspace} rememberInitial={requested !== undefined} plans={plans} />
    </div>
  )
}
