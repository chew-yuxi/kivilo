'use server'

import { ZodError } from 'zod'
import { addTenancyCollaborator, removeTenancyCollaborator } from '@/lib/tenancy-access-actions'

// Expected failures travel as data: production server actions redact thrown error
// messages. Unexpected failures still throw so the server records them normally.
function expectedAccessError(error: unknown): string {
  if (error instanceof ZodError) return error.issues.map((issue) => issue.message).join(' ')
  if (error instanceof Error && error.message === 'Tenancy not found') {
    return 'This tenancy is no longer available. Refresh the page to continue.'
  }
  throw error
}

export async function addTenancyCollaboratorFromWeb(tenancyId: string, email: string) {
  try {
    return { ok: true as const, access: await addTenancyCollaborator(tenancyId, email) }
  } catch (error) {
    return { ok: false as const, error: expectedAccessError(error) }
  }
}

export async function removeTenancyCollaboratorFromWeb(tenancyId: string, stakeholderId: string) {
  try {
    return { ok: true as const, access: await removeTenancyCollaborator(tenancyId, stakeholderId) }
  } catch (error) {
    return { ok: false as const, error: expectedAccessError(error) }
  }
}
