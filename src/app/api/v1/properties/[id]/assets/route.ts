import { authed } from '@/lib/api/route'
import { createPropertyAsset, listPropertyAssets } from '@/lib/maintenance'

export const dynamic = 'force-dynamic'

export const GET = authed(async (stakeholder, { id }: { id: string }) =>
  listPropertyAssets(id, stakeholder.id))

export const POST = authed(async (stakeholder, { id }: { id: string }, request) =>
  createPropertyAsset(id, stakeholder.id, await request.json()))
