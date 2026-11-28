import { en } from './en'
import type { Messages } from './en'

const REFUSALS = [
  'agencyErrPartyAsAgent',
  'agencyErrAlreadyInTeam',
  'agencyErrInvitationPending',
  'agencyErrChooseLead',
  'agencyErrChooseTeam',
  'agencyErrChooseActive',
  'agencyErrChooseSuccessor',
  'agencyErrLastOwner',
  'agencyErrOwnerDeletion',
  'agencyErrOwnerOnly',
  'agencyErrLeadIsParty',
  'agencyErrInvitationExpired',
  'agencyErrAlreadyJoined',
  'agencyErrTeamWideAccess',
  'agencyErrAlreadyMember',
  'agencyErrMustAccept',
  'agencyErrTeamChanged',
  'agencyErrUseRemove',
  'agencyErrWaitAccept',
  'noLongerAvailableTenancy',
  'noLongerAvailableWork',
] as const

/// Team refusals are thrown as English sentences with no code. The web actions hand
/// them back in the agent's language; one this list does not know stays as written.
export function refusalText(message: string, m: Messages) {
  const key = REFUSALS.find((candidate) => en.pwa[candidate] === message)
  return key ? m.pwa[key] : message
}
