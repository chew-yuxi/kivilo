'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createRenewal } from '@/lib/renewal-actions'

export function RenewalForm({ tenancyId, startDate, endDate, monthlyRent, deposit, collaboratorNames }: {
  tenancyId: string; startDate: string; endDate: string; monthlyRent: string; deposit: string
  collaboratorNames: string[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const field = 'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm'

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const data = new FormData(event.currentTarget)
    setError(null)
    startTransition(async () => {
      try {
        const id = await createRenewal(tenancyId, {
          startDate: String(data.get('startDate')), endDate: String(data.get('endDate')),
          monthlyRent: String(data.get('monthlyRent')), deposit: String(data.get('deposit')),
          keepCollaborators: data.get('keepCollaborators') === 'on',
        })
        router.push(`/inspections/${id}`)
      } catch {
        setError('Could not create the renewal. Check that the dates follow the current tenancy and that the amounts are valid.')
      }
    })
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <label className="block text-sm">Starts<input type="date" name="startDate" required min={startDate} defaultValue={startDate} className={field} /></label>
      <label className="block text-sm">Ends<input type="date" name="endDate" required min={startDate} defaultValue={endDate} className={field} /></label>
      <label className="block text-sm">Monthly rent (SGD)<input name="monthlyRent" required inputMode="decimal" pattern="[0-9]{1,8}(\.[0-9]{1,2})?" defaultValue={monthlyRent} className={field} /></label>
      <label className="block text-sm">Deposit (SGD)<input name="deposit" required inputMode="decimal" pattern="[0-9]{1,8}(\.[0-9]{1,2})?" defaultValue={deposit} className={field} /></label>
      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm font-medium">Access to the new tenancy</p>
        <p className="text-sm text-gray-600">
          {collaboratorNames.length > 0
            ? 'The new tenancy is private unless you choose to keep sharing it.'
            : 'The renewal starts private. You can share it with collaborators after creating it.'}
        </p>
        {collaboratorNames.length > 0 && (
          <label className="flex min-h-11 items-start gap-3 text-sm">
            <input type="checkbox" name="keepCollaborators" disabled={pending} className="mt-0.5 size-5 shrink-0 accent-brand-500" />
            <span className="break-words">Keep sharing this renewal with {collaboratorNames.join(', ')}</span>
          </label>
        )}
      </div>
      <p className="text-xs text-gray-500">Confirm these terms with both parties first. This creates a new tenancy and a draft check-in for the same property, landlord and tenant.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button disabled={pending} type="submit" className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{pending ? 'Creating…' : 'Create renewal check-in'}</button>
    </form>
  )
}
