import { recordedAmount } from '@/lib/tenancy-amounts'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireAgent, authorizeAgentTenancy, authorizeLeadTenancy } from '@/lib/auth'
import { propertyLabel } from '@/lib/format'
import { currency } from '@/lib/country'
import { RenewalForm } from '@/components/renewal-form'
import { tenancyAccess } from '@/lib/tenancy-access'
import { messages } from '@/lib/i18n'
import { requestLocale } from '@/lib/i18n/request'

export const dynamic = 'force-dynamic'

export default async function RenewalPage({ params }: PageProps<'/renewals/[tenancyId]'>) {
  const agent = await requireAgent()
  const w = messages(await requestLocale(agent)).pwa
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

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/inspections" className="text-link inline-flex min-h-11 items-center text-sm">{w.allInspections}</Link>
      <h1 className="mt-3 text-2xl font-semibold">{w.renewTenancy}</h1>
      <p className="mt-2 text-sm">{propertyLabel(tenancy.property)}</p>
      <p className="mt-1 text-sm text-gray-500">{tenancy.landlord.name} · {tenancy.tenant.name}</p>
      <RenewalForm
        tenancyId={tenancy.id}
        startDate={start.toISOString().slice(0, 10)}
        monthlyRent={recordedAmount(tenancy.monthlyRent, tenancy.monthlyRentEntered) ?? ''}
        deposit={recordedAmount(tenancy.deposit, tenancy.depositEntered) ?? ''}
        currency={currency(tenancy.property.country)}
        collaboratorNames={access.collaborators.map((collaborator) => collaborator.name)}
      />
    </div>
  )
}
