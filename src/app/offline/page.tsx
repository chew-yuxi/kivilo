/// Outside the authenticated group on purpose. This is the page the service worker
/// caches at install and serves when a navigation fails, so it must render the same
/// with or without a session; if it needed auth, the cached copy would depend on who
/// was signed in when the worker installed, and would redirect when offline.
export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <div className="mb-6 flex items-center justify-center gap-2">
        <span className="size-2.5 rounded-full bg-brand-500" />
        <span className="text-sm font-semibold tracking-tight">Kivilo</span>
      </div>
      <h1 className="text-lg font-semibold">You&rsquo;re offline</h1>
      <p className="mt-2 text-sm text-gray-600">
        Anything you captured is saved on this device and will upload by itself once you
        have signal. You can close the app safely; nothing is lost.
      </p>
      <p className="mt-4 text-sm text-gray-500">
        Rooms you haven&rsquo;t loaded yet need a connection to open.
      </p>
    </div>
  )
}
