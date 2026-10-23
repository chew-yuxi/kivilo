'use client'

import type { InspectionStatus } from '@/generated/prisma'
import { usePwa } from '@/components/locale'

const CLASSES: Record<InspectionStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  CAPTURING: 'bg-blue-50 text-blue-700',
  PROCESSING: 'bg-blue-50 text-blue-700',
  REVIEW: 'bg-amber-50 text-amber-800',
  AWAITING_SIGNATURE: 'bg-brand-50 text-brand-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-red-50 text-red-700',
}

export function StatusBadge({ status }: { status: InspectionStatus }) {
  const text = usePwa().inspectionStatus(status)
  const className = CLASSES[status]
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {text}
    </span>
  )
}
