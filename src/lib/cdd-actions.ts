'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireStakeholder } from '@/lib/auth'
import { CddInputError, submitOwnParticulars } from '@/lib/cdd/cases'

/// The client's form on `/cdd/[caseId]`. Companies are handled with the agent, in person.
const ownParticulars = z.object({
  legalName: z.string().max(200),
  idType: z.enum(['NRIC', 'FIN', 'PASSPORT']),
  idNumber: z.string().max(40),
  nationality: z.string().max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter the date of birth'),
  address: z.string().max(500),
  pepDeclared: z.boolean(),
  pepDetails: z.string().max(1000).nullable().optional(),
})

/// The client sends their own particulars. The client is the signed-in person, never an id
/// from the request. A fixable mistake comes back as a message; anything else throws.
export async function sendOwnParticulars(caseId: string, raw: unknown): Promise<{ error?: string }> {
  const client = await requireStakeholder()
  const parsed = ownParticulars.safeParse(raw)
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
