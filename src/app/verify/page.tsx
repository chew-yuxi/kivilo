import Link from 'next/link'
import { VerifyReport } from '@/components/verify-report'

export const metadata = { title: 'Check a Kivilo report' }

export default function VerifyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-gray-800">
      <Link href="/" className="text-sm text-brand-600 hover:underline">← Kivilo</Link>
      <h1 className="mt-8 text-3xl font-semibold">Check a report</h1>
      <p className="mt-4 leading-relaxed">
        Choose a Kivilo report PDF to see whether it is a copy we issued, unaltered since,
        and who signed it. The file is checked on this device and is not uploaded: only a
        fingerprint of it is sent.
      </p>
      <VerifyReport />
    </main>
  )
}
