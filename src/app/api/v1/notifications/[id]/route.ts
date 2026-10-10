import { authed } from '@/lib/api/route'
import { markNotificationRead } from '@/lib/maintenance'

export const PATCH = authed(async (stakeholder, { id }: { id: string }) => {
  await markNotificationRead(id, stakeholder.id)
  return { ok: true }
})
