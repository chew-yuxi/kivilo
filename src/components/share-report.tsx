'use client'

import { useState, useTransition } from 'react'
import { shareReport, revokeReportLink } from '@/lib/actions'

export function ShareReport({
  inspectionId,
  shareToken,
}: {
  inspectionId: string
  shareToken: string | null
}) {
  const [pending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)

  // Built in the browser so the link carries whatever host the agent is actually on,
  // rather than a base URL baked in at build time.
  const url = shareToken ? `${window.location.origin}/reports/${shareToken}` : null

  if (!url) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-medium">Send the report</h2>
        <p className="mt-1 text-sm text-gray-500">
          Creates a private link to a read-only copy. Anyone holding the link can open
          it, so send it to the landlord and tenant directly rather than posting it
          anywhere.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => void shareReport(inspectionId))}
          className="mt-4 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {pending ? 'Creating…' : 'Create report link'}
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-medium">Report link</h2>
      <p className="mt-1 text-sm text-gray-500">
        Live for as long as the link exists. Revoking it makes the link dead immediately.
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
          {copied ? 'Copied' : 'Copy'}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
        >
          Preview
        </a>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => void revokeReportLink(inspectionId))}
          className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-50"
        >
          Revoke
        </button>
      </div>
    </div>
  )
}
