import { z } from 'zod'
import { deleteItem, updateItem } from '@/lib/actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

const itemChanges = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  category: z.enum(['FIXTURE', 'APPLIANCE', 'FURNITURE', 'SURFACE', 'METER']).optional(),
  condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']).optional(),
  quantity: z.number().int().positive().optional(),
  notes: z.string().max(5000).nullable().optional(),
  identifier: z.string().max(500).nullable().optional(),
  meterReading: z.string().max(500).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0)

export const PATCH = authed(
  async (_agent, { id, itemId }: { id: string; itemId: string }, request) => {
    await updateItem(itemId, id, itemChanges.parse(await request.json()))
    return { ok: true }
  },
)

export const DELETE = authed(async (_agent, { id, itemId }: { id: string; itemId: string }) => {
  await deleteItem(itemId, id)
  return { ok: true }
})
