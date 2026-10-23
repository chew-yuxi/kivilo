'use client'

import { useId, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addTenancyCollaboratorFromWeb, removeTenancyCollaboratorFromWeb } from '@/lib/tenancy-access-web-actions'
import type { TenancyAccess } from '@/lib/tenancy-access'
import { usePwa } from '@/components/locale'

export function TenancyAccessPanel({ access, viewerId }: {
  access: TenancyAccess
  viewerId: string
}) {
  const w = usePwa()
  const router = useRouter()
  const emailId = useId()
  const [email, setEmail] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const people = [
    ...access.collaborators.map((person) => ({ ...person, scope: 'TENANCY' as const })),
    ...access.inspectionOnly.map((person) => ({ ...person, scope: 'INSPECTION' as const })),
  ]
  const sharedWith = [
    ...(access.leadAgent && access.leadAgent.id !== viewerId ? [access.leadAgent.name] : []),
    ...access.collaborators.filter((person) => person.stakeholderId !== viewerId).map((person) => person.name),
  ]
  const accessLabel = access.scope === 'INSPECTION'
    ? w.previousReportsAccess
    : access.agency
      ? w.teamAccess(access.agency.name)
    : access.visibility === 'PRIVATE'
      ? w.private
      : access.collaborators.length
        ? sharedWith.length ? w.sharedWith(sharedWith.join(w.listSeparator)) : w.sharedTenancy
        : w.previousReportsShared(access.inspectionOnly.map((person) => person.name).join(w.listSeparator))

  return (
    <details className="group rounded-lg border border-gray-200 bg-white" data-testid="tenancy-access">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">
        <span className="min-w-0 text-sm">
          <span className="block font-medium">{w.propertyAccess}</span>
          <span className="mt-0.5 block break-words text-gray-600">
            {accessLabel}
          </span>
        </span>
        <span className="action-secondary shrink-0 px-3 text-xs">
          {access.canManageAccess ? w.manageAccess : w.viewAccess}
        </span>
      </summary>

      <div className="space-y-4 border-t border-gray-100 p-4">
        {access.scope === 'INSPECTION' && (
          <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
            {w.reportsOnlyIntro}
          </p>
        )}
        <p className="text-sm text-gray-600">
          {w.collaboratorsIntro}
          {access.agency && ` ${w.teamOversight}`}
        </p>

        <ul className="divide-y divide-gray-100">
          {access.leadAgent && (
            <li className="py-3 first:pt-0">
              <p className="break-words text-sm font-medium">{access.leadAgent.name}</p>
              {access.leadAgent.email && <p className="break-all text-xs text-gray-500">{access.leadAgent.email}</p>}
              <p className="mt-1 text-xs text-gray-500">{w.leadManagesAccess}</p>
            </li>
          )}
          {people.map((person, index) => (
            <li key={person.stakeholderId} className="space-y-2 py-3 last:pb-0">
              {person.scope === 'INSPECTION' && (index === 0 || people[index - 1].scope !== 'INSPECTION') && (
                <div className="pb-2">
                  <h3 className="text-sm font-medium">{w.existingReportsOnly}</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {w.existingReportsBody}
                  </p>
                </div>
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium">{person.name}</p>
                  {person.email && <p className="break-all text-xs text-gray-500">{person.email}</p>}
                  <p className="mt-1 text-xs text-gray-500">
                    {person.scope === 'INSPECTION'
                      ? w.existingReportsCount(person.inspectionIds.length)
                      : w.collaboratorCanWork}
                  </p>
                </div>
                {access.canManageAccess && removingId !== person.stakeholderId && (
                  <button
                    type="button"
                    disabled={pending}
                    aria-label={w.removePerson(person.name)}
                    onClick={() => {
                      setError(null)
                      setNotice(null)
                      setRemovingId(person.stakeholderId)
                    }}
                    className="action-danger shrink-0 px-3"
                  >
                    {w.remove}
                  </button>
                )}
              </div>
              {access.canManageAccess && removingId === person.stakeholderId && (
                <div className="space-y-2 rounded-md bg-red-50 p-3">
                  <p className="text-sm text-red-900">
                    {w.removeAccessConfirm(person.name, person.scope === 'INSPECTION')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (pending) return
                        setError(null)
                        setNotice(null)
                        startTransition(async () => {
                          try {
                            const result = await removeTenancyCollaboratorFromWeb(access.tenancyId, person.stakeholderId)
                            if (!result.ok) {
                              setError(result.error)
                              return
                            }
                            router.refresh()
                            setRemovingId(null)
                            setNotice(w.accessRemovedFor(person.name))
                          } catch {
                            setError(w.removeAccessFailed)
                          }
                        })
                      }}
                      className="min-h-11 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {pending ? w.removing : w.removeAccess}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setRemovingId(null)}
                      className="min-h-11 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm disabled:opacity-50"
                    >
                      {w.keepAccess}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>

        {access.canManageAccess ? (
          <form
            className="space-y-2 border-t border-gray-100 pt-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (pending) return
              setError(null)
              setNotice(null)
              setRemovingId(null)
              const invitedEmail = email.trim()
              startTransition(async () => {
                try {
                  const result = await addTenancyCollaboratorFromWeb(access.tenancyId, invitedEmail)
                  if (!result.ok) {
                    setError(result.error)
                    return
                  }
                  router.refresh()
                  setEmail('')
                  setNotice(w.accessAddedFor(invitedEmail))
                } catch {
                  setError(w.addCollaboratorFailed)
                }
              })
            }}
          >
            <label htmlFor={emailId} className="block text-sm font-medium">{w.collaboratorEmail}</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id={emailId}
                name="email"
                type="email"
                required
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                disabled={pending}
                onChange={(event) => setEmail(event.target.value)}
                className="min-h-11 min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-base disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={pending || email.trim().length === 0}
                className="min-h-11 shrink-0 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {pending && !removingId ? w.addingEllipsis : w.addCollaborator}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              {w.collaboratorSignIn}
            </p>
          </form>
        ) : (
          <p className="text-sm text-gray-500">{w.whoManagesAccess}</p>
        )}

        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="break-words text-sm text-brand-700">{notice}</p>}
      </div>
    </details>
  )
}
