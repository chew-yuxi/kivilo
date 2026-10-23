import { notFound } from 'next/navigation'
import { requireAgent } from '@/lib/auth'
import { propertyManagement } from '@/lib/property-management'
import { PropertySettings } from '@/components/property-settings'
import { messages } from '@/lib/i18n'
import { requestLocale } from '@/lib/i18n/request'

export const dynamic = 'force-dynamic'
export async function generateMetadata() {
  return { title: messages(await requestLocale(await requireAgent())).pwa.propertySettings }
}

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
