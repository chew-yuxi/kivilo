'use client'

import { useLocale, usePwa } from '@/components/locale'
import { formatDate, messages } from '@/lib/i18n'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { propertyManagement } from '@/lib/property-management'
import { updatePropertyFromWeb } from '@/lib/property-web-actions'
import { LockedAction } from '@/components/locked-action'

const propertyManagers = 'the responsible agent or a team owner or manager for every tenancy here'

type Property = Awaited<ReturnType<typeof propertyManagement>>
type Action = Parameters<typeof updatePropertyFromWeb>[1]['action']

export function PropertySettings({ property }: { property: Property }) {
  const w = usePwa()
  const m = messages(useLocale())
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
            ? w.archivedNotice
            : action === 'unarchive'
              ? w.unarchivedNotice
              : action === 'trash'
                ? w.trashedNotice
                : w.restoredNotice,
        )
      } catch {
        setError(w.updatePropertyFailed)
      }
    })
  }
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        className="text-link inline-flex min-h-11 items-center text-sm"
        href={property.state === 'TRASHED' ? '/properties?filter=trash' : `/properties/${property.id}`}
      >
        {property.state === 'TRASHED' ? w.recentlyDeletedLabel : w.propertyLabel}
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{w.propertySettings}</h1>
        <p className="mt-2 break-words text-gray-700">{property.label}</p>
        <p className="mt-2 inline-block rounded-md bg-gray-100 px-3 py-1 text-xs font-medium">
          {property.state === 'TRASHED'
            ? w.recentlyDeleted
            : property.state === 'ARCHIVED'
              ? w.archived
              : w.active}
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
        <h2 className="font-semibold">{w.propertyRecords}</h2>
        <p className="text-sm text-gray-600">
          {w.recordCounts(property.counts.tenancies, property.counts.inspections, property.counts.photos)}
        </p>
        <ul className="space-y-3">
          {property.tenancies.map((tenancy) => (
            <li key={tenancy.id} className="border-t border-gray-100 pt-3 text-sm">
              <p>{tenancy.agencyName ?? w.personalTenancy}</p>
              <p className="mt-1 text-gray-600">
                {w.responsibleAgentName(tenancy.leadAgentName ?? w.unassigned)}
              </p>
              {property.state !== 'TRASHED' && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tenancy.inspections.map((inspection) => (
                    <Link
                      className="action-secondary"
                      key={inspection.id}
                      href={`/inspections/${inspection.id}`}
                    >
                      {inspection.kind === 'CHECK_IN' ? w.openCheckIn : w.openCheckOut}
                      <span aria-hidden="true">›</span>
                    </Link>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="font-semibold">{w.history}</h2>
        <p className="text-sm text-gray-600">{w.everyChangeAndDeletionWithWhoMadeLabel}</p>
        <Link className="action-secondary" href={`/properties/${property.id}/history`}>{w.viewHistory}<span aria-hidden="true">›</span>
        </Link>
      </section>
      <section
        aria-labelledby="danger-zone-title"
        className="space-y-5 rounded-lg border border-red-200 bg-white p-5"
      >
        <h2 id="danger-zone-title" className="text-lg font-semibold text-red-800">
          {w.dangerZone}
        </h2>
        {!property.canManage ? (
          <div className="space-y-4">
            <LockedAction
              label={property.state === 'TRASHED' ? 'Restore property' : property.state === 'ARCHIVED' ? w.unarchiveProperty : w.archiveProperty}
              who={propertyManagers}
              askNames={property.askNames}
            />
            {property.state !== 'TRASHED' && (
              <LockedAction label={w.deletePropertyButton} who={propertyManagers} askNames={property.askNames} className="action-danger" />
            )}
          </div>
        ) : property.state === 'TRASHED' ? (
          <div className="space-y-3">
            <h3 className="font-medium">{w.restoreProperty}</h3>
            <p className="text-sm text-gray-600">
              {w.inRecentlyDeleted}{' '}
              {property.trashExpiresAt &&
                w.restoreBefore(formatDate(m, new Date(property.trashExpiresAt), { dateStyle: 'long' }))}{' '}
              {w.afterRecovery}
            </p>
            <button className="action-primary" disabled={pending} onClick={() => change('restore')}>
              {w.restorePropertyButton}
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <h3 className="font-medium">
                {property.state === 'ARCHIVED' ? w.returnToActive : w.archiveProperty}
              </h3>
              <p className="text-sm text-gray-600">
                {property.state === 'ARCHIVED'
                  ? w.unarchiveBody
                  : w.archiveBody}
              </p>
              <button
                className="action-secondary"
                disabled={pending}
                onClick={() => change(property.state === 'ARCHIVED' ? 'unarchive' : 'archive')}
              >
                {property.state === 'ARCHIVED' ? w.unarchiveProperty : w.archiveProperty}
              </button>
            </div>
            <div className="space-y-3 border-t border-red-100 pt-5">
              <h3 className="font-medium text-red-800">{w.deleteProperty}</h3>
              {property.canDelete ? (
                <>
                  <p className="text-sm text-gray-600">
                    {w.deleteBody(property.counts.tenancies, property.counts.inspections, property.counts.photos)}
                  </p>
                  {!confirmDelete ? (
                    <button
                      className="action-danger"
                      disabled={pending}
                      onClick={() => setConfirmDelete(true)}
                    >
                      {w.deletePropertyButton}
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
                        {w.trashConfirmBody}
                      </p>
                      <label className="block text-sm font-medium" htmlFor="delete-confirmation">
                        {w.typeAddress}
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
                          {w.moveToRecentlyDeleted}
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
                          {w.cancel}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-600">{w.propertyHasHistory}</p>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
