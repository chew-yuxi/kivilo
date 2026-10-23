'use server'

import { ZodError } from 'zod'
import { AgencyActionError } from '@/lib/agency-errors'
import { currentStakeholder } from '@/lib/auth'
import { messages } from '@/lib/i18n'
import { requestLocale } from '@/lib/i18n/request'
import { refusalText } from '@/lib/i18n/refusals'
import {
  createAgency,
  renameAgency,
  inviteAgencyMember,
  changeAgencyMember,
  respondAgencyInvitation,
  assignTenancy,
} from '@/lib/agency-actions'

type AgencyCommand =
  | { action: 'create'; name: string }
  | { action: 'rename'; agencyId: string; name: string }
  | { action: 'invite'; agencyId: string; email: string; role: 'MANAGER' | 'AGENT' }
  | {
      action: 'member'
      agencyId: string
      memberId: string
      change: Parameters<typeof changeAgencyMember>[2]
    }
  | { action: 'respond'; agencyId: string; memberId: string; response: 'accept' | 'decline' }
  | { action: 'assign'; tenancyId: string; assignment: Parameters<typeof assignTenancy>[1] }

export async function manageAgencyFromWeb(command: AgencyCommand) {
  try {
    switch (command.action) {
      case 'create':
        return { ok: true as const, agencyId: (await createAgency(command.name)).id }
      case 'rename':
        await renameAgency(command.agencyId, command.name)
        break
      case 'invite':
        await inviteAgencyMember(command.agencyId, { email: command.email, role: command.role })
        break
      case 'member': {
        const result = await changeAgencyMember(command.agencyId, command.memberId, command.change)
        if ('removed' in result && result.removed)
          return { ok: true as const, removed: true as const }
        break
      }
      case 'respond':
        await respondAgencyInvitation(command.agencyId, command.memberId, command.response)
        break
      case 'assign': {
        const result = await assignTenancy(command.tenancyId, command.assignment)
        if ('accessRemoved' in result && result.accessRemoved)
          return { ok: true as const, accessRemoved: true as const }
        break
      }
    }
    return { ok: true as const }
  } catch (error) {
    const m = messages(await requestLocale(await currentStakeholder()))
    if (error instanceof AgencyActionError) return { ok: false as const, error: refusalText(error.message, m) }
    if (error instanceof ZodError)
      return { ok: false as const, error: error.issues.map((issue) => issue.message).join(' ') }
    if (error instanceof Error && /not found/i.test(error.message)) {
      return {
        ok: false as const,
        error: m.pwa.noLongerAvailableWork,
      }
    }
    throw error
  }
}
