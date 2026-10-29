'use server'

import { revalidatePath } from 'next/cache'
import { requireStakeholder } from '@/lib/auth'
import { CddInputError, submitOwnParticulars } from '@/lib/cdd/cases'
import { individualParticulars } from '@/lib/cdd/input'

/// The client sends their own particulars. The client is the signed-in person, never an id
/// from the request. A fixable mistake comes back as a message; anything else throws.
export async function sendOwnParticulars(caseId: string, raw: unknown): Promise<{ error?: string }> {
  const client = await requireStakeholder()
  const parsed = individualParticulars.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form and try again' }
  try {
    await submitOwnParticulars(caseId, client.id, { ...parsed.data, kind: 'INDIVIDUAL' })
  } catch (error) {
    if (error instanceof CddInputError) return { error: error.message }
    throw error
  }
  revalidatePath(`/cdd/${caseId}`)
  return {}
}
