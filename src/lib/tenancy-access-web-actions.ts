'use server'

import { ZodError } from 'zod'
import { addTenancyCollaborator, removeTenancyCollaborator } from '@/lib/tenancy-access-actions'
import { AgencyActionError } from '@/lib/agency-errors'
import { currentStakeholder } from '@/lib/auth'
import { messages } from '@/lib/i18n'
import { requestLocale } from '@/lib/i18n/request'
import { refusalText } from '@/lib/i18n/refusals'

// Expected failures travel as data: production server actions redact thrown error
// messages. Unexpected failures still throw so the server records them normally.
async function expectedAccessError(error: unknown): Promise<string> {
  const m = messages(await requestLocale(await currentStakeholder()))
  if (error instanceof AgencyActionError) return refusalText(error.message, m)
  if (error instanceof ZodError) return error.issues.map((issue) => issue.message).join(' ')
  if (error instanceof Error && error.message === 'Tenancy not found') {
    return m.pwa.noLongerAvailableTenancy
  }
  throw error
}

export async function addTenancyCollaboratorFromWeb(tenancyId: string, email: string) {
  try {
    return { ok: true as const, access: await addTenancyCollaborator(tenancyId, email) }
  } catch (error) {
    return { ok: false as const, error: await expectedAccessError(error) }
  }
}

export async function removeTenancyCollaboratorFromWeb(tenancyId: string, stakeholderId: string) {
  try {
    return { ok: true as const, access: await removeTenancyCollaborator(tenancyId, stakeholderId) }
  } catch (error) {
    return { ok: false as const, error: await expectedAccessError(error) }
  }
}
