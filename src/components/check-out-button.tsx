'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { startCheckOut } from '@/lib/actions'

export function CheckOutButton({
  baselineId,
  existingCheckOutId,
}: {
  baselineId: string
  existingCheckOutId: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  if (existingCheckOutId) {
    return (
      <Link
        href={`/inspections/${existingCheckOutId}`}
        className="inline-block text-sm text-brand-600 hover:underline"
      >
        Go to the check-out for this tenancy →
      </Link>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-medium">End of tenancy</h2>
      <p className="mt-1 text-sm text-gray-500">
        This report becomes the baseline. The check-out walkthrough is compared against it
        item by item.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const id = await startCheckOut(baselineId)
            router.push(`/inspections/${id}`)
          })
        }
        className="mt-4 rounded-md border border-gray-300 px-3.5 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
      >
        {pending ? 'Creating…' : 'Start check-out'}
      </button>
    </div>
  )
}
