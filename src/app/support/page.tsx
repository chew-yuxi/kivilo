import Link from 'next/link'

export const metadata = { title: 'Kivilo support' }

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-gray-800">
      <Link href="/" className="text-sm text-brand-600 hover:underline">← Kivilo</Link>
      <h1 className="mt-8 text-3xl font-semibold">Support</h1>
      <p className="mt-4 leading-relaxed">
        Kivilo is provided by NotTooSweetLabs Pte. Ltd. in Singapore. For help with
        sign-in, captures, a condition report, or a deletion request, email{' '}
        <a className="text-brand-600 underline" href="mailto:hello@nottoosweetlabs.com">
          hello@nottoosweetlabs.com
        </a>.
      </p>
      <p className="mt-4 leading-relaxed">
        If a capture has not uploaded, keep the app and its saved data on your phone.
        Include the inspection and room name in your message, but do not email private
        property photos or sign-in codes.
      </p>
      <p className="mt-6 text-sm">
        You can also <Link href="/delete-account" className="text-brand-600 underline">
          request account deletion online
        </Link>.
      </p>
    </main>
  )
}
