'use client'

import { useState, useSyncExternalStore, useTransition } from 'react'
import { agreeMoveInDefectAsSelf, disputeMoveInDefectAsSelf } from '@/lib/move-in-defect-actions'
import { messages, type Locale } from '@/lib/i18n'
import { useLocale } from '@/components/locale'

const subscribeNever = () => () => {}

export function MoveInDefectResponse({ addendumId, locale }: { addendumId: string; locale?: Locale }) {
  const contextLocale = useLocale()
  const web = messages(locale ?? contextLocale).web
  const words = web.moveIn
  const [pending, startTransition] = useTransition()
  const [disputing, setDisputing] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false)

  function answer(dispute: boolean) {
    startTransition(async () => {
      setError(null)
      try {
        if (dispute) await disputeMoveInDefectAsSelf(addendumId, reason.trim())
        else setError((await agreeMoveInDefectAsSelf(addendumId)).error)
      } catch {
        setError(words.failed)
      }
    })
  }

  return (
    <div>
      <h2 className="text-base font-semibold">{words.question}</h2>
      <p className="mt-1 text-sm text-gray-700">{words.explain}</p>
      <div className="action-group mt-4">
        <button
          type="button"
          disabled={!hydrated || pending}
          onClick={() => answer(false)}
          className="action-secondary"
        >
          {pending ? web.recording : words.agree}
        </button>
        <button
          type="button"
          disabled={!hydrated || pending}
          onClick={() => setDisputing(!disputing)}
          className="action-secondary"
        >
          {disputing ? words.cancelDispute : web.dispute}
        </button>
      </div>
      {disputing && (
        <form className="mt-4" onSubmit={(event) => { event.preventDefault(); answer(true) }}>
          <label className="block text-sm font-medium" htmlFor="move-in-dispute-reason">{words.why}</label>
          <textarea
            id="move-in-dispute-reason"
            required
            maxLength={2000}
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm"
          />
          <button
            type="submit"
            disabled={!hydrated || pending || !reason.trim()}
            className="action-primary mt-3"
          >
            {web.recordDispute}
          </button>
        </form>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  )
}
