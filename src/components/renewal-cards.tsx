'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { respondToRenewal } from '@/lib/renewal-actions'

export type RenewalCard = { id: string; property: string; tenant: string; endDate: string }

export function RenewalCards({ renewals }: { renewals: RenewalCard[] }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function respond(id: string, choice: 'NOT_RENEWING' | 'DISMISSED' | 'LATER') {
    setError(null)
    startTransition(async () => {
      try {
        await respondToRenewal(id, choice)
      } catch {
        setError('Could not save the reminder. Please try again.')
      }
    })
  }

  return (
    <div className="mb-6 space-y-3">
      {renewals.map((renewal) => (
        <div key={renewal.id} className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Renewal due</p>
              <p className="mt-1 text-sm">{renewal.property}</p>
              <p className="mt-1 text-xs text-gray-600">{renewal.tenant} · Tenancy ends {renewal.endDate}</p>
            </div>
            <button type="button" aria-label={`Dismiss renewal reminder for ${renewal.property}`} disabled={pending} onClick={() => respond(renewal.id, 'DISMISSED')} className="px-2 text-gray-500 disabled:opacity-50">×</button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <Link href={`/renewals/${renewal.id}`} className="rounded-md bg-brand-500 px-3 py-2 font-medium text-white hover:bg-brand-600">Start renewal</Link>
            <button type="button" disabled={pending} onClick={() => respond(renewal.id, 'NOT_RENEWING')} className="font-medium disabled:opacity-50">Not renewing</button>
            <button type="button" disabled={pending} onClick={() => respond(renewal.id, 'LATER')} className="text-gray-600 disabled:opacity-50">Remind me in a week</button>
          </div>
        </div>
      ))}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
