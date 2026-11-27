'use client'

import Link from 'next/link'
import type { inspectionHandover } from '@/lib/handover'
import { countryName } from '@/lib/country'
import { usePwa } from '@/components/locale'

type Handover = Awaited<ReturnType<typeof inspectionHandover>>

/// Render the same matrix as the native card, with the four-module quiet zone a
/// scanner needs. The payload contains only the authenticated handover page's URL.
export function TenantHandoverCard({ handover, tenantName, tenantEmail }: {
  handover: Handover; tenantName: string; tenantEmail: string | null
}) {
  const w = usePwa()
  const size = handover.modules.length
  return (
    <section className="rounded-lg border border-brand-200 bg-brand-50 p-5">
      <h2 className="text-base font-semibold">{w.tenantsHandover(tenantName)}</h2>
      <div className="mt-3 flex flex-col items-start gap-4 sm:flex-row">
        <svg role="img" aria-label={w.scanHandover} viewBox={`0 0 ${size + 8} ${size + 8}`} className="size-48 shrink-0 bg-white" shapeRendering="crispEdges">
          <rect width={size + 8} height={size + 8} fill="white" />
          {handover.modules.flatMap((row, y) => row.flatMap((dark, x) =>
            dark ? [<rect key={`${x}-${y}`} x={x + 4} y={y + 4} width="1" height="1" fill="black" />] : []))}
        </svg>
        <div className="space-y-2 text-sm">
          <p>{w.theTenantHasSignedAskThemTo}{tenantEmail ? ` with ${tenantEmail}` : w.withTheEmailOnTheirTenancy}.</p>
          <p>{handover.deadline ? `Move-in defects can be reported until ${handover.deadline}, end of day in ${countryName(handover.country)}.` : w.defectPeriodDisabledApp}</p>
          <p className="text-xs text-gray-600">{tenantEmail ? w.handoverEmailed : w.noEmailConfirm}</p>
          <Link href={handover.url} className="inline-block font-medium text-brand-700 underline">{w.openTenantHandover}</Link>
        </div>
      </div>
    </section>
  )
}
