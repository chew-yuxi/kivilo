'use client'

import { useLocale, usePwa } from '@/components/locale'
import { formatDate, messages, type Messages } from '@/lib/i18n'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { agencyDetail, agencyList } from '@/lib/agency'
import { manageAgencyFromWeb } from '@/lib/agency-web-actions'
import { StatusBadge } from '@/components/status-badge'
import { LockedAction } from '@/components/locked-action'

/// The people an agent can ask: the team's active owners and managers.
const teamManagers = (workspace: { members: { stakeholderId: string; name: string; role: string; status: string }[] }, viewerId: string, ownersOnly = false) =>
  workspace.members
    .filter((member) => member.status === 'ACTIVE' && (ownersOnly ? member.role === 'OWNER' : member.role !== 'AGENT') && member.stakeholderId !== viewerId)
    .map((member) => member.name)

type Directory = Awaited<ReturnType<typeof agencyList>>
type Workspace = Awaited<ReturnType<typeof agencyDetail>>
type Command = Parameters<typeof manageAgencyFromWeb>[0]
const date = (m: Messages, value: Date | string) =>
  formatDate(m, new Date(value), { dateStyle: 'medium' })

function useTeamMutation() {
  const w = usePwa()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  function run(command: Command, success: string, done?: () => void) {
    if (pending) return
    setError(null)
    setNotice(null)
    startTransition(async () => {
      try {
        const result = await manageAgencyFromWeb(command)
        if (!result.ok) {
          setError(result.error)
          return
        }
        if ('agencyId' in result && result.agencyId) router.push(`/team/${result.agencyId}`)
        if (command.action === 'respond' && command.response === 'accept') {
          router.push(`/inspections?workspace=${encodeURIComponent(command.agencyId)}`)
        }
        if ('removed' in result && result.removed) {
          // Access changed: discard prefetched pages from the former membership.
          window.location.replace('/team')
          return
        }
        router.refresh()
        setNotice(success)
        done?.()
      } catch {
        setError(w.saveChangeFailed)
      }
    })
  }
  return {
    pending,
    run,
    feedback: (
      <>
        {error && (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-md bg-brand-50 p-3 text-sm text-brand-700">
            {notice}
          </p>
        )}
      </>
    ),
  }
}

export function TeamDirectory({ data }: { data: Directory }) {
  const w = usePwa()
  const m = messages(useLocale())
  const mutation = useTeamMutation()
  const [name, setName] = useState('')
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{w.team}</h1>
        <p className="mt-2 text-sm text-gray-600">
          {w.teamIntro}
        </p>
      </div>
      {mutation.feedback}
      {data.invitations.length > 0 && (
        <section className="space-y-3" aria-label={w.yourInvitations}>
          <h2 className="text-lg font-semibold">{w.yourInvitations}</h2>
          {data.invitations.map((invite) => (
            <div key={invite.id} className="rounded-lg border border-brand-200 bg-brand-50 p-4">
              <h3 className="font-medium">{invite.agencyName}</h3>
              <p className="mt-1 text-sm">
                {w.invitedAs(w.roleName(invite.role), date(m, invite.expiresAt))}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                {w.joiningNote}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  className="action-primary"
                  disabled={mutation.pending}
                  onClick={() =>
                    mutation.run(
                      {
                        action: 'respond',
                        agencyId: invite.agencyId,
                        memberId: invite.id,
                        response: 'accept',
                      },
                      w.invitationAccepted,
                    )
                  }
                >
                  {w.acceptInvitation}
                </button>
                <button
                  className="action-secondary"
                  disabled={mutation.pending}
                  onClick={() =>
                    mutation.run(
                      {
                        action: 'respond',
                        agencyId: invite.agencyId,
                        memberId: invite.id,
                        response: 'decline',
                      },
                      w.invitationDeclined,
                    )
                  }
                >
                  {w.decline}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
      <section className="space-y-3" aria-label={w.yourTeams}>
        <h2 className="text-lg font-semibold">{w.yourTeams}</h2>
        {data.agencies.length ? (
          data.agencies.map((agency) => (
            <Link href={`/team/${agency.id}`} key={agency.id} className="nav-row">
              <span>
                <span className="block">{agency.name}</span>
                <span className="mt-1 block text-xs font-normal text-gray-600">
                  {w.roleMembers(w.roleName(agency.role), agency.memberCount)}
                </span>
              </span>
              <span aria-hidden="true">›</span>
            </Link>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-600">
            {w.noTeamYet}
          </p>
        )}
      </section>
      <form
        className="space-y-3 rounded-lg border border-gray-200 bg-white p-5"
        onSubmit={(event) => {
          event.preventDefault()
          mutation.run({ action: 'create', name }, w.teamCreated)
        }}
      >
        <h2 className="font-semibold">{w.createATeam}</h2>
        <p className="text-sm text-gray-600">
          {w.createTeamNote}
        </p>
        <label className="block text-sm font-medium" htmlFor="agency-name">
          {w.agencyName}
        </label>
        <input
          id="agency-name"
          className="field"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          maxLength={100}
          disabled={mutation.pending}
        />
        <button className="action-primary" disabled={mutation.pending || !name.trim()}>
          {w.createTeam}
        </button>
      </form>
    </div>
  )
}

export function TeamWorkspace({ data, viewerId }: { data: Workspace; viewerId: string }) {
  const w = usePwa()
  const m = messages(useLocale())
  const mutation = useTeamMutation()
  const router = useRouter()
  const [name, setName] = useState(data.name)
  const [agencyLicence, setAgencyLicence] = useState(data.branding.agencyLicence ?? '')
  const [officePhone, setOfficePhone] = useState(data.branding.phone ?? '')
  const [logoBusy, setLogoBusy] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'MANAGER' | 'AGENT'>('AGENT')
  const [assignee, setAssignee] = useState('')
  const [status, setStatus] = useState('')
  const activeMembers = data.members.filter((member) => member.status === 'ACTIVE')
  const work = data.tenancies.filter(
    (tenancy) =>
      (!assignee || tenancy.leadAgentId === assignee) &&
      (!status || tenancy.inspections.some((inspection) => inspection.status === status)),
  )
  return (
    <div className="space-y-6">
      <Link href="/team" className="text-link inline-flex min-h-11 items-center text-sm">
        {w.allTeams}
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{data.name}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {w.youHaveAccess(w.roleName(data.role))}{' '}
          {data.canManage
            ? w.managersOversee
            : w.yourTeamWork}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={`/inspections/new?workspace=${encodeURIComponent(data.id)}`} className="action-primary">{w.newCheckIn}</Link>
          <Link href={`/inspections?workspace=${encodeURIComponent(data.id)}`} className="action-secondary">{w.openPortfolio}</Link>
        </div>
      </div>
      {mutation.feedback}
      <section className="space-y-4" aria-label={w.teamDetails}>
        <h2 className="text-lg font-semibold">{w.teamDetails}</h2>
        {data.canManage ? (
          <form
            className="space-y-3 rounded-lg border border-gray-200 bg-white p-5"
            onSubmit={(event) => {
              event.preventDefault()
              mutation.run({ action: 'rename', agencyId: data.id, name }, 'Team name saved.')
            }}
          >
            <label className="block text-sm font-medium" htmlFor="team-name">{w.teamName}</label>
            <input
              className="field"
              id="team-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={100}
              disabled={mutation.pending}
            />
            <button
              className="action-primary"
              disabled={mutation.pending || !name.trim() || name.trim() === data.name}
            >{w.saveTeamName}</button>
          </form>
        ) : (
          <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-600">{data.name}</p>
            <LockedAction label={w.teamRename} who={w.aTeamOwnerOrManager} askNames={teamManagers(data, viewerId)} />
          </div>
        )}
      </section>
      <section className="space-y-4" aria-label={w.settingsBranding}>
        <div>
          <h2 className="text-lg font-semibold">{w.settingsBranding}</h2>
          <p className="mt-1 text-sm text-gray-600">{w.theTeamNameLicenceAndLogoAppear}</p>
        </div>
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-4">
            {data.branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.branding.logoUrl} alt={`${data.name} logo`} className="h-14 w-32 object-contain object-left" />
            ) : (
              <div className="flex h-14 w-32 items-center justify-center rounded-md bg-gray-50 text-sm text-gray-500">{w.noLogo}</div>
            )}
            {data.canManage ? (
              <div className="flex flex-wrap gap-2">
                <label className="action-secondary cursor-pointer">
                  {logoBusy ? w.uploading : data.branding.logoUrl ? w.replaceLogo : w.addLogo}
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={logoBusy}
                    onChange={async (event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      setLogoBusy(true)
                      setLogoError(null)
                      try {
                        const response = await fetch(`/api/v1/agencies/${data.id}/branding/logo`, { method: 'POST', body: file })
                        if (!response.ok) throw new Error('upload')
                        router.refresh()
                      } catch {
                        setLogoError('Could not upload the logo. Use a PNG, JPEG or WebP under 1 MB.')
                      } finally {
                        setLogoBusy(false)
                        event.target.value = ''
                      }
                    }}
                  />
                </label>
                {data.branding.logoUrl && (
                  <button
                    className="action-secondary"
                    disabled={logoBusy}
                    onClick={async () => {
                      setLogoBusy(true)
                      setLogoError(null)
                      try {
                        const response = await fetch(`/api/v1/agencies/${data.id}/branding/logo`, { method: 'DELETE' })
                        if (!response.ok) throw new Error('remove')
                        router.refresh()
                      } catch {
                        setLogoError('Could not remove the logo. Please try again.')
                      } finally {
                        setLogoBusy(false)
                      }
                    }}
                  >{w.removeLogo}</button>
                )}
              </div>
            ) : (
              <LockedAction label={w.editReportBranding} who={w.aTeamOwnerOrManager} askNames={teamManagers(data, viewerId)} />
            )}
          </div>
          {logoError && <p role="alert" className="text-sm text-red-700">{logoError}</p>}
          {data.canManage ? (
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault()
                mutation.run(
                  { action: 'branding', agencyId: data.id, agencyLicence, phone: officePhone },
                  'Report branding saved.',
                )
              }}
            >
              <label className="text-sm font-medium">{w.agencyLicence}<input className="field mt-1" value={agencyLicence} onChange={(event) => setAgencyLicence(event.target.value)} maxLength={40} />
              </label>
              <label className="text-sm font-medium">{w.officePhone}<input className="field mt-1" value={officePhone} onChange={(event) => setOfficePhone(event.target.value)} maxLength={40} />
              </label>
              <button className="action-primary sm:col-span-2" disabled={mutation.pending}>{w.saveReportBranding}</button>
            </form>
          ) : (
            <p className="text-sm text-gray-600">
              {data.branding.agencyLicence ? `Agency licence ${data.branding.agencyLicence}` : w.noAgencyLicenceAddedYet}
            </p>
          )}
        </div>
      </section>
      <section className="space-y-4" aria-label={w.teamWork}>
        <h2 className="text-lg font-semibold">{w.teamWork}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">
            {w.responsibleAgent}
            <select
              className="field mt-1"
              value={assignee}
              onChange={(event) => setAssignee(event.target.value)}
            >
              <option value="">{w.allAgents}</option>
              {activeMembers.map((member) => (
                <option key={member.id} value={member.stakeholderId}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            {w.inspectionStatusLabel}
            <select
              className="field mt-1"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">{w.allStatuses}</option>
              <option value="DRAFT">{w.notStarted}</option>
              <option value="CAPTURING">{w.capturing}</option>
              <option value="REVIEW">{w.needsReview}</option>
              <option value="AWAITING_SIGNATURE">{w.awaitingSignatures}</option>
              <option value="COMPLETED">{w.completed}</option>
            </select>
          </label>
        </div>
        {work.length ? (
          <ul className="space-y-3">
            {work.map((tenancy) => (
              <li
                key={tenancy.id}
                className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{tenancy.property}</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {w.responsibleAgentName(tenancy.leadAgentName ?? w.unassigned)}
                    </p>
                  </div>
                  <Link
                    href={`/properties/${tenancy.propertyId}/settings`}
                    className="action-secondary"
                  >
                    {w.propertySettings}
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tenancy.inspections
                    .filter((inspection) => !status || inspection.status === status)
                    .map((inspection) => (
                      <Link
                        className="action-secondary"
                        key={inspection.id}
                        href={`/inspections/${inspection.id}`}
                      >
                        <span>{inspection.kind === 'CHECK_IN' ? w.checkIn : w.checkOut}</span>
                        <StatusBadge status={inspection.status} />
                        <span aria-hidden="true">›</span>
                      </Link>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-600">
            {data.tenancies.length
              ? w.noWorkMatches
              : data.canManage
                ? w.teamWorkEmptyManager
                : w.teamWorkEmptyAgent}
          </p>
        )}
      </section>
      <section className="space-y-4" aria-label={w.teamMembers}>
        <h2 className="text-lg font-semibold">{w.membersAndInvitations}</h2>
        <p className="text-sm text-gray-600">
          {w.membersNote}
        </p>
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {data.members.map((member) => (
            <TeamMember
              key={`${member.id}-${member.role}-${member.status}`}
              member={member}
              workspace={data}
              viewerId={viewerId}
              mutation={mutation}
            />
          ))}
        </ul>
        {!data.canManage && (
          <LockedAction label={w.teamInviteMember} who={w.aTeamOwnerOrManager} askNames={teamManagers(data, viewerId)} />
        )}
        {data.canManage && (
          <form
            className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
            onSubmit={(event) => {
              event.preventDefault()
              mutation.run(
                { action: 'invite', agencyId: data.id, email, role: inviteRole },
                w.invitationSent,
                () => setEmail(''),
              )
            }}
          >
            <h3 className="font-medium">{w.inviteColleague}</h3>
            <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
              <label className="text-sm font-medium">
                {w.colleagueEmail}
                <input
                  className="field mt-1"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={mutation.pending}
                />
              </label>
              <label className="text-sm font-medium">
                {w.role}
                <select
                  className="field mt-1"
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as 'MANAGER' | 'AGENT')}
                  disabled={mutation.pending}
                >
                  <option value="AGENT">{w.roleName('AGENT')}</option>
                  <option value="MANAGER">{w.roleName('MANAGER')}</option>
                </select>
              </label>
            </div>
            <button className="action-primary" disabled={mutation.pending || !email.trim()}>
              {w.sendInvitation}
            </button>
          </form>
        )}
      </section>
      {data.activity.length > 0 && (
        <details className="rounded-lg border border-gray-200 bg-white">
          <summary className="flex items-center justify-between px-4 py-3 font-medium">
            {w.recentActivity}<span aria-hidden="true">⌄</span>
          </summary>
          <ul className="divide-y divide-gray-100 border-t border-gray-200 px-4">
            {data.activity.map((event) => (
              <li className="py-3 text-sm" key={event.id}>
                <p>
                  {event.actorName} · {w.activity(event.action)}
                  {event.subjectName && ` · ${event.subjectName}`}
                </p>
                <p className="mt-1 text-xs text-gray-500">{date(m, event.createdAt)}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function TeamMember({
  member,
  workspace,
  viewerId,
  mutation,
}: {
  member: Workspace['members'][number]
  workspace: Workspace
  viewerId: string
  mutation: ReturnType<typeof useTeamMutation>
}) {
  const w = usePwa()
  const m = messages(useLocale())
  const [role, setRole] = useState(member.role)
  const [managing, setManaging] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [reassignTo, setReassignTo] = useState('')
  const canManage = workspace.canManage && (workspace.role === 'OWNER' || member.role !== 'OWNER')
  const invited = member.status === 'INVITED'
  const active = member.status === 'ACTIVE'
  return (
    <li className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-medium">
            {member.name}
            {member.stakeholderId === viewerId && ` ${w.you}`}
          </p>
          <p className="break-all text-sm text-gray-600">{member.email}</p>
          <p className="mt-1 text-xs text-gray-500">
            {w.memberLine(w.roleName(member.role), invited ? w.invitationPending : active ? w.active : w.removed, member.assignedTenancies)}
          </p>
          {invited && member.expiresAt && (
            <p className="mt-1 text-xs text-gray-500">{w.expires(date(m, member.expiresAt))}</p>
          )}
        </div>
        {canManage && (active || invited) && (
          <button
            className="action-secondary"
            disabled={mutation.pending}
            aria-expanded={managing}
            onClick={() => {
              setManaging(!managing)
              setRemoving(false)
            }}
          >
            {managing ? w.closeControls : w.manageMember}
          </button>
        )}
        {!canManage && (active || invited) && member.stakeholderId !== viewerId && (
          <LockedAction
            label={w.manageMember}
            who={member.role === 'OWNER' ? 'a team owner' : 'a team owner or manager'}
            askNames={teamManagers(workspace, viewerId, member.role === 'OWNER')}
          />
        )}
      </div>
      {managing && canManage && active && !removing && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            mutation.run(
              { action: 'member', agencyId: workspace.id, memberId: member.id, change: { role } },
              w.roleUpdated,
            )
          }}
        >
          <label className="min-w-36 text-sm font-medium">
            {w.roleFor(member.name)}
            <select
              className="field mt-1"
              value={role}
              onChange={(event) => setRole(event.target.value as typeof role)}
              disabled={mutation.pending}
            >
              <option value="AGENT">{w.roleName('AGENT')}</option>
              <option value="MANAGER">{w.roleName('MANAGER')}</option>
              {workspace.role === 'OWNER' && <option value="OWNER">{w.roleName('OWNER')}</option>}
            </select>
          </label>
          <button className="action-secondary" disabled={mutation.pending || role === member.role}>
            {w.saveRole}
          </button>
        </form>
      )}
      {managing && canManage && invited && !removing && (
        <button
          className="action-secondary"
          disabled={mutation.pending}
          onClick={() =>
            mutation.run(
              {
                action: 'member',
                agencyId: workspace.id,
                memberId: member.id,
                change: { action: 'resend' },
              },
              w.invitationRenewed,
            )
          }
        >
          {w.resendInvitation}
        </button>
      )}
      {managing && !removing && (
        <button
          className="action-danger"
          disabled={mutation.pending}
          onClick={() => setRemoving(true)}
        >
          {invited ? w.revokeInvitation : w.removeMember}
        </button>
      )}
      {removing && (
        <div className="space-y-3 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-900">
            {invited
              ? w.revokeFor(member.email ?? '')
              : w.removeFromTeam(member.name)}
          </p>
          {active && member.assignedTenancies > 0 && (
            <label className="block text-sm font-medium">
              {w.handWorkTo}
              <select
                className="field mt-1"
                required
                value={reassignTo}
                onChange={(event) => setReassignTo(event.target.value)}
              >
                <option value="">{w.chooseTeamMember}</option>
                {workspace.members
                  .filter((person) => person.status === 'ACTIVE' && person.id !== member.id)
                  .map((person) => (
                    <option key={person.id} value={person.stakeholderId}>
                      {person.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              className="action-danger"
              disabled={mutation.pending || (active && member.assignedTenancies > 0 && !reassignTo)}
              onClick={() =>
                mutation.run(
                  {
                    action: 'member',
                    agencyId: workspace.id,
                    memberId: member.id,
                    change: {
                      action: invited ? 'revoke' : 'remove',
                      ...(reassignTo ? { reassignToId: reassignTo } : {}),
                    },
                  },
                  invited ? w.invitationRevoked : w.memberRemoved,
                  () => setRemoving(false),
                )
              }
            >
              {invited ? w.confirmRevoke : w.confirmRemoval}
            </button>
            <button
              className="action-secondary"
              disabled={mutation.pending}
              onClick={() => setRemoving(false)}
            >
              {w.cancel}
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
