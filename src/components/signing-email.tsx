'use client'

import { useState, useTransition } from 'react'
import { emailSigningLink } from '@/lib/actions'
import type { SigningEmailState } from '@/lib/report-email'
import { useLocale, usePwa } from '@/components/locale'
import { formatDate, messages } from '@/lib/i18n'

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
  const w = usePwa()
  const m = messages(useLocale())
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const status = !email
    ? w.noEmailOnFile
    : !signingEmail
      ? w.notEmailed(email)
      : signingEmail.state === 'SENT'
        ? w.signingLinkEmailed(email, formatDate(m, signingEmail.at, { dateStyle: 'medium', timeStyle: 'short' }))
        : signingEmail.state === 'QUEUED'
          ? w.emailingSigningLink(email)
          : w.couldNotEmail(email)

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
          className="action-secondary shrink-0 px-3 text-xs"
        >
          {signingEmail ? w.resendLink : w.emailSigningLink}
        </button>
      )}
    </div>
  )
}
