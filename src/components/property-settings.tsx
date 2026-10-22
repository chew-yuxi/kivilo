'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { propertyManagement } from '@/lib/property-management'
import { updatePropertyFromWeb } from '@/lib/property-web-actions'

type Property = Awaited<ReturnType<typeof propertyManagement>>
type Action = Parameters<typeof updatePropertyFromWeb>[1]['action']

export function PropertySettings({ property }: { property: Property }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  function change(action: Action) {
    if (pending) return
    setError(null)
    setNotice(null)
    startTransition(async () => {
      try {
        const result = await updatePropertyFromWeb(property.id, {
          action,
          ...(action === 'trash' ? { confirmation } : {}),
        })
        if (!result.ok) {
          setError(result.error)
          return
        }
        router.refresh()
        setConfirmDelete(false)
        setConfirmation('')
        setNotice(
          action === 'archive'
            ? 'Property archived. Reports and history are preserved.'
            : action === 'unarchive'
              ? 'Property returned to active work.'
              : action === 'trash'
                ? 'Property moved to Recently deleted. You can restore it within 30 days.'
                : 'Property restored.',
        )
      } catch {
        setError('Could not update this property. Please try again.')
      }
    })
  }
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        className="text-link inline-flex min-h-11 items-center text-sm"
        href={`/properties?state=${property.state === 'TRASHED' ? 'trash' : property.state === 'ARCHIVED' ? 'archived' : 'active'}`}
      >
        ← Properties
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Property settings</h1>
        <p className="mt-2 break-words text-gray-700">{property.label}</p>
        <p className="mt-2 inline-block rounded-md bg-gray-100 px-3 py-1 text-xs font-medium">
          {property.state === 'TRASHED'
            ? 'Recently deleted'
            : property.state === 'ARCHIVED'
              ? 'Archived'
              : 'Active'}
        </p>
      </div>
      {error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-md bg-brand-50 p-3 text-sm text-brand-700" role="status">
          {notice}
        </p>
      )}
      <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="font-semibold">Property records</h2>
        <p className="text-sm text-gray-600">
          {property.counts.tenancies} {property.counts.tenancies === 1 ? 'tenancy' : 'tenancies'} ·{' '}
          {property.counts.inspections}{' '}
          {property.counts.inspections === 1 ? 'inspection' : 'inspections'} ·{' '}
          {property.counts.photos} {property.counts.photos === 1 ? 'photo' : 'photos'}
        </p>
        <ul className="space-y-3">
          {property.tenancies.map((tenancy) => (
            <li key={tenancy.id} className="border-t border-gray-100 pt-3 text-sm">
              <p>{tenancy.agencyName ?? 'Personal tenancy'}</p>
              <p className="mt-1 text-gray-600">
                Responsible agent: {tenancy.leadAgentName ?? 'Unassigned'}
              </p>
              {property.state !== 'TRASHED' && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tenancy.inspections.map((inspection) => (
                    <Link
                      className="action-secondary"
                      key={inspection.id}
                      href={`/inspections/${inspection.id}`}
                    >
                      {inspection.kind === 'CHECK_IN' ? 'Open check-in' : 'Open check-out'}
                      <span aria-hidden="true">›</span>
                    </Link>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section
        aria-labelledby="danger-zone-title"
        className="space-y-5 rounded-lg border border-red-200 bg-white p-5"
      >
        <h2 id="danger-zone-title" className="text-lg font-semibold text-red-800">
          Danger zone
        </h2>
        {!property.canManage ? (
          <p className="text-sm text-gray-600">{property.deleteBlockedReason}</p>
        ) : property.state === 'TRASHED' ? (
          <div className="space-y-3">
            <h3 className="font-medium">Restore property</h3>
            <p className="text-sm text-gray-600">
              This property and its drafts are in Recently deleted.{' '}
              {property.trashExpiresAt &&
                `Restore before ${new Date(property.trashExpiresAt).toLocaleDateString('en-SG', { dateStyle: 'long' })}.`}{' '}
              After the recovery period, its draft records and stored media are permanently removed.
            </p>
            <button className="action-primary" disabled={pending} onClick={() => change('restore')}>
              Restore property
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <h3 className="font-medium">
                {property.state === 'ARCHIVED' ? 'Return to active work' : 'Archive property'}
              </h3>
              <p className="text-sm text-gray-600">
                {property.state === 'ARCHIVED'
                  ? 'Put this property back in the active portfolio. Its records and access stay the same.'
                  : 'Remove this property from active work. Reports, signatures, photos and history remain available under Archived. You can bring it back at any time.'}
              </p>
              <button
                className="action-secondary"
                disabled={pending}
                onClick={() => change(property.state === 'ARCHIVED' ? 'unarchive' : 'archive')}
              >
                {property.state === 'ARCHIVED' ? 'Unarchive property' : 'Archive property'}
              </button>
            </div>
            <div className="space-y-3 border-t border-red-100 pt-5">
              <h3 className="font-medium text-red-800">Delete property</h3>
              {property.canDelete ? (
                <>
                  <p className="text-sm text-gray-600">
                    Delete a mistaken or draft-only property. This removes{' '}
                    {property.counts.tenancies}{' '}
                    {property.counts.tenancies === 1 ? 'tenancy' : 'tenancies'},{' '}
                    {property.counts.inspections}{' '}
                    {property.counts.inspections === 1 ? 'inspection' : 'inspections'} and{' '}
                    {property.counts.photos} {property.counts.photos === 1 ? 'photo' : 'photos'}{' '}
                    from active work. You have 30 days to restore it before permanent removal.
                  </p>
                  {!confirmDelete ? (
                    <button
                      className="action-danger"
                      disabled={pending}
                      onClick={() => setConfirmDelete(true)}
                    >
                      Delete property
                    </button>
                  ) : (
                    <form
                      className="space-y-3 rounded-md border border-red-200 bg-red-50 p-4"
                      onSubmit={(event) => {
                        event.preventDefault()
                        change('trash')
                      }}
                    >
                      <p className="text-sm text-red-900">
                        Move all these draft records to Recently deleted? Any photos still waiting
                        on a phone stay on that phone and cannot upload until the property is
                        restored.
                      </p>
                      <label className="block text-sm font-medium" htmlFor="delete-confirmation">
                        Type the full property address to confirm
                      </label>
                      <p className="select-all break-words text-sm text-gray-700">
                        {property.confirmationLabel}
                      </p>
                      <input
                        className="field"
                        id="delete-confirmation"
                        autoComplete="off"
                        value={confirmation}
                        onChange={(event) => setConfirmation(event.target.value)}
                        disabled={pending}
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="action-danger"
                          disabled={pending || confirmation !== property.confirmationLabel}
                        >
                          Move to Recently deleted
                        </button>
                        <button
                          type="button"
                          className="action-secondary"
                          disabled={pending}
                          onClick={() => {
                            setConfirmDelete(false)
                            setConfirmation('')
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-600">{property.deleteBlockedReason}</p>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
