'use client'

import { useState, useSyncExternalStore, useTransition } from 'react'
import { shareReport, revokeReportLink } from '@/lib/actions'
import { usePwa } from '@/components/locale'

export function ShareReport({
  inspectionId,
  shareToken,
}: {
  inspectionId: string
  shareToken: string | null
}) {
  const w = usePwa()
  const [pending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)

  // Built in the browser so the link carries whatever host the agent is actually on,
  // rather than a base URL baked in at build time. The server has no window, so it
  // renders the path alone and the origin joins it on hydration.
  const origin = useSyncExternalStore(subscribeToNothing, () => window.location.origin, () => '')
  const url = shareToken ? `${origin}/reports/${shareToken}` : null

  if (!url) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-medium">{w.sendTheReport}</h2>
        <p className="mt-1 text-sm text-gray-500">
          {w.createLinkBody}
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => void shareReport(inspectionId))}
          className="mt-4 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {pending ? w.creating : w.createReportLink}
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-medium">{w.reportLink}</h2>
      <p className="mt-1 text-sm text-gray-500">
        {w.reportLinkBody}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs">
          {url}
        </code>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(url).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            })
          }}
          className="rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          {copied ? w.copied : w.copy}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
        >
          {w.preview}
        </a>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => void revokeReportLink(inspectionId))}
          className="action-danger px-3 text-xs"
        >
          {w.revoke}
        </button>
      </div>
    </div>
  )
}

const subscribeToNothing = () => () => {}
