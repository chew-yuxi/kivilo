import type { Prisma } from '@/generated/prisma'

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
