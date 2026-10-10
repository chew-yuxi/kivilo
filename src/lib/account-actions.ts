'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'

/// A deletion request is recorded before any operator touches data. Signed tenancy
/// records may also belong to other people, so fulfillment follows the published
/// retention policy rather than a cascading delete from the requesting account.
export async function requestAccountDeletion() {
  const agent = await requireAgent()
  const existing = await db.accountDeletionRequest.findUnique({
    where: { stakeholderId: agent.id },
  })
  if (existing) return existing

  const dueAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const request = await db.accountDeletionRequest.upsert({
    where: { stakeholderId: agent.id },
    update: {},
    create: { stakeholderId: agent.id, email: agent.email, dueAt },
  })
  revalidatePath('/delete-account')
  return request
}
