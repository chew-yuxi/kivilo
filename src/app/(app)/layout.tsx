import Link from 'next/link'
import { UploadQueueProvider } from '@/components/upload-queue'
import { ServiceWorker } from '@/components/service-worker'

/// Everything an inspector sees. Shared reports live outside this group and get none
/// of it, so a landlord following a link never meets the upload queue or an install
/// prompt for an app they have no reason to install.
export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <UploadQueueProvider>
      <div className="flex min-h-full flex-col bg-gray-50">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-6">
            <Link href="/" className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-brand-500" />
              <span className="text-sm font-semibold tracking-tight">Kivilo</span>
            </Link>
            <span className="hidden text-sm text-gray-400 sm:inline">Check-in / check-out</span>
            <div className="ml-auto">
              <ServiceWorker />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 pb-24">{children}</main>
      </div>
    </UploadQueueProvider>
  )
}
