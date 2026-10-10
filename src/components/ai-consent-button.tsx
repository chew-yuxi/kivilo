'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { grantAiConsent } from '@/lib/ai-consent'

export function AiConsentButton({ inspectionId }: { inspectionId: string }) {
  const [pending, startTransition] = useTransition()
  const [accepted, setAccepted] = useState(false)
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  if (accepted) return null

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
      <p className="font-medium">AI processing permission</p>
      <p className="mt-1 text-gray-700">
        To draft this report, Kivilo sends room photos, video and narration to Google
        Gemini. For check-out comparisons, it sends the reviewed inventory to Anthropic
        Claude. Review every draft before signing or publishing it.
      </p>
      {error && <p className="mt-2 text-red-700">{error}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => {
          setError(null)
          try {
            await grantAiConsent(inspectionId)
            setAccepted(true)
            router.refresh()
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Could not save your choice')
          }
        })}
        className="mt-3 rounded-md bg-brand-600 px-3 py-2 font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'I agree to AI processing for this inspection'}
      </button>
    </div>
  )
}
