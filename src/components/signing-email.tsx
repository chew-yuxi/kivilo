'use client'

import { useState, useTransition } from 'react'
import { emailSigningLink } from '@/lib/actions'
import type { SigningEmailState } from '@/lib/report-email'

/// Beside each party's signature: whether they have been emailed the signing link, and
/// a button to send it again. Send emails it to both automatically.
export function SigningEmail({
  inspectionId,
  stakeholderId,
  email,
  signingEmail,
  canSend,
}: {
  inspectionId: string
  stakeholderId: string
  email: string | null
  signingEmail: { state: SigningEmailState; at: Date } | null
  canSend: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const status = !email
    ? 'No email on file'
    : !signingEmail
      ? `Not emailed (${email})`
      : signingEmail.state === 'SENT'
        ? `Signing link emailed to ${email}, ${signingEmail.at.toLocaleString('en-SG')}`
        : signingEmail.state === 'QUEUED'
          ? `Emailing the signing link to ${email}…`
          : `Could not email ${email}`

  return (
    <div className="mt-1.5 flex items-center justify-between gap-3 px-1 text-xs text-gray-500">
      <span>{error ?? status}</span>
      {email && canSend && (
        <button
          type="button"
          disabled={pending || signingEmail?.state === 'QUEUED'}
          onClick={() => {
            setError(null)
            startTransition(async () => {
              try {
                await emailSigningLink(inspectionId, stakeholderId)
              } catch (failure) {
                setError(failure instanceof Error ? failure.message : String(failure))
              }
            })
          }}
          className="shrink-0 font-medium text-brand-600 hover:underline disabled:opacity-40"
        >
          {signingEmail ? 'Resend link' : 'Email signing link'}
        </button>
      )}
    </div>
  )
}
