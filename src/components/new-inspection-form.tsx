'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createInspection } from '@/lib/actions'
import type { PropertyType } from '@/generated/prisma'

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'PRIVATE_NON_LANDED', label: 'Private, non-landed' },
  { value: 'HDB', label: 'HDB' },
  { value: 'LANDED', label: 'Landed' },
  { value: 'COMMERCIAL', label: 'Commercial' },
]

const field =
  'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-normal focus:border-brand-500 focus:outline-none'

/// A two year tenancy is the common case in Singapore, so the dates start there and
/// the agent adjusts rather than fills in from empty.
function defaultDates() {
  const start = new Date()
  const end = new Date(start)
  end.setFullYear(end.getFullYear() + 2)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { start: iso(start), end: iso(end) }
}

export function NewInspectionForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const dates = defaultDates()

  function submit(formData: FormData) {
    const value = (name: string) => String(formData.get(name) ?? '')
    setError(null)

    startTransition(async () => {
      try {
        const id = await createInspection({
          line1: value('line1'),
          unit: value('unit') || null,
          postalCode: value('postalCode'),
          propertyType: value('propertyType') as PropertyType,
          landlordName: value('landlordName'),
          landlordEmail: value('landlordEmail') || null,
          tenantName: value('tenantName'),
          tenantEmail: value('tenantEmail') || null,
          startDate: value('startDate'),
          endDate: value('endDate'),
          monthlyRent: value('monthlyRent'),
          deposit: value('deposit'),
        })
        router.push(`/inspections/${id}`)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not create the check-in')
      }
    })
  }

  return (
    <form action={submit} className="mt-8 space-y-8">
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium">Property</legend>
        <label className="block text-xs font-medium text-gray-600">
          Address
          <input name="line1" required placeholder="2 Marina Boulevard" className={field} />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-xs font-medium text-gray-600">
            Unit
            <input name="unit" placeholder="#28-05" className={field} />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            Postal code
            <input
              name="postalCode"
              required
              inputMode="numeric"
              placeholder="018987"
              className={field}
            />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            Type
            <select name="propertyType" defaultValue="PRIVATE_NON_LANDED" className={field}>
              {PROPERTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium">Parties</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium text-gray-600">
            Landlord
            <input name="landlordName" required placeholder="Full name" className={field} />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            Landlord email
            <input name="landlordEmail" type="email" placeholder="Optional" className={field} />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            Tenant
            <input name="tenantName" required placeholder="Full name" className={field} />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            Tenant email
            <input name="tenantEmail" type="email" placeholder="Optional" className={field} />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium">Tenancy</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium text-gray-600">
            Starts
            <input name="startDate" type="date" required defaultValue={dates.start} className={field} />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            Ends
            <input name="endDate" type="date" required defaultValue={dates.end} className={field} />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            Monthly rent (SGD)
            <input name="monthlyRent" inputMode="decimal" placeholder="6800" className={field} />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            Deposit (SGD)
            <input name="deposit" inputMode="decimal" placeholder="13600" className={field} />
          </label>
        </div>
        <p className="text-xs text-gray-500">
          The deposit is what the check-out comparison is measured against, so it is worth
          getting right before the tenancy ends.
        </p>
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 sm:w-auto"
      >
        {pending ? 'Creating…' : 'Create and start capturing'}
      </button>
    </form>
  )
}
