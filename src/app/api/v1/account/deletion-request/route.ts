import { authed } from '@/lib/api/route'
import { db } from '@/lib/db'
import { requestAccountDeletion } from '@/lib/account-actions'

export const dynamic = 'force-dynamic'

const serialise = (request: Awaited<ReturnType<typeof requestAccountDeletion>> | null) => ({
  request: request && {
    id: request.id,
    status: request.status,
    requestedAt: request.requestedAt,
    dueAt: request.dueAt,
    completedAt: request.completedAt,
    notificationSentAt: request.notificationSentAt,
  },
})

export const GET = authed(async (agent) =>
  serialise(await db.accountDeletionRequest.findUnique({ where: { stakeholderId: agent.id } })),
)

export const POST = authed(async () => serialise(await requestAccountDeletion()))
