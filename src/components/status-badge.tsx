import type { InspectionStatus } from '@/generated/prisma'

const LABELS: Record<InspectionStatus, { text: string; className: string }> = {
  DRAFT: { text: 'Awaiting capture', className: 'bg-gray-100 text-gray-700' },
  CAPTURING: { text: 'In progress', className: 'bg-blue-50 text-blue-700' },
  PROCESSING: { text: 'Reading walkthrough', className: 'bg-blue-50 text-blue-700' },
  REVIEW: { text: 'Needs review', className: 'bg-amber-50 text-amber-800' },
  AWAITING_SIGNATURE: { text: 'Awaiting signatures', className: 'bg-brand-50 text-brand-700' },
  COMPLETED: { text: 'Completed', className: 'bg-emerald-50 text-emerald-700' },
  FAILED: { text: 'Failed', className: 'bg-red-50 text-red-700' },
}

export function StatusBadge({ status }: { status: InspectionStatus }) {
  const { text, className } = LABELS[status]
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {text}
    </span>
  )
}
