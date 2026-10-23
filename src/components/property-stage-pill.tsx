import type { PropertyStage } from '@/lib/property-work'

/// Where a property is, coloured as the app's `PropertyStagePill`.
export function PropertyStagePill({ stage, label }: { stage: PropertyStage; label: string }) {
  const className = stage === 'RUNNING'
    ? 'bg-emerald-50 text-emerald-700'
    : stage === 'CHECK_IN_AWAITING' || stage === 'CHECK_OUT_AWAITING'
      ? 'bg-brand-50 text-brand-700'
      : stage === 'ENDED' ? 'bg-gray-100 text-gray-600' : 'bg-amber-50 text-amber-800'
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
