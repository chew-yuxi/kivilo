import { notFound } from 'next/navigation'
import { requireAgent } from '@/lib/auth'
import { propertyManagement } from '@/lib/property-management'
import { PropertySettings } from '@/components/property-settings'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Property settings' }

export default async function PropertySettingsPage({
  params,
}: PageProps<'/properties/[id]/settings'>) {
  const agent = await requireAgent()
  const { id } = await params
  let property
  try {
    property = await propertyManagement(id, agent.id)
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) notFound()
    throw error
  }
  return <PropertySettings property={property} />
}
