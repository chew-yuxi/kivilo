import { authed } from '@/lib/api/route'
import { createMaintenanceCase, listMaintenanceCases } from '@/lib/maintenance'

export const dynamic = 'force-dynamic'

export const GET = authed(async (stakeholder, { id }: { id: string }) =>
  listMaintenanceCases(id, stakeholder.id))

export const POST = authed(async (stakeholder, { id }: { id: string }, request) =>
  createMaintenanceCase(id, stakeholder.id, await request.json()))
