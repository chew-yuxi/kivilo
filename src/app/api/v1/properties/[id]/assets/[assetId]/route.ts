import { authed } from '@/lib/api/route'
import { updatePropertyAsset } from '@/lib/maintenance'

export const dynamic = 'force-dynamic'

export const PATCH = authed(async (
  stakeholder,
  { id, assetId }: { id: string; assetId: string },
  request,
) => updatePropertyAsset(id, assetId, stakeholder.id, await request.json()))
