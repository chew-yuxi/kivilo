import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireAgent, authorizeAgentTenancy, authorizeLeadTenancy } from '@/lib/auth'
import { propertyLabel } from '@/lib/format'
import { RenewalForm } from '@/components/renewal-form'
import { tenancyAccess } from '@/lib/tenancy-access'

export const dynamic = 'force-dynamic'

export default async function RenewalPage({ params }: PageProps<'/renewals/[tenancyId]'>) {
  const agent = await requireAgent()
  const { tenancyId } = await params
  let tenancy
  try {
    await authorizeLeadTenancy(tenancyId, agent.id)
    tenancy = await authorizeAgentTenancy(tenancyId, agent.id)
  } catch (error) {
    if (error instanceof Error && error.message === 'Tenancy not found') notFound()
    throw error
  }
  if (tenancy.renewedAs) redirect(`/inspections/${tenancy.renewedAs.inspections[0].id}`)
  const access = await tenancyAccess(tenancyId, agent.id)
  const start = new Date(tenancy.endDate)
  start.setUTCDate(start.getUTCDate() + 1)
  const end = new Date(start)
  end.setUTCFullYear(end.getUTCFullYear() + 2)
  end.setUTCDate(end.getUTCDate() - 1)

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/inspections" className="text-link inline-flex min-h-11 items-center text-sm">← All inspections</Link>
      <h1 className="mt-3 text-2xl font-semibold">Renew tenancy</h1>
      <p className="mt-2 text-sm">{propertyLabel(tenancy.property)}</p>
      <p className="mt-1 text-sm text-gray-500">{tenancy.landlord.name} · {tenancy.tenant.name}</p>
      <RenewalForm
        tenancyId={tenancy.id}
        startDate={start.toISOString().slice(0, 10)}
        endDate={end.toISOString().slice(0, 10)}
        monthlyRent={tenancy.monthlyRent.toString()}
        deposit={tenancy.deposit.toString()}
        collaboratorNames={access.collaborators.map((collaborator) => collaborator.name)}
      />
    </div>
  )
}
