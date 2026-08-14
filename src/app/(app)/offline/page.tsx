export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
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
