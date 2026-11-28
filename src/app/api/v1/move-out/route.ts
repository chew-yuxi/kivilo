import { withdrawWalkthroughPhoto } from '@/lib/actions'
import { z } from 'zod'
import { authed } from '@/lib/api/route'
import { moveOutVisit } from '@/lib/move-out'
import { moveOutTargets, saveTenancyMoveOut } from '@/lib/move-out-tenancies'

export const GET = authed(async (_agent, _params, req) =>
  moveOutTargets(new URL(req.url).searchParams.get('agencyId')),
)

export const POST = authed(
  async (_agent, _params, req) => {
    const data = z
      .object({ tenancyId: z.string().min(1), clientId: z.uuid(), moveOut: moveOutVisit })
      .parse(await req.json())
    return { id: await saveTenancyMoveOut(data.tenancyId, data.clientId, data.moveOut) }
  },
  { pinOwner: true },
)

export const DELETE = authed(
  async (_agent, _params, req) => {
    const { inspectionId, roomId, clientId } = z
      .object({ inspectionId: z.string(), roomId: z.string(), clientId: z.uuid() })
      .parse(await req.json())
    await withdrawWalkthroughPhoto(roomId, inspectionId, clientId)
    return { ok: true }
  },
  { pinOwner: true },
)
