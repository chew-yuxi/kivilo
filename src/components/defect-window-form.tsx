'use client'

import { useState, useTransition } from 'react'
import { setDefectWindow } from '@/lib/handover-actions'
import type { Country } from '@/generated/prisma'
import { usePwa } from '@/components/locale'

export function DefectWindowForm({ tenancyId, inspectionId, windowDays, deadline, country }: {
  tenancyId: string; inspectionId: string; windowDays: number; deadline: string | null; country: Country
}) {
  const w = usePwa()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <form
      className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault()
        const days = Number(new FormData(event.currentTarget).get('days'))
        setError(null)
        startTransition(async () => {
          try {
            await setDefectWindow(tenancyId, days, inspectionId)
          } catch (failure) {
            setError(failure instanceof Error ? failure.message : String(failure))
          }
        })
      }}
    >
      <h2 className="text-sm font-medium">{w.defectPeriod}</h2>
      <p className="text-sm text-gray-600">
        {w.defectPeriodBody}
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          {w.calendarDays}
          <input name="days" type="number" min={0} max={365} step={1} defaultValue={windowDays} required className="mt-1 block w-28 rounded-md border border-gray-300 px-3 py-2" />
        </label>
        <button type="submit" disabled={pending} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium disabled:opacity-50">
          {pending ? w.saving : w.savePeriod}
        </button>
      </div>
      <p className="text-xs text-gray-500">
        {deadline ? w.currentDeadline(deadline, country === 'MY' ? w.malaysia : w.singapore) : w.defectPeriodDisabled}
      </p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </form>
  )
}
