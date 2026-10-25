'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'

/// A six digit code rather than a magic link. A link opens the phone's default browser,
/// which for an installed PWA means the agent lands in Safari instead of the app they
/// were just using, with no session in the app itself. A code keeps them where they are.
export function LoginForm() {
  const params = useSearchParams()
  const next = params.get('next') || '/inspections'

  const [stage, setStage] = useState<'email' | 'code'>('email')
  // A signing link carries the address it was sent to, so the landlord or tenant only
  // has to ask for the code. Still just a suggestion: they can type any address, and
  // the code is what proves it.
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendCode(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    setBusy(false)
    if (error) return setError(error.message)
    setStage('code')
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabaseBrowser().auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'email',
    })
    if (error) {
      setBusy(false)
      return setError('That code is not right, or it has expired. Check the email or request a new one.')
    }

    // Deliberately stay busy, and leave with a full page load rather than the router.
    // The landing page's links prefetch /inspections while the visitor is signed out,
    // and the client router keeps what came back: the proxy's redirect to /login. A
    // router navigation after sign-in replayed that redirect, so the agent landed back
    // here with the button stuck on "Working…" and /inspections was never requested. A
    // full load discards everything the router cached under the old session. It also
    // tears this page down, so there is nothing to reset, and the button keeps saying
    // "Working…" through the seconds a first sign-in's server render can take.
    //
    // `next` comes from the URL, so anyone can link here with their own. A full load
    // would follow it off site, so it must resolve to this origin. A prefix check is not
    // enough: browsers read `/\evil.com` as `//evil.com`.
    const target = new URL(next, window.location.href)
    window.location.replace(
      target.origin === window.location.origin ? target.href : '/inspections',
    )
  }

  return (
    <form onSubmit={stage === 'email' ? sendCode : verify} className="mt-4 space-y-5" aria-busy={busy}>
      <p className="mb-8 text-lg leading-relaxed text-gray-600">
        {stage === 'email'
          ? 'Enter your email to get started or sign back in.'
          : 'Check your email and enter the code to continue.'}
      </p>
      <label className="block text-lg font-medium text-gray-700">
        Email
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          disabled={stage === 'code'}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 min-h-14 w-full min-w-0 rounded-xl border border-gray-300 bg-white px-4 py-3 text-lg font-normal focus:border-brand-500 disabled:bg-gray-50 disabled:text-gray-600"
        />
      </label>

      {stage === 'code' && (
        <p className="text-lg leading-relaxed break-words text-gray-600" role="status">
          Sent to <span className="font-medium text-gray-800">{email}</span>. It can take a
          minute; check spam if it does not arrive.
        </p>
      )}

      {stage === 'code' && (
        <label className="block text-lg font-medium text-gray-700">
          Six digit code
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-2 min-h-14 w-full min-w-0 rounded-xl border border-gray-300 bg-white px-4 py-3 font-mono text-2xl font-normal tracking-widest focus:border-brand-500"
          />
        </label>
      )}

      {error && <p className="text-lg leading-relaxed text-red-700" role="alert">{error}</p>}

      {stage === 'email' && <p className="text-lg leading-relaxed text-gray-600">We’ll email you a six-digit code. No password needed.</p>}

      <button
        type="submit"
        disabled={busy}
        className="min-h-14 w-full rounded-xl bg-brand-600 px-4 py-3 text-lg font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {busy ? 'Working…' : stage === 'email' ? 'Email me a code' : 'Sign in'}
      </button>

      {stage === 'code' && (
        <button
          type="button"
          onClick={() => {
            setStage('email')
            setCode('')
            setError(null)
          }}
          className="min-h-14 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-lg font-medium text-gray-700 hover:bg-gray-50"
        >
          Use a different email
        </button>
      )}
    </form>
  )
}
