import Link from 'next/link'
import type { inspectionHandover } from '@/lib/handover'

type Handover = Awaited<ReturnType<typeof inspectionHandover>>

/// Render the same matrix as the native card, with the four-module quiet zone a
/// scanner needs. The payload contains only the authenticated handover page's URL.
export function TenantHandoverCard({ handover, tenantName, tenantEmail }: {
  handover: Handover; tenantName: string; tenantEmail: string | null
}) {
  const size = handover.modules.length
  return (
    <section className="rounded-lg border border-brand-200 bg-brand-50 p-5">
      <h2 className="text-base font-semibold">{tenantName}&apos;s handover</h2>
      <div className="mt-3 flex flex-col items-start gap-4 sm:flex-row">
        <svg role="img" aria-label="Scan to open your tenant handover" viewBox={`0 0 ${size + 8} ${size + 8}`} className="size-48 shrink-0 bg-white" shapeRendering="crispEdges">
          <rect width={size + 8} height={size + 8} fill="white" />
          {handover.modules.flatMap((row, y) => row.flatMap((dark, x) =>
            dark ? [<rect key={`${x}-${y}`} x={x + 4} y={y + 4} width="1" height="1" fill="black" />] : []))}
        </svg>
        <div className="space-y-2 text-sm">
          <p>The tenant has signed. Ask them to scan this code on their own phone and sign in{tenantEmail ? ` with ${tenantEmail}` : ' with the email on their tenancy'}.</p>
          <p>{handover.deadline ? `Move-in defects can be reported until ${handover.deadline}, end of day in Singapore.` : 'The early move-in defect period is disabled. Repairs can still be reported in the Kivilo app.'}</p>
          <p className="text-xs text-gray-600">{tenantEmail ? 'Their handover link and deadline will also be emailed to them.' : 'No email is on file. Confirm their email with them before asking them to sign in.'}</p>
          <Link href={handover.url} className="inline-block font-medium text-brand-700 underline">Open tenant handover</Link>
        </div>
      </div>
    </section>
  )
}
