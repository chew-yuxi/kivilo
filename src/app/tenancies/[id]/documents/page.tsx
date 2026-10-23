import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { currentStakeholder } from '@/lib/auth'
import { supportingDocumentsWorkspace } from '@/lib/supporting-documents'
import { SupportingDocumentsPanel } from '@/components/supporting-documents-panel'
import { SignOut } from '@/components/sign-out'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Documents',
  robots: { index: false, follow: false, nocache: true },
}

// An emailed request is a navigation link, never a credential. This page belongs
// to all tenancy participants, outside the inspector's workspace navigation.
export default async function SupportingDocumentsPage({ params, searchParams }: PageProps<'/tenancies/[id]/documents'>) {
  const { id } = await params
  const query = await searchParams
  const requestedRequestId = typeof query.requestId === 'string' ? query.requestId : undefined
  const destination = `/tenancies/${id}/documents${requestedRequestId ? `?${new URLSearchParams({ requestId: requestedRequestId })}` : ''}`
  const login = `/login?${new URLSearchParams({ next: destination })}`
  const viewer = await currentStakeholder()
  if (!viewer) redirect(login)

  const workspace = await supportingDocumentsWorkspace(id, viewer.id).catch((error: unknown) => {
    if (error instanceof Error && /not found/i.test(error.message)) notFound()
    throw error
  })

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-6 sm:px-8 sm:py-10">
      <header className="mb-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold tracking-tight">Kivilo</span>
          <SignOut email={null} then={login} />
        </div>
        <div>
          {workspace.role === 'agent' && (
            <Link href="/inspections" className="text-link mb-3 inline-flex min-h-11 items-center text-sm">← My work</Link>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="mt-2 break-words text-sm text-gray-600">{workspace.propertyLabel}</p>
          <p data-testid="tenancy-context" className="mt-1 break-words text-sm text-gray-600">
            {workspace.tenantName} · {new Date(workspace.startDate).toLocaleDateString('en-SG', { dateStyle: 'medium', timeZone: 'Asia/Singapore' })}
            {' – '}{new Date(workspace.endDate).toLocaleDateString('en-SG', { dateStyle: 'medium', timeZone: 'Asia/Singapore' })}
          </p>
          <p className="mt-1 break-words text-xs text-gray-500">Signed in as {viewer.email ?? viewer.name}</p>
        </div>
      </header>
      <SupportingDocumentsPanel workspace={workspace} viewerId={viewer.id} requestedRequestId={requestedRequestId} />
    </main>
  )
}
