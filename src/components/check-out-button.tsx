'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { startCheckOut } from '@/lib/actions'
import { usePwa } from '@/components/locale'

export function CheckOutButton({
  baselineId,
  existingCheckOutId,
  compact = false,
}: {
  compact?: boolean
  baselineId: string
  existingCheckOutId: string | null
}) {
  const w = usePwa()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  if (existingCheckOutId) {
    return (
      <Link
        href={`/inspections/${existingCheckOutId}`}
        className="action-secondary"
      >
        {w.goToCheckOut}
      </Link>
    )
  }

  return (
    <div className={compact ? undefined : "rounded-lg border border-gray-200 bg-white p-5"}>
      {!compact && <>
        <h2 className="text-sm font-medium">{w.endOfTenancy}</h2>
        <p className="mt-1 text-sm text-gray-500">{w.thisReportBecomesTheBaselineTheCheck}</p>
      </>}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const id = await startCheckOut(baselineId)
            router.push(`/inspections/${id}`)
          })
        }
        className="action-secondary mt-4"
      >
        {pending ? w.creating : w.startCheckOut}
      </button>
    </div>
  )
}
