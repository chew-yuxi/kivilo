import Link from 'next/link'
import { currentAgent } from '@/lib/auth'
import { db } from '@/lib/db'
import { requestAccountDeletion } from '@/lib/account-actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Delete your Kivilo account' }

export default async function DeleteAccountPage() {
  const agent = await currentAgent()
  const request = agent
    ? await db.accountDeletionRequest.findUnique({
        where: { stakeholderId: agent.id },
      })
    : null

  async function submit() {
    'use server'
    await requestAccountDeletion()
  }

  return (
    <main className="mx-auto max-w-lg px-5 py-12">
      <Link href="/inspections" className="text-sm text-brand-600 hover:underline">
        ← Kivilo
      </Link>
      <h1 className="mt-8 text-2xl font-semibold">Delete your account</h1>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        You can request deletion of your account and personal data here. We will confirm
        the request, complete it within 30 days, and tell you when it is done. Records
        that must be retained for another party or a legal obligation will be explained
        during fulfillment.
      </p>
      {!agent ? (
        <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-5 text-sm">
          <p className="font-medium">How to request deletion</p>
          <p className="mt-2 text-gray-600">
            Sign in with your Kivilo account, then submit the request on this page. If
            you cannot sign in, email{' '}
            <a className="text-brand-600 underline" href="mailto:hello@nottoosweetlabs.com?subject=Kivilo%20account%20deletion">
              hello@nottoosweetlabs.com
            </a>{' '}
            from your account address so we can help verify the request.
          </p>
          <Link href="/login?next=%2Fdelete-account" className="mt-4 inline-block rounded-md bg-brand-600 px-4 py-2.5 font-medium text-white">
            Sign in to request deletion
          </Link>
        </div>
      ) : request ? (
        <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-5 text-sm">
          <p className="font-medium">
            {request.status === 'COMPLETED'
              ? 'Your account deletion is complete.'
              : 'Your deletion request has been received.'}
          </p>
          <p className="mt-2 text-gray-600">
            Requested {request.requestedAt.toLocaleDateString('en-SG')}.{' '}
            {request.status === 'COMPLETED'
              ? `Completed ${request.completedAt?.toLocaleDateString('en-SG') ?? ''}.`
              : `Due by ${request.dueAt.toLocaleDateString('en-SG')}.`}
          </p>
        </div>
      ) : (
        <form action={submit} className="mt-8">
          <button
            type="submit"
            className="rounded-md bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Request account deletion
          </button>
        </form>
      )}
    </main>
  )
}
