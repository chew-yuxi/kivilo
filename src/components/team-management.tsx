'use client'

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
const roleName = (role: string) =>
  ({ OWNER: 'Owner', MANAGER: 'Manager', AGENT: 'Agent' })[role] ?? role
const date = (value: Date | string) =>
  new Date(value).toLocaleDateString('en-SG', { dateStyle: 'medium' })

function useTeamMutation() {
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
        setError('Could not save this change. Please try again.')
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
  const mutation = useTeamMutation()
  const [name, setName] = useState('')
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="mt-2 text-sm text-gray-600">
          Invite colleagues once, assign work by name, and hand work over when someone leaves.
        </p>
      </div>
      {mutation.feedback}
      {data.invitations.length > 0 && (
        <section className="space-y-3" aria-label="Your invitations">
          <h2 className="text-lg font-semibold">Your invitations</h2>
          {data.invitations.map((invite) => (
            <div key={invite.id} className="rounded-lg border border-brand-200 bg-brand-50 p-4">
              <h3 className="font-medium">{invite.agencyName}</h3>
              <p className="mt-1 text-sm">
                Invited as {roleName(invite.role)} · expires {date(invite.expiresAt)}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Joining keeps your personal work private. Add new properties in the team workspace;
                agents see only their assignments, while owners and managers oversee all team work.
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
                      'Invitation accepted.',
                    )
                  }
                >
                  Accept invitation
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
                      'Invitation declined.',
                    )
                  }
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
      <section className="space-y-3" aria-label="Your teams">
        <h2 className="text-lg font-semibold">Your teams</h2>
        {data.agencies.length ? (
          data.agencies.map((agency) => (
            <Link href={`/team/${agency.id}`} key={agency.id} className="nav-row">
              <span>
                <span className="block">{agency.name}</span>
                <span className="mt-1 block text-xs font-normal text-gray-600">
                  {roleName(agency.role)} · {agency.memberCount} members
                </span>
              </span>
              <span aria-hidden="true">›</span>
            </Link>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-600">
            You haven&apos;t joined a team yet. Create one for your agency or accept an invitation
            here.
          </p>
        )}
      </section>
      <form
        className="space-y-3 rounded-lg border border-gray-200 bg-white p-5"
        onSubmit={(event) => {
          event.preventDefault()
          mutation.run({ action: 'create', name }, 'Team created.')
        }}
      >
        <h2 className="font-semibold">Create a team</h2>
        <p className="text-sm text-gray-600">
          Invite colleagues once, then add properties to the team workspace. Owners and managers
          oversee all team work; agents see their assignments. Existing personal properties stay private.
        </p>
        <label className="block text-sm font-medium" htmlFor="agency-name">
          Agency name
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
          Create team
        </button>
      </form>
    </div>
  )
}

export function TeamWorkspace({ data, viewerId }: { data: Workspace; viewerId: string }) {
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
        ← All teams
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{data.name}</h1>
        <p className="mt-1 text-sm text-gray-600">
          You have {roleName(data.role).toLowerCase()} access.{' '}
          {data.canManage
            ? 'Owners and managers can oversee the team’s tenancies and manage assignments.'
            : 'Your team work shows tenancies assigned to you.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={`/inspections/new?workspace=${encodeURIComponent(data.id)}`} className="action-primary">New check-in</Link>
          <Link href={`/inspections?workspace=${encodeURIComponent(data.id)}`} className="action-secondary">Open portfolio</Link>
        </div>
      </div>
      {mutation.feedback}
      <section className="space-y-4" aria-label="Team details">
        <h2 className="text-lg font-semibold">Team details</h2>
        {data.canManage ? (
          <form
            className="space-y-3 rounded-lg border border-gray-200 bg-white p-5"
            onSubmit={(event) => {
              event.preventDefault()
              mutation.run({ action: 'rename', agencyId: data.id, name }, 'Team name saved.')
            }}
          >
            <label className="block text-sm font-medium" htmlFor="team-name">
              Team name
            </label>
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
            >
              Save team name
            </button>
          </form>
        ) : (
          <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-600">{data.name}</p>
            <LockedAction label="Rename team" who="a team owner or manager" askNames={teamManagers(data, viewerId)} />
          </div>
        )}
      </section>
      <section className="space-y-4" aria-label="Report branding">
        <div>
          <h2 className="text-lg font-semibold">Report branding</h2>
          <p className="mt-1 text-sm text-gray-600">
            The team name, licence and logo appear with the responsible agent’s details on team reports.
          </p>
        </div>
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-4">
            {data.branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.branding.logoUrl} alt={`${data.name} logo`} className="h-14 w-32 object-contain object-left" />
            ) : (
              <div className="flex h-14 w-32 items-center justify-center rounded-md bg-gray-50 text-sm text-gray-500">
                No logo
              </div>
            )}
            {data.canManage ? (
              <div className="flex flex-wrap gap-2">
                <label className="action-secondary cursor-pointer">
                  {logoBusy ? 'Uploading…' : data.branding.logoUrl ? 'Replace logo' : 'Add logo'}
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
                  >
                    Remove logo
                  </button>
                )}
              </div>
            ) : (
              <LockedAction label="Edit report branding" who="a team owner or manager" askNames={teamManagers(data, viewerId)} />
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
              <label className="text-sm font-medium">
                Agency licence
                <input className="field mt-1" value={agencyLicence} onChange={(event) => setAgencyLicence(event.target.value)} maxLength={40} />
              </label>
              <label className="text-sm font-medium">
                Office phone
                <input className="field mt-1" value={officePhone} onChange={(event) => setOfficePhone(event.target.value)} maxLength={40} />
              </label>
              <button className="action-primary sm:col-span-2" disabled={mutation.pending}>
                Save report branding
              </button>
            </form>
          ) : (
            <p className="text-sm text-gray-600">
              {data.branding.agencyLicence ? `Agency licence ${data.branding.agencyLicence}` : 'No agency licence added yet.'}
            </p>
          )}
        </div>
      </section>
      <section className="space-y-4" aria-label="Team work">
        <h2 className="text-lg font-semibold">Team work</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Responsible agent
            <select
              className="field mt-1"
              value={assignee}
              onChange={(event) => setAssignee(event.target.value)}
            >
              <option value="">All agents</option>
              {activeMembers.map((member) => (
                <option key={member.id} value={member.stakeholderId}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Inspection status
            <select
              className="field mt-1"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Not started</option>
              <option value="CAPTURING">Capturing</option>
              <option value="REVIEW">Needs review</option>
              <option value="AWAITING_SIGNATURE">Awaiting signatures</option>
              <option value="COMPLETED">Completed</option>
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
                      Responsible agent: {tenancy.leadAgentName ?? 'Unassigned'}
                    </p>
                  </div>
                  <Link
                    href={`/properties/${tenancy.propertyId}/settings`}
                    className="action-secondary"
                  >
                    Property settings
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
                        <span>{inspection.kind === 'CHECK_IN' ? 'Check-in' : 'Check-out'}</span>
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
              ? 'No work matches these filters.'
              : data.canManage
                ? 'Start a new check-in to add a property to this team. Invite colleagues below, then assign the people who will work on each tenancy.'
                : 'Your assigned team properties will appear here. Start a new check-in to add a team property assigned to you.'}
          </p>
        )}
      </section>
      <section className="space-y-4" aria-label="Team members">
        <h2 className="text-lg font-semibold">Members and invitations</h2>
        <p className="text-sm text-gray-600">
          Owners and managers oversee team work. Agents can work on assigned tenancies. Invited
          people receive access after accepting.
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
          <LockedAction label="Invite member" who="a team owner or manager" askNames={teamManagers(data, viewerId)} />
        )}
        {data.canManage && (
          <form
            className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
            onSubmit={(event) => {
              event.preventDefault()
              mutation.run(
                { action: 'invite', agencyId: data.id, email, role: inviteRole },
                'Invitation sent.',
                () => setEmail(''),
              )
            }}
          >
            <h3 className="font-medium">Invite a colleague</h3>
            <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
              <label className="text-sm font-medium">
                Colleague email
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
                Role
                <select
                  className="field mt-1"
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as 'MANAGER' | 'AGENT')}
                  disabled={mutation.pending}
                >
                  <option value="AGENT">Agent</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </label>
            </div>
            <button className="action-primary" disabled={mutation.pending || !email.trim()}>
              Send invitation
            </button>
          </form>
        )}
      </section>
      {data.activity.length > 0 && (
        <details className="rounded-lg border border-gray-200 bg-white">
          <summary className="flex items-center justify-between px-4 py-3 font-medium">
            Recent activity<span aria-hidden="true">⌄</span>
          </summary>
          <ul className="divide-y divide-gray-100 border-t border-gray-200 px-4">
            {data.activity.map((event) => (
              <li className="py-3 text-sm" key={event.id}>
                <p>
                  {event.actorName} · {event.action.toLowerCase().replaceAll('_', ' ')}
                  {event.subjectName && ` · ${event.subjectName}`}
                </p>
                <p className="mt-1 text-xs text-gray-500">{date(event.createdAt)}</p>
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
            {member.stakeholderId === viewerId && ' (you)'}
          </p>
          <p className="break-all text-sm text-gray-600">{member.email}</p>
          <p className="mt-1 text-xs text-gray-500">
            {roleName(member.role)} ·{' '}
            {invited ? 'Invitation pending' : active ? 'Active' : 'Removed'} ·{' '}
            {member.assignedTenancies} assigned{' '}
            {member.assignedTenancies === 1 ? 'tenancy' : 'tenancies'}
          </p>
          {invited && member.expiresAt && (
            <p className="mt-1 text-xs text-gray-500">Expires {date(member.expiresAt)}</p>
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
            {managing ? 'Close controls' : 'Manage member'}
          </button>
        )}
        {!canManage && (active || invited) && member.stakeholderId !== viewerId && (
          <LockedAction
            label="Manage member"
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
              'Member role updated.',
            )
          }}
        >
          <label className="min-w-36 text-sm font-medium">
            Role for {member.name}
            <select
              className="field mt-1"
              value={role}
              onChange={(event) => setRole(event.target.value as typeof role)}
              disabled={mutation.pending}
            >
              <option value="AGENT">Agent</option>
              <option value="MANAGER">Manager</option>
              {workspace.role === 'OWNER' && <option value="OWNER">Owner</option>}
            </select>
          </label>
          <button className="action-secondary" disabled={mutation.pending || role === member.role}>
            Save role
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
              'Invitation renewed.',
            )
          }
        >
          Resend invitation
        </button>
      )}
      {managing && !removing && (
        <button
          className="action-danger"
          disabled={mutation.pending}
          onClick={() => setRemoving(true)}
        >
          {invited ? 'Revoke invitation' : 'Remove member'}
        </button>
      )}
      {removing && (
        <div className="space-y-3 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-900">
            {invited
              ? `Revoke the invitation for ${member.email}?`
              : `Remove ${member.name} from this team? Their team access ends immediately. Saved work, photographs and authorship stay intact. Their personal work is unaffected.`}
          </p>
          {active && member.assignedTenancies > 0 && (
            <label className="block text-sm font-medium">
              Hand assigned work to
              <select
                className="field mt-1"
                required
                value={reassignTo}
                onChange={(event) => setReassignTo(event.target.value)}
              >
                <option value="">Choose a team member</option>
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
                  invited ? 'Invitation revoked.' : 'Member removed and assigned work handed over.',
                  () => setRemoving(false),
                )
              }
            >
              Confirm {invited ? 'revoke' : 'removal'}
            </button>
            <button
              className="action-secondary"
              disabled={mutation.pending}
              onClick={() => setRemoving(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
