import type { Metadata } from 'next'
import Link from 'next/link'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Mobility — check-in / check-out',
  description: 'Condition reports that write themselves from a walkthrough video.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-6">
            <Link href="/" className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-brand-500" />
              <span className="text-sm font-semibold tracking-tight">Mobility</span>
            </Link>
            <span className="text-sm text-gray-400">Check-in / check-out</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
      </body>
    </html>
  )
}
