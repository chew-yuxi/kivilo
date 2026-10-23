'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { restoreFromWeb } from '@/lib/bin-web-actions'

export function RestoreButton({ binItemId, propertyId }: { binItemId: string; propertyId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="mt-2">
      <button
        className="action-secondary"
        disabled={pending}
        onClick={() => startTransition(async () => {
          setError(null)
          const result = await restoreFromWeb(binItemId, propertyId)
          if (!result.ok) setError(result.error)
          else router.refresh()
        })}
      >
        {pending ? 'Restoring…' : 'Restore'}
      </button>
      {error && <p className="mt-2 text-sm text-red-800" role="alert">{error}</p>}
    </div>
  )
}
