import Link from 'next/link'

/// Also what a revoked or mistyped report link lands on, which is why the wording does
/// not assume the visitor is a signed-in agent, and does not confirm whether the thing
/// they asked for ever existed.
export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <div className="mb-6 flex items-center justify-center gap-2">
        <span className="size-2.5 rounded-full bg-brand-500" />
        <span className="text-sm font-semibold tracking-tight">Kivilo</span>
      </div>
      <h1 className="text-lg font-semibold">Not found</h1>
      <p className="mt-2 text-sm text-gray-600">
        This page is not available. If you followed a link to a condition report, it may
        have been withdrawn by the agent who sent it; ask them for a new one.
      </p>
      <Link href="/" className="mt-6 inline-block text-sm text-brand-600 hover:underline">
        Go to Kivilo
      </Link>
    </div>
  )
}
