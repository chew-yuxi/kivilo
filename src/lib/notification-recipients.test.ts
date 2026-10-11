import { describe, expect, it, vi } from 'vitest'
import type { Prisma } from '@/generated/prisma'
import { activeNotificationRecipients } from '@/lib/notification-recipients'

describe('notification recipients after account deletion', () => {
  it('keeps active recipients but excludes processing and completed deletions', async () => {
    const findMany = vi.fn().mockResolvedValue([
      { stakeholderId: 'processing' },
      { stakeholderId: 'completed' },
    ])
    const client = { accountDeletionRequest: { findMany } } as unknown as
      Pick<Prisma.TransactionClient, 'accountDeletionRequest'>

    expect(await activeNotificationRecipients(client, [
      'active', 'processing', 'completed', 'active',
    ])).toEqual(['active'])
    expect(findMany).toHaveBeenCalledWith({
      where: {
        stakeholderId: { in: ['active', 'processing', 'completed'] },
        status: { in: ['PROCESSING', 'COMPLETED'] },
      },
      select: { stakeholderId: true },
    })
  })
})
