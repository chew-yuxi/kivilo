'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { TenancyAccess } from '@/lib/tenancy-access'
import { LockedAction } from '@/components/locked-action'
import type { agencyList, agencyDetail } from '@/lib/agency'
import { manageAgencyFromWeb } from '@/lib/agency-web-actions'
import { usePwa } from '@/components/locale'

type Agency = Awaited<ReturnType<typeof agencyList>>['agencies'][number]

export function TenancyAssignmentPanel({
  access,
  agencies,
}: {
  access: TenancyAccess
  agencies: Agency[]
}) {
  const w = usePwa()
  const router = useRouter()
  const [agencyId, setAgencyId] = useState(access.agency?.id ?? '')
  const [members, setMembers] = useState(access.availableMembers)
  const [memberIds, setMemberIds] = useState(
    access.collaborators.map((person) => person.stakeholderId),
  )
  const [leadAgentId, setLeadAgentId] = useState(access.leadAgent?.id ?? '')
  const [moving, setMoving] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  function chooseAgency(id: string) {
    setAgencyId(id)
    setMoving(false)
    setError(null)
    setMembers([])
    if (!id) return
    startTransition(async () => {
      try {
        const response = await fetch(`/api/v1/agencies/${id}`)
        if (!response.ok) throw new Error('Team unavailable')
        const detail = (await response.json()) as Awaited<ReturnType<typeof agencyDetail>>
        setMembers(
          detail.members
            .filter((member) => member.status === 'ACTIVE')
            .map((member) => ({
              stakeholderId: member.stakeholderId,
              name: member.name,
              email: member.email,
            })),
        )
        setMemberIds([])
      } catch {
        setAgencyId('')
        setError(w.loadMembersFailed)
      }
    })
  }

  return (
    <details
      className="rounded-lg border border-gray-200 bg-white"
      data-testid="tenancy-assignment"
    >
      <summary className="flex items-center justify-between gap-3 px-4 py-3">
        <span>
          <span className="block text-sm font-medium">{w.teamAndAssignment}</span>
          <span className="mt-1 block text-sm text-gray-600">
            {access.agency?.name ?? w.personalTenancy} ·{' '}
            {access.leadAgent?.name ?? w.noResponsibleAgent}
          </span>
        </span>
        <span className="action-secondary px-3 text-xs">
          {access.canManageAssignment ? w.manageAssignment : w.viewAssignment}
        </span>
      </summary>
      <div className="space-y-4 border-t border-gray-200 p-4">
        {access.agency && (
          <p className="text-sm text-gray-600">
            {w.belongsToBefore}{' '}
            {access.agency.role ? (
              <Link className="text-link" href={`/team/${access.agency.id}`}>
                {access.agency.name}
              </Link>
            ) : (
              <span className="font-medium">{access.agency.name}</span>
            )}
            {w.belongsToAfter}
          </p>
        )}
        {!access.agency && (
          <p className="text-sm text-gray-600">
            {w.personalWork}
          </p>
        )}
        {access.canManageAssignment ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (!access.agency && !moving) {
                setMoving(true)
                return
              }
              setError(null)
              setNotice(null)
              startTransition(async () => {
                try {
                  const result = await manageAgencyFromWeb({
                    action: 'assign',
                    tenancyId: access.tenancyId,
                    assignment: {
                      ...(!access.agency ? { agencyId } : {}),
                      leadAgentId,
                      memberIds: memberIds.filter(
                        (id) =>
                          id !== leadAgentId &&
                          members.some((member) => member.stakeholderId === id),
                      ),
                    },
                  })
                  if (!result.ok) {
                    setError(result.error)
                    return
                  }
                  if ('accessRemoved' in result && result.accessRemoved) {
                    // A full load clears the router's copies of work just handed over.
                    window.location.replace('/inspections')
                    return
                  }
                  router.refresh()
                  setMoving(false)
                  setNotice(w.assignmentSaved)
                } catch {
                  setError(w.saveAssignmentFailed)
                }
              })
            }}
          >
            {!access.agency && (
              <label className="block text-sm font-medium">
                {w.moveToTeamLabel}
                <select
                  className="field mt-1"
                  value={agencyId}
                  onChange={(event) => chooseAgency(event.target.value)}
                  disabled={pending}
                  required
                >
                  <option value="">{w.chooseTeam}</option>
                  {agencies.map((agency) => (
                    <option key={agency.id} value={agency.id}>
                      {agency.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {agencyId && members.length > 0 && (
              <>
                <label className="block text-sm font-medium">
                  {w.responsibleAgent}
                  <select
                    className="field mt-1"
                    value={leadAgentId}
                    onChange={(event) => setLeadAgentId(event.target.value)}
                    disabled={pending}
                    required
                  >
                    {members.map((member) => (
                      <option key={member.stakeholderId} value={member.stakeholderId}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </label>
                {leadAgentId !== access.leadAgent?.id && (
                  <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                    {w.previousAgentNote}
                  </p>
                )}
                <fieldset className="space-y-2">
                  <legend className="mb-2 text-sm font-medium">{w.assignColleagues}</legend>
                  {members
                    .filter((member) => member.stakeholderId !== leadAgentId)
                    .map((member) => (
                      <label
                        className="flex min-h-11 items-center gap-3 rounded-md border border-gray-200 px-3 py-2 text-sm"
                        key={member.stakeholderId}
                      >
                        <input
                          type="checkbox"
                          className="size-5 accent-brand-600"
                          disabled={pending}
                          checked={memberIds.includes(member.stakeholderId)}
                          onChange={(event) =>
                            setMemberIds(
                              event.target.checked
                                ? [...memberIds, member.stakeholderId]
                                : memberIds.filter((id) => id !== member.stakeholderId),
                            )
                          }
                        />
                        <span>
                          {member.name}
                          <span className="ml-2 text-xs text-gray-500">{member.email}</span>
                        </span>
                      </label>
                    ))}
                </fieldset>
              </>
            )}
            {!agencies.length && !access.agency && (
              <Link className="action-secondary" href="/team">
                {w.createOrJoinTeam}
              </Link>
            )}
            {moving && (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {w.moveConfirm(agencies.find((agency) => agency.id === agencyId)?.name ?? '')}
              </p>
            )}
            {agencyId && (
              <div className="action-group">
                <button className="action-primary" disabled={pending || !members.length}>
                  {pending
                    ? w.saving
                    : access.agency
                      ? w.saveAssignment
                      : moving
                        ? w.confirmMove
                        : w.moveToTeamLabel}
                </button>
                {moving && (
                  <button
                    className="action-secondary"
                    type="button"
                    disabled={pending}
                    onClick={() => setMoving(false)}
                  >
                    {w.cancel}
                  </button>
                )}
              </div>
            )}
          </form>
        ) : (
          <LockedAction
            label={access.agency ? 'Change assignment' : 'Move to team'}
            who={w.theResponsibleAgentOrATeamOwner}
            askNames={access.askNames}
          />
        )}
        {error && (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="text-sm text-brand-700" role="status">
            {notice}
          </p>
        )}
      </div>
    </details>
  )
}
