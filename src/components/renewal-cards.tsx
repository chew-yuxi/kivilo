'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { respondToRenewal } from '@/lib/renewal-actions'
import { usePwa } from '@/components/locale'

export type RenewalCard = { id: string; property: string; tenant: string; endDate: string }

export function RenewalCards({ renewals }: { renewals: RenewalCard[] }) {
  const w = usePwa()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function respond(id: string, choice: 'NOT_RENEWING' | 'DISMISSED' | 'LATER') {
    setError(null)
    startTransition(async () => {
      try {
        await respondToRenewal(id, choice)
      } catch {
        setError(w.reminderSaveFailed)
      }
    })
  }

  return (
    <div className="mb-6 space-y-3">
      {renewals.map((renewal) => (
        <div key={renewal.id} className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">{w.renewalDue}</p>
              <p className="mt-1 text-sm">{renewal.property}</p>
              <p className="mt-1 text-xs text-gray-600">{w.tenancyEnds(renewal.tenant, renewal.endDate)}</p>
            </div>
            <button type="button" aria-label={w.dismissRenewal(renewal.property)} disabled={pending} onClick={() => respond(renewal.id, 'DISMISSED')} className="action-secondary min-w-11 px-2">×</button>
          </div>
          <div className="mt-4 action-group text-sm">
            <Link href={`/renewals/${renewal.id}`} className="action-primary">{w.startRenewal}</Link>
            <button type="button" disabled={pending} onClick={() => respond(renewal.id, 'NOT_RENEWING')} className="action-secondary">{w.notRenewing}</button>
            <button type="button" disabled={pending} onClick={() => respond(renewal.id, 'LATER')} className="action-secondary">{w.remindWeek}</button>
          </div>
        </div>
      ))}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
