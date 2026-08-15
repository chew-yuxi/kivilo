import Link from 'next/link'
import { NewInspectionForm } from '@/components/new-inspection-form'

export const metadata = { title: 'New check-in' }

export default function NewInspectionPage() {
  return (
    <div className="mx-auto max-w-xl">
      <Link href="/" className="text-sm text-gray-500 hover:underline">
        ← All inspections
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">New check-in</h1>
      <p className="mt-1 text-sm text-gray-500">
        Just enough to start capturing. The landlord and tenant only need names now;
        their details can be filled in before the report is signed.
      </p>
      <NewInspectionForm />
    </div>
  )
}
