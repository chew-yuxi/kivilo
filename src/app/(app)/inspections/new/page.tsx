import Link from 'next/link'
import { NewInspectionForm } from '@/components/new-inspection-form'
import { requireAgent } from '@/lib/auth'
import { workspacePlan } from '@/lib/plan'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'New check-in' }

/// `createInspection` refuses past the plan's limit, and that refusal is the control.
/// This check is the explanation: a thrown server action message is hidden in a
/// production build, so the agent would otherwise fill in the whole form for nothing.
export default async function NewInspectionPage() {
  const { active, limit } = await workspacePlan(await requireAgent())

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/inspections" className="text-link inline-flex min-h-11 items-center text-sm">
        ← All inspections
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">New check-in</h1>
      {active >= limit ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5" data-testid="plan-limit">
          <p className="text-sm font-medium">
            Your plan&apos;s {limit} active {limit === 1 ? 'property is' : 'properties are'} in use
          </p>
          <p className="mt-1 text-sm text-gray-500">
            A property stops counting when its check-out is signed or its tenancy ends.
          </p>
          <Link
            href="/account"
            className="mt-4 inline-block rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            See your plan
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-gray-500">
            Just enough to start capturing. The landlord and tenant only need names now;
            their details can be filled in before the report is signed.
          </p>
          <NewInspectionForm />
        </>
      )}
    </div>
  )
}
