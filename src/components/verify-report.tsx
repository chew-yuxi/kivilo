'use client'

import { useState } from 'react'
import type { ReportVerification } from '@/lib/report-verification'

type Result =
  | { state: 'idle' }
  | { state: 'checking'; name: string }
  | { state: 'match'; name: string; report: ReportVerification }
  | { state: 'unknown'; name: string }
  | { state: 'failed'; name: string }

export function VerifyReport() {
  const [result, setResult] = useState<Result>({ state: 'idle' })

  const check = async (file: File) => {
    setResult({ state: 'checking', name: file.name })
    // The file never leaves the device; the SHA-256 of its bytes is all that is sent.
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
    const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
    const response = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sha256 }),
    })
    if (!response.ok) {
      setResult({ state: 'failed', name: file.name })
      throw new Error(`Report check failed with ${response.status}`)
    }
    const body = (await response.json()) as { match: true; report: ReportVerification } | { match: false }
    setResult(body.match ? { state: 'match', name: file.name, report: body.report } : { state: 'unknown', name: file.name })
  }

  return (
    <div className="mt-8 space-y-6">
      <label className="block cursor-pointer rounded-lg border-2 border-dashed border-gray-300 bg-white p-8 text-center hover:border-brand-500">
        <span className="text-sm font-medium text-brand-600">Choose a report PDF</span>
        <input
          type="file"
          accept="application/pdf"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void check(file)
            e.target.value = ''
          }}
        />
      </label>

      {result.state === 'checking' && <p className="text-sm text-gray-600">Checking {result.name}…</p>}

      {result.state === 'failed' && (
        <p role="status" className="text-sm text-red-700">
          {result.name} could not be checked just now. Try again in a moment.
        </p>
      )}

      {result.state === 'unknown' && (
        <div role="status" className="rounded-lg border border-red-200 bg-red-50 p-5">
          <p className="font-semibold text-red-800">Not a report we issued</p>
          <p className="mt-1 text-sm text-red-800">
            {result.name} does not match any report PDF Kivilo has issued. Either it did not
            come from Kivilo, or it has been changed since, even by a single byte. Ask for the
            report to be sent again from Kivilo.
          </p>
        </div>
      )}

      {result.state === 'match' && (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-semibold text-emerald-800">Genuine and unaltered</p>
          <p className="mt-1 text-sm text-emerald-900">
            {result.name} is a {result.report.kind.toLowerCase()} for {result.report.property},
            issued by Kivilo on {result.report.issuedAt}.
          </p>
          {result.report.newerCopyIssuedAt && (
            <p className="mt-2 text-sm text-amber-800">
              A newer copy was issued on {result.report.newerCopyIssuedAt}, after something was
              added to the report. This copy is genuine but not the latest.
            </p>
          )}
          <ul className="mt-4 space-y-2 text-sm text-gray-800">
            {result.report.signatures.map((signature) => (
              <li key={`${signature.role}-${signature.signedAt}`}>
                <span className="font-medium">{signature.name}</span> ({signature.role.toLowerCase()}),
                signed {signature.signedAt}
                {signature.fingerprint && (
                  <span className="block font-mono text-xs text-gray-500">
                    Content fingerprint {signature.fingerprint}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {result.report.signatures.some((signature) => signature.fingerprint) && (
            <p className="mt-4 text-xs text-gray-600">
              Each fingerprint should match the one printed beside that signature in the PDF.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
