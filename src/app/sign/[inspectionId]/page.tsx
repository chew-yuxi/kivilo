import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { currentStakeholder, signingRole } from '@/lib/auth'
import { signOwnReport } from '@/lib/actions'
import { reportInclude } from '@/lib/report'
import { reportFingerprint, shortFingerprint } from '@/lib/report-fingerprint'
import { ReportDocument } from '@/components/report-document'
import { SignatureCanvas } from '@/components/signature-pad'
import { SignOut } from '@/components/sign-out'
import { DepositStatementAnswer } from '@/components/deposit-statement-answer'
import { assessmentSnapshotSchema, depositStatement } from '@/lib/assessment-schema'
import { formatDate, messages } from '@/lib/i18n'
import { requestLocale } from '@/lib/i18n/request'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: messages(await requestLocale(await currentStakeholder())).web.sign.pageTitle,
    robots: { index: false, follow: false, nocache: true },
  }
}

/// Where the "please review and sign" email lands. The link is not a credential: it
/// names the report and suggests an address, and the visitor must sign in as the
/// landlord or tenant before seeing anything. Outside `(app)`, like a shared report, so
/// it is a document with no install prompt or upload queue.
export default async function SignPage({ params, searchParams }: PageProps<'/sign/[inspectionId]'>) {
  const { inspectionId } = await params
  const { email } = await searchParams
  const invited = typeof email === 'string' ? email : null
  const here = `/sign/${inspectionId}`
  const login = `/login?${new URLSearchParams({ next: here, ...(invited && { email: invited }) })}`

  const signer = await currentStakeholder()
  if (!signer) redirect(login)
  const locale = await requestLocale(signer)
  const m = messages(locale)
  const words = m.web.sign

  const role = await signingRole(inspectionId, signer.id)
  // Someone else's report, one not yet sent, and one that never existed all read the
  // same, so the page cannot be used to find out which ids are real.
  if (!role) {
    return (
      <div lang={locale} className="mx-auto max-w-md px-6 py-24 text-center">
        <Brand />
        <h1 className="mt-6 text-lg font-semibold">{words.nothingTitle}</h1>
        <p className="mt-2 text-sm text-gray-600">{words.nothingBody(signer.email ?? words.thisAccount)}</p>
        <div className="mt-6 flex justify-center">
          <SignOut email={null} then={login} locale={locale} />
        </div>
      </div>
    )
  }

  const inspection = await db.inspection.findUniqueOrThrow({
    where: { id: inspectionId },
    include: reportInclude,
  })
  const { tenancy } = inspection
  const mine = inspection.signatures.find((signature) => signature.stakeholderId === signer.id)
  const other = role === 'LANDLORD' ? tenancy.tenant : tenancy.landlord
  const awaitingMe = inspection.status === 'AWAITING_SIGNATURE' && !mine
  const kind = m.web.kind[inspection.kind]
  const roleLabel = m.web.role[role]
  // The latest published assessment's deposit statement, while this party has not
  // answered it. Only a completed check-out has one.
  const published = inspection.status === 'COMPLETED' ? inspection.assessments[0] : undefined
  const statementToAnswer =
    published &&
    depositStatement(assessmentSnapshotSchema.parse(published.snapshot)) &&
    !published.responses.some((response) => response.stakeholderId === signer.id)
      ? published
      : null

  return (
    <div className="mx-auto max-w-3xl">
      <div lang={locale} className="contents">
      <header className="flex items-center justify-between gap-4 px-5 pt-5 sm:px-10 print:hidden">
        <Brand />
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="truncate">{m.web.signedInAs(signer.email ?? signer.name)}</span>
          <SignOut email={null} then={login} locale={locale} />
        </div>
      </header>

      <div className="mx-5 mt-5 rounded-lg border px-4 py-3 text-sm sm:mx-10 print:hidden">
        {awaitingMe && (
          <p>
            <span className="font-medium">{words.awaitingLead}</span> {words.awaitingBody(kind, roleLabel)}
          </p>
        )}
        {inspection.status === 'AWAITING_SIGNATURE' && mine && (
          <p>
            <span className="font-medium">{words.signedLead}</span>{' '}
            {words.signedBody(formatDate(m, mine.signedAt, { dateStyle: 'medium', timeStyle: 'short' }), other.name)}
          </p>
        )}
        {statementToAnswer && (
          <p className="mb-2">
            <span className="font-medium">{words.statementLead}</span> {words.statementBody}
          </p>
        )}
        {inspection.status === 'COMPLETED' && (
          <p>
            <span className="font-medium">{words.completedLead}</span> {words.completedBody(Boolean(signer.email))}
          </p>
        )}
      </div>

      {role === 'TENANT' && mine && inspection.kind === 'CHECK_IN' && (
        <p className="mx-5 mt-4 text-sm sm:mx-10 print:hidden">
          <Link href={`/handover/${inspectionId}`} className="font-medium text-brand-700 underline">{words.handoverLink}</Link>
        </p>
      )}
      </div>

      <ReportDocument
        inspection={inspection}
        pdfHref={inspection.status === 'COMPLETED' ? `${here}/pdf` : null}
      />

      {statementToAnswer && (
        <section lang={locale} className="space-y-3 px-5 pb-12 sm:px-10 print:hidden">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{words.answerHeading}</h2>
          <DepositStatementAnswer inspectionId={inspectionId} version={statementToAnswer.version} locale={locale} />
        </section>
      )}

      {awaitingMe && (
        <section lang={locale} className="space-y-3 px-5 pb-12 sm:px-10 print:hidden">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{words.signatureHeading}</h2>
          <p className="text-sm text-gray-600">
            {words.agreementBefore}{' '}
            <span className="font-mono">{shortFingerprint(await reportFingerprint(db, inspectionId))}</span>
            {words.agreementAfter}
          </p>
          <SignatureCanvas
            label={
              <>
                {signer.name} <span className="font-normal text-gray-500">({roleLabel})</span>
              </>
            }
            onSign={signOwnReport.bind(null, inspectionId)}
            locale={locale}
          />
        </section>
      )}
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center justify-center gap-2">
      <span className="size-2.5 rounded-full bg-brand-500" />
      <span className="text-sm font-semibold tracking-tight">Kivilo</span>
    </div>
  )
}
