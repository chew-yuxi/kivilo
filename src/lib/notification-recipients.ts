import type { Prisma } from '@/generated/prisma'
import { notificationScope } from '@/lib/auth'

/// Recheck a queued notification at delivery time. A removed collaborator or expired
/// agent assignment must not receive private details saved while access still existed.
export async function notificationCanBeDelivered(
  client: Pick<Prisma.TransactionClient, 'notification'>,
  notification: { id: string; recipientId: string },
) {
  const scope = notificationScope(notification.recipientId)
  const visible = await client.notification.findFirst({
    where: { id: notification.id, AND: [scope] },
    select: { id: true },
  })
  if (visible) return true
  // Guard deletion too: access could have been restored since the read above.
  await client.notification.deleteMany({ where: { id: notification.id, NOT: scope } })
  return false
}

/// Account deletion removes the sign-in identity before the shared tenancy record.
/// Do not rebuild a private notification inbox for that retained stakeholder.
export async function activeNotificationRecipients(
  client: Pick<Prisma.TransactionClient, 'accountDeletionRequest'>,
  ids: string[],
) {
  const unique = [...new Set(ids)]
  if (unique.length === 0) return []
  const deleting = await client.accountDeletionRequest.findMany({
    where: {
      stakeholderId: { in: unique },
      status: { in: ['PROCESSING', 'COMPLETED'] },
    },
    select: { stakeholderId: true },
  })
  const excluded = new Set(deleting.map((request) => request.stakeholderId))
  return unique.filter((id) => !excluded.has(id))
}
