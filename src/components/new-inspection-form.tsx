'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createInspection } from '@/lib/actions'
import type { PropertyType } from '@/generated/prisma'
import { rememberWorkspace, type WorkspaceTeam } from '@/lib/web-workspace'
import { usePwa } from '@/components/locale'

const PROPERTY_TYPES: PropertyType[] = ['PRIVATE_NON_LANDED', 'HDB', 'LANDED', 'COMMERCIAL']

const field =
  'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-normal focus:border-brand-500 focus:outline-none'
const requirement = 'ml-1 font-normal text-gray-400'

/// A two year tenancy is the common case in Singapore, so the dates start there and
/// the agent adjusts rather than fills in from empty.
function defaultDates() {
  const start = new Date()
  const end = new Date(start)
  end.setFullYear(end.getFullYear() + 2)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { start: iso(start), end: iso(end) }
}

export function NewInspectionForm({ agentId, teams, initialWorkspace, rememberInitial, plans }: {
  agentId: string
  teams: WorkspaceTeam[]
  initialWorkspace: string
  rememberInitial: boolean
  plans: Record<string, { active: number; limit: number; needsMoreSeats: boolean }>
}) {
  const w = usePwa()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [workspace, setWorkspace] = useState(initialWorkspace)
  useEffect(() => {
    if (rememberInitial) rememberWorkspace(agentId, initialWorkspace)
  }, [agentId, initialWorkspace, rememberInitial])
  const dates = defaultDates()
  const plan = plans[workspace]
  const limited = plan.needsMoreSeats || plan.active >= plan.limit

  function dismissKeyboard() {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  }

  // onSubmit rather than a form action: React resets a form once its action returns,
  // which after a validation error would wipe everything the agent had typed.
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    dismissKeyboard()
    const formData = new FormData(event.currentTarget)
    const value = (name: string) => String(formData.get(name) ?? '')
    setError(null)

    startTransition(async () => {
      try {
        const id = await createInspection({
          ...(workspace !== 'personal' && { agencyId: workspace }),
          line1: value('line1'),
          unit: value('unit') || null,
          postalCode: value('postalCode'),
          propertyType: value('propertyType') as PropertyType,
          furnishingLevel: value('furnishingLevel') as
            | 'FULLY_FURNISHED'
            | 'PARTIALLY_FURNISHED'
            | 'UNFURNISHED',
          landlordName: value('landlordName'),
          landlordEmail: value('landlordEmail') || null,
          tenantName: value('tenantName'),
          tenantEmail: value('tenantEmail') || null,
          startDate: value('startDate'),
          endDate: value('endDate'),
          preservesBlankAmounts: true,
          monthlyRent: value('monthlyRent'),
          deposit: value('deposit'),
        })
        router.push(`/inspections/${id}`)
      } catch (e) {
        setError(e instanceof Error ? e.message : w.createFailed)
      }
    })
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-8">
      <fieldset className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <legend className="text-sm font-medium">{w.propertyWorkspace}</legend>
        <label className="block text-xs font-medium text-gray-600">
          {w.workspace}
          <select name="workspace" className={field} value={workspace} disabled={pending} onChange={(event) => {
            setWorkspace(event.target.value)
            rememberWorkspace(agentId, event.target.value)
          }}>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            <option value="personal">{w.personal}</option>
          </select>
        </label>
        <p className="text-sm text-gray-600">
          {workspace === 'personal'
            ? w.newPersonalNote
            : w.newTeamNote}
        </p>
        <Link href="/team" className="text-link inline-flex min-h-11 items-center text-sm">{w.createOrJoinTeam}</Link>
      </fieldset>
      {limited && (
        <div className="rounded-lg border border-gray-200 bg-white p-5" data-testid="plan-limit">
          <p className="text-sm font-medium">
            {plan.needsMoreSeats ? w.thisTeamNeedsAPaidSeatFor : `Your plan’s ${plan.limit} active ${plan.limit === 1 ? w.propertyIs : w.propertiesAre} in use`}
          </p>
          <p className="mt-1 text-sm text-gray-500">{w.aPropertyStopsCountingWhenItsCheck}</p>
          <Link href={workspace === 'personal' ? '/account' : `/account?agencyId=${encodeURIComponent(workspace)}`} className="mt-4 inline-block rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">{w.seeYourPlan}</Link>
        </div>
      )}
      <fieldset disabled={pending || limited} className={limited ? 'hidden' : 'space-y-8'}>
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium">{w.property}</legend>
        <label className="block text-xs font-medium text-gray-600">
          {w.address} <span className={requirement}>{w.required}</span>
          <input name="line1" required placeholder="2 Marina Boulevard" className={field} />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-xs font-medium text-gray-600">
            {w.unit} <span className={requirement}>{w.optional}</span>
            <input name="unit" placeholder="#28-05" className={field} />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            {w.postalCode} <span className={requirement}>{w.required}</span>
            <div className="group relative">
              <input
                name="postalCode"
                required
                inputMode="numeric"
                placeholder="018987"
                className={`${field} pr-16 sm:pr-3`}
              />
              <button
                type="button"
                onClick={dismissKeyboard}
                className="pointer-events-none absolute right-2 bottom-1.5 rounded px-2 py-1 text-xs font-medium text-brand-600 opacity-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 sm:hidden"
              >
                {w.done}
              </button>
            </div>
          </label>
          <label className="block text-xs font-medium text-gray-600">
            {w.type} <span className={requirement}>{w.required}</span>
            <select name="propertyType" defaultValue="PRIVATE_NON_LANDED" className={field}>
              {PROPERTY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {w.propertyType(type)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <fieldset>
          <legend className="text-xs font-medium text-gray-600">
            {w.furnishing} <span className={requirement}>{w.required}</span>
          </legend>
          <p className="mt-1 text-xs text-gray-500">{w.roomsStartWithEditableInventoryRowsSuited}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {[
              ['FULLY_FURNISHED', 'Fully furnished'],
              ['PARTIALLY_FURNISHED', 'Partially furnished'],
              ['UNFURNISHED', 'Unfurnished'],
            ].map(([value, label]) => (
              <label
                key={value}
                className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-normal text-gray-700"
              >
                <input name="furnishingLevel" type="radio" value={value} required />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium">{w.parties}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium text-gray-600">
            {w.landlord} <span className={requirement}>{w.required}</span>
            <input name="landlordName" required placeholder={w.fullName} className={field} />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            {w.landlordEmail} <span className={requirement}>{w.optional}</span>
            <input name="landlordEmail" type="email" className={field} />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            {w.tenant} <span className={requirement}>{w.required}</span>
            <input name="tenantName" required placeholder={w.fullName} className={field} />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            {w.tenantEmail} <span className={requirement}>{w.optional}</span>
            <input name="tenantEmail" type="email" className={field} />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium">{w.tenancy}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium text-gray-600">
            {w.starts} <span className={requirement}>{w.required}</span>
            <input name="startDate" type="date" required defaultValue={dates.start} className={field} />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            {w.ends} <span className={requirement}>{w.required}</span>
            <input name="endDate" type="date" required defaultValue={dates.end} className={field} />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            {w.monthlyRent} <span className={requirement}>{w.optional}</span>
            <div className="group relative">
              <input
                name="monthlyRent"
                pattern={String.raw`[0-9]{1,8}(\.[0-9]{1,2})?`}
                inputMode="decimal"
                placeholder="6800"
                className={`${field} pr-16 sm:pr-3`}
              />
              <button
                type="button"
                onClick={dismissKeyboard}
                className="pointer-events-none absolute right-2 bottom-1.5 rounded px-2 py-1 text-xs font-medium text-brand-600 opacity-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 sm:hidden"
              >
                {w.done}
              </button>
            </div>
          </label>
          <label className="block text-xs font-medium text-gray-600">
            {w.depositSgd} <span className={requirement}>{w.optional}</span>
            <div className="group relative">
              <input
                name="deposit"
                pattern={String.raw`[0-9]{1,8}(\.[0-9]{1,2})?`}
                inputMode="decimal"
                enterKeyHint="done"
                placeholder="13600"
                className={`${field} pr-16 sm:pr-3`}
              />
              <button
                type="button"
                onClick={dismissKeyboard}
                className="pointer-events-none absolute right-2 bottom-1.5 rounded px-2 py-1 text-xs font-medium text-brand-600 opacity-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 sm:hidden"
              >
                {w.done}
              </button>
            </div>
          </label>
        </div>
        <p className="text-xs text-gray-500">
          {w.depositNote}
        </p>
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending || limited}
        className="w-full rounded-md bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 sm:w-auto"
      >
        {pending ? w.creating : w.createAndCapture}
      </button>
      </fieldset>
    </form>
  )
}
