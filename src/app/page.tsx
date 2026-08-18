import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kivilo: the condition report that writes itself',
  description:
    'Walk the unit narrating what you see. Kivilo drafts the inventory, you review it, both parties sign on your phone, and the landlord gets a link.',
}

/// Public landing page. Static, outside the (app) group, so it carries no session, no
/// upload queue, and no install prompt. The app itself lives at /inspections.

function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
      <span className="size-3.5 rounded-[4px] bg-brand-500" />
      kivilo
    </span>
  )
}

function Eyebrow({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[.12em] text-brand-600 after:h-px after:flex-1 after:bg-gray-200">
      <span className="tabular-nums text-gray-400">{n}</span>
      {children}
    </p>
  )
}

const STEPS = [
  {
    k: 'Capture',
    h: 'Walk the room, talking.',
    p: 'Add rooms with one tap. In each, record a narrated walkthrough and photograph anything with small print: rating plates, serial labels, meter faces. Captures save to the phone first and upload when there is signal.',
  },
  {
    k: 'Draft',
    h: 'The inventory writes itself.',
    p: 'Each room’s video, audio, and photos are read in one pass. Out comes a draft item list with condition notes, meter readings, and serials transcribed character for character, every line tied to the second of footage it came from.',
  },
  {
    k: 'Review',
    h: 'You are the witness. It is the scribe.',
    p: 'Edit any line, add what it missed, remove what it imagined. Uncertain items are flagged. Nothing reaches a signature until a person has been through it.',
  },
  {
    k: 'Sign & share',
    h: 'Countersigned on the spot.',
    p: 'Landlord and tenant sign on your phone at the handover. Then one tap makes a private, revocable link to the report, which opens as a clean document and prints to PDF.',
  },
]

const PROMISES = [
  {
    h: 'A capture is never lost',
    p: 'Video is written to the device the instant it is taken and only leaves once storage confirms it. Bad signal in a basement carpark does not cost you the walkthrough.',
  },
  {
    h: 'Rooms are independent',
    p: 'Re-shoot the kitchen and the bedrooms you already reviewed are untouched. Re-read a room any time.',
  },
  {
    h: 'Private by construction',
    p: 'Captures live in a private bucket behind signed URLs. A report link is unguessable and dies the moment you revoke it. Another agent cannot see your deals, full stop.',
  },
  {
    h: 'Evidence, not opinion',
    p: 'Every model-written line carries a confidence and flips to human-edited the moment you touch it. The timestamped video is what a dispute is argued against.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-white text-gray-900">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Wordmark />
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/login" className="text-gray-600 hover:text-gray-900">
            Sign in
          </Link>
          <Link
            href="/inspections"
            className="rounded-md bg-brand-500 px-3.5 py-2 font-medium text-white hover:bg-brand-600"
          >
            Open Kivilo
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-6 pb-20 pt-12 sm:pt-20">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[.12em] text-brand-600">
            Check-in / check-out for Singapore agents
          </p>
          <h1 className="max-w-3xl text-balance text-[clamp(40px,7vw,72px)] font-extrabold leading-[1.04] tracking-[-.03em]">
            A ten-minute walkthrough becomes the condition report.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-gray-600 sm:text-xl">
            Walk the unit narrating what you see and photograph the labels. Kivilo drafts the
            inventory, you review it, both parties sign on your phone, and the landlord gets a
            link. No evening of typing, no camera roll to dig through two years later.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/inspections"
              className="rounded-md bg-brand-500 px-5 py-3 text-sm font-medium text-white hover:bg-brand-600"
            >
              Start a check-in
            </Link>
            <a
              href="#how"
              className="rounded-md border border-gray-300 px-5 py-3 text-sm font-medium hover:bg-gray-50"
            >
              See how it works
            </a>
          </div>

          {/* App mock, in the deck's style: a phone-width frame of the room list. */}
          <div className="mt-16 grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                <b className="text-gray-900">Room by room, on the phone you already carry.</b>{' '}
                Installs from the browser, works with no signal, and puts the report in the
                landlord&rsquo;s WhatsApp before you leave the unit.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" />
                  Serial numbers read off deliberate photos, not guessed from video
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" />
                  Every item links to the second of footage it was read from
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" />
                  At the end of tenancy, the check-out is compared line by line
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 shadow-[0_1px_2px_rgba(17,24,39,.05),0_20px_48px_-16px_rgba(17,24,39,.22)]">
              <div className="rounded-xl border border-gray-200 bg-white">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold">
                    <span className="size-2.5 rounded-full bg-brand-500" />
                    Kivilo
                  </span>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    In progress
                  </span>
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <p className="text-base font-semibold">Check-in</p>
                    <p className="text-xs text-gray-500">#28-05, 2 Marina Boulevard · Priya Raman</p>
                  </div>
                  {[
                    { room: 'Living room', meta: '1 video, 2 photos · 14 items', badge: 'Reviewed', tone: 'bg-emerald-50 text-emerald-700' },
                    { room: 'Kitchen', meta: '1 video, 4 photos · 19 items', badge: 'Needs review', tone: 'bg-amber-50 text-amber-800' },
                    { room: 'Master bedroom', meta: '1 video', badge: 'Reading', tone: 'bg-blue-50 text-blue-700' },
                    { room: 'Bedroom 2', meta: 'Nothing captured yet', badge: 'Not started', tone: 'bg-gray-100 text-gray-600' },
                  ].map((r) => (
                    <div key={r.room} className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{r.room}</p>
                          <p className="text-xs text-gray-500">{r.meta}</p>
                        </div>
                        <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${r.tone}`}>
                          {r.badge}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs">
                    <p className="font-medium">Refrigerator</p>
                    <p className="mt-0.5 font-mono text-[11px] text-gray-500">
                      SAMSUNG RF48A4000S9/SS SERIAL 0KM74BDT200341N
                    </p>
                    <p className="mt-1 text-gray-600">
                      Small dent on the lower door.{' '}
                      <span className="font-mono text-brand-600">photo</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-t border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <Eyebrow n="01">How it works</Eyebrow>
            <h2 className="max-w-2xl text-balance text-[clamp(28px,4.5vw,42px)] font-bold leading-[1.1] tracking-[-.02em]">
              Four steps, all of them at the unit.
            </h2>
            <div className="mt-9 grid gap-4 sm:grid-cols-2">
              {STEPS.map((s) => (
                <div key={s.k} className="rounded-[14px] border border-gray-200 bg-white p-6">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[.1em] text-brand-600">{s.k}</p>
                  <h3 className="text-[17px] font-semibold">{s.h}</h3>
                  <p className="mt-1.5 text-[14.5px] text-gray-600">{s.p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Check-out */}
        <section className="border-t border-gray-200">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <Eyebrow n="02">End of tenancy</Eyebrow>
            <h2 className="max-w-2xl text-balance text-[clamp(28px,4.5vw,42px)] font-bold leading-[1.1] tracking-[-.02em]">
              The check-out is a diff, not a debate.
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-gray-600">
              Walk the same rooms again. Kivilo compares the check-out against the signed
              check-in item by item, separates fair wear and tear from damage, drafts a
              rationale a landlord and tenant would both accept, and totals the claim against
              the deposit. You overrule any line before anyone signs.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { t: 'Missing fridge', v: 'Tenant liable', tone: 'bg-red-50 text-red-700' },
                { t: 'Scuffed skirting, 24 months', v: 'Fair wear and tear', tone: 'bg-emerald-50 text-emerald-700' },
                { t: 'Cigarette burn on worktop', v: 'Tenant liable', tone: 'bg-red-50 text-red-700' },
              ].map((f) => (
                <div key={f.t} className="rounded-[14px] border border-gray-200 bg-gray-50 p-5">
                  <p className="text-sm font-medium">{f.t}</p>
                  <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${f.tone}`}>
                    {f.v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Promises */}
        <section className="border-t border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <Eyebrow n="03">What we promise</Eyebrow>
            <h2 className="max-w-2xl text-balance text-[clamp(28px,4.5vw,42px)] font-bold leading-[1.1] tracking-[-.02em]">
              Built for the deposit dispute two years from now.
            </h2>
            <div className="mt-9 grid gap-4 sm:grid-cols-2">
              {PROMISES.map((p) => (
                <div key={p.h} className="rounded-[14px] border-[1.5px] border-brand-200 bg-brand-50 p-5">
                  <h3 className="text-[17px] font-semibold text-brand-700">{p.h}</h3>
                  <p className="mt-1.5 text-[14.5px] text-gray-600">{p.p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-gray-200">
          <div className="mx-auto max-w-5xl px-6 py-20 text-center">
            <h2 className="text-balance text-[clamp(28px,4.5vw,42px)] font-bold leading-[1.1] tracking-[-.02em]">
              Try it on your next handover.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
              Sign in with your email, create the check-in, and walk the unit. The first
              report takes about as long as the walkthrough.
            </p>
            <Link
              href="/inspections"
              className="mt-8 inline-block rounded-md bg-brand-500 px-6 py-3 text-sm font-medium text-white hover:bg-brand-600"
            >
              Open Kivilo
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-gray-500">
          <Wordmark />
          <p>Singapore first. Built for the agents who close, the landlords who own, and the tenants who live there.</p>
        </div>
      </footer>
    </div>
  )
}
