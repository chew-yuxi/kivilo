'use client'

import { useState } from 'react'
import { usePwa } from '@/components/locale'
import { tenancyEndDate } from '@/lib/tenancy-period'

export function TenancyPeriodFields({ initialStart, minimumStart, field }: {
  initialStart: string
  minimumStart?: string
  field: string
}) {
  const w = usePwa()
  const [start, setStart] = useState(initialStart)
  const [years, setYears] = useState(2)
  const [end, setEnd] = useState(() => tenancyEndDate(initialStart, 2))
  return (
    <>
      <label className="block text-sm sm:col-span-2">
        {w.tenancyLength}
        <select className={field} value={years} onChange={event => {
          const next = Number(event.target.value)
          setYears(next)
          if (next) setEnd(tenancyEndDate(start, next))
        }}>
          <option value={1}>{w.oneYear}</option>
          <option value={2}>{w.twoYears}</option>
          <option value={3}>{w.threeYears}</option>
          <option value={0}>{w.customDates}</option>
        </select>
      </label>
      <label className="block text-sm">
        {w.starts}
        <input name="startDate" type="date" required min={minimumStart} value={start} className={field} onChange={event => {
          const next = event.target.value
          setStart(next)
          if (years) setEnd(tenancyEndDate(next, years))
        }} />
      </label>
      <label className="block text-sm">
        {w.ends}
        <input name="endDate" type="date" required min={start || minimumStart} value={end} className={field} onChange={event => {
          setYears(0)
          setEnd(event.target.value)
        }} />
      </label>
    </>
  )
}
