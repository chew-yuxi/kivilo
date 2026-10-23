import { Resend } from 'resend'
import type { ErrorEvent } from '@/generated/prisma'
import { formatDate, type Messages } from '@/lib/i18n'
import { en } from '@/lib/i18n/en'

/// Sign-in email, sent by us rather than by Supabase's dashboard templates.
///
/// Supabase still mints and validates the code; it just hands it to
/// `src/app/api/auth/send-email/route.ts` instead of mailing it. That keeps the wording
/// an agent reads in the repo, where it changes through review like anything else, and
/// off the built-in mailer, which is capped at two messages an hour project wide.

/// Server-only. Constructed per call rather than at module load so importing this file
/// does not throw in an environment that never sends.
function resend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY must be set')
  return new Resend(key)
}

function sender() {
  const from = process.env.RESEND_FROM_EMAIL
  if (!from) throw new Error('RESEND_FROM_EMAIL must be set')
  return from
}

/// Exported so the unit test can assert on the body without sending anything.
///
/// Deliberately contains no link. Sign-in is a code precisely because a link opens the
/// phone's default browser and strands an installed PWA in Safari with no session, so a
/// clickable shortcut here would quietly undo that decision.
export function signInEmail(code: string, m: Messages = en) {
  const words = m.email.signIn
  return {
    /// The code leads the subject so it shows in a phone's notification preview and the
    /// agent does not have to leave the app to read it.
    subject: words.subject(code),
    text: [
      words.line(code),
      '',
      words.enterText,
      '',
      words.ignore,
    ].join('\n'),
    html: `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827">
    <div style="max-width:420px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:32px">
      <h1 style="margin:0 0 8px;font-size:18px;font-weight:600">${escapeHtml(words.heading)}</h1>
      <p style="margin:0 0 24px;font-size:14px;line-height:20px;color:#6b7280">
        ${escapeHtml(words.enter)}
      </p>
      <div style="background:#fdf2f8;border:1px solid #fbcfe8;border-radius:10px;padding:20px;text-align:center">
        <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#be185d">${code}</span>
      </div>
      <p style="margin:24px 0 0;font-size:13px;line-height:19px;color:#6b7280">
        ${escapeHtml(words.expires)}
      </p>
    </div>
  </body>
</html>`,
  }
}

export async function sendSignInCode(to: string, code: string, m: Messages = en) {
  const { subject, text, html } = signInEmail(code, m)
  const { error } = await resend().emails.send({ from: sender(), to, subject, text, html })
  if (error) throw new Error(`Resend refused the sign-in email: ${error.message}`)
}

export async function sendAccountDeletionComplete(to: string, requestId: string, m: Messages = en) {
  const { error } = await resend().emails.send({
    from: sender(),
    to,
    subject: m.email.accountDeleted.subject,
    text: [
      m.email.accountDeleted.body,
      '',
      m.email.accountDeleted.retained,
    ].join('\n'),
  }, { idempotencyKey: `account-deletion-${requestId}` })
  if (error) throw new Error(`Resend refused the account deletion email: ${error.message}`)
}

export async function sendMaintenanceNotification(
  to: string,
  notification: { id: string; title: string; body: string },
  m: Messages = en,
) {
  const { error } = await resend().emails.send({
    from: sender(),
    to,
    subject: notification.title,
    text: [notification.body, '', m.email.maintenanceFooter].join('\n'),
  }, { idempotencyKey: `maintenance-notification-${notification.id}` })
  if (error) throw new Error(`Resend refused the maintenance notification: ${error.message}`)
}

export function renewalReminderEmail(notification: { title: string; body: string }, m: Messages = en) {
  return {
    subject: notification.title,
    text: [notification.body, '', m.email.renewalFooter].join('\n'),
  }
}

export async function sendRenewalReminder(
  to: string,
  notification: { id: string; title: string; body: string },
  m: Messages = en,
) {
  const { subject, text } = renewalReminderEmail(notification, m)
  const { error } = await resend().emails.send({ from: sender(), to, subject, text }, {
    idempotencyKey: `renewal-reminder-${notification.id}`,
  })
  if (error) throw new Error(`Resend refused the renewal reminder: ${error.message}`)
}

/// Sharing names a verified mailbox; this link still requires the recipient's own
/// sign-in and carries neither a session token nor a public report credential.
export function propertySharedEmail(notification: { title: string; body: string; href: string }, m: Messages = en) {
  const origin = process.env.KIVILO_APP_URL
  if (!origin) throw new Error('KIVILO_APP_URL must be set')
  return {
    subject: notification.title,
    text: [notification.body, '',
      m.email.propertyShared.open(new URL(notification.href, origin).href),
      '', m.email.propertyShared.signIn,
      m.email.propertyShared.together,
    ].join('\n'),
  }
}

export async function sendPropertySharedNotification(
  to: string,
  notification: { id: string; title: string; body: string; href: string },
  m: Messages = en,
) {
  const { subject, text } = propertySharedEmail(notification, m)
  const { error } = await resend().emails.send({ from: sender(), to, subject, text }, {
    idempotencyKey: `property-shared-${notification.id}`,
  })
  if (error) throw new Error(`Resend refused the property sharing email: ${error.message}`)
}

export function agencyInvitationEmail(notification: { title: string; body: string; href: string }, m: Messages = en) {
  const origin = process.env.KIVILO_APP_URL
  if (!origin) throw new Error('KIVILO_APP_URL must be set')
  return {
    subject: notification.title,
    text: [notification.body, '', m.email.agencyInvitation.review(new URL(notification.href, origin).href), '',
      m.email.agencyInvitation.signIn,
    ].join('\n'),
  }
}

export async function sendAgencyInvitationNotification(to: string, notification: { id: string; title: string; body: string; href: string }, m: Messages = en) {
  const { subject, text } = agencyInvitationEmail(notification, m)
  const { error } = await resend().emails.send({ from: sender(), to, subject, text }, {
    idempotencyKey: `agency-invitation-${notification.id}`,
  })
  if (error) throw new Error(`Resend refused the team invitation: ${error.message}`)
}

/// To a landlord or tenant, when the agent publishes an update to their signed report.
/// The link is the update page, which asks them to sign in, so it carries no credential.
export function reportUpdateEmail(notification: { title: string; body: string; href: string }, m: Messages = en) {
  const origin = process.env.KIVILO_APP_URL
  if (!origin) throw new Error('KIVILO_APP_URL must be set')
  const link = new URL(notification.href, origin).href
  return {
    subject: m.email.reportUpdate.subject(notification.title),
    text: [
      notification.body,
      '',
      m.email.reportUpdate.review(link),
      // A deposit statement links to the signing page and is answered on the web.
      ...(notification.href.startsWith('/updates/')
        ? ['', m.email.reportUpdate.app]
        : []),
    ].join('\n'),
  }
}

export async function sendReportUpdateNotification(
  to: string,
  notification: { id: string; title: string; body: string; href: string },
  m: Messages = en,
) {
  const { subject, text } = reportUpdateEmail(notification, m)
  const { error } = await resend().emails.send({ from: sender(), to, subject, text }, {
    idempotencyKey: `report-update-${notification.id}`,
  })
  if (error) throw new Error(`Resend refused the report update email: ${error.message}`)
}

/// To the operator, not an agent: one message per run of the error cron, listing each
/// kind of error seen for the first time. Plain text, because it is read to fix a bug.
export async function sendErrorAlert(to: string, errors: { count: number; latest: ErrorEvent }[]) {
  const subject = errors.length === 1
    ? `New Kivilo error: ${errors[0].latest.name}`
    : `${errors.length} new Kivilo errors`
  const text = errors.map(({ count, latest }) => [
    `${latest.source} ${latest.name}: ${latest.message.slice(0, 300)}`,
    `Path: ${latest.path ?? 'unknown'} (${latest.context})`,
    `Seen ${count === 1 ? 'once' : `${count} times`}, last at ${latest.occurredAt.toISOString()}`,
    latest.digest && `Reference: ${latest.digest}`,
    latest.release && `Build: ${latest.release}`,
    `Fingerprint: ${latest.fingerprint}`,
    ...(latest.stack?.split('\n').slice(1, 6) ?? []),
  ].filter(Boolean).join('\n')).join('\n\n')
  const { error } = await resend().emails.send({ from: sender(), to, subject, text })
  if (error) throw new Error(`Resend refused the error alert: ${error.message}`)
}

export type SignatureRequest = {
  /// The ReportEmail row, as the idempotency key, so an overlapping cron run cannot send twice.
  id: string
  recipientName: string
  role: 'landlord' | 'tenant'
  reportKind: 'CHECK_IN' | 'CHECK_OUT'
  address: string
  /// Who is asking: the agent, and the agency when they have set one. Null when the
  /// report names no agent.
  from: { agent: string; agency: string | null } | null
  /// `/sign/[inspectionId]?email=...` on the app's origin. Not a credential: the page
  /// makes the reader sign in with a code sent to this same address before it shows
  /// anything.
  link: string
}

/// "Please review and sign". Unlike the sign-in email this one is a link, because its
/// reader is a landlord or tenant who may have no app installed at all; the page it opens
/// sits outside the installed PWA, so nobody is stranded in the wrong browser.
export function signatureRequestEmail(request: SignatureRequest, m: Messages = en) {
  const words = m.email.signatureRequest
  const report = m.email.reportName(request.reportKind, request.address)
  const from = !request.from
    ? m.email.yourAgent
    : request.from.agency
      ? m.email.agentOf(request.from.agent, request.from.agency)
      : request.from.agent
  const lines = {
    intro: words.intro(from, report, m.email.roleName[request.role]),
    signIn: words.signIn,
    app: words.app,
    after: words.after,
  }
  return {
    subject: words.subject(report),
    text: [
      m.email.hello(request.recipientName),
      '',
      lines.intro,
      '',
      words.reviewHere,
      request.link,
      '',
      lines.signIn,
      '',
      lines.app,
      '',
      lines.after,
    ].join('\n'),
    html: `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827">
    <div style="max-width:460px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:32px">
      <h1 style="margin:0 0 8px;font-size:18px;font-weight:600">${escapeHtml(words.heading)}</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:21px;color:#374151">
        ${escapeHtml(m.email.hello(request.recipientName))} ${escapeHtml(lines.intro)}
      </p>
      <a href="${escapeHtml(request.link)}" style="display:inline-block;background:#ec4899;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:8px">${escapeHtml(words.button)}</a>
      <p style="margin:20px 0 0;font-size:13px;line-height:19px;color:#6b7280">${escapeHtml(lines.signIn)}</p>
      <p style="margin:12px 0 0;font-size:13px;line-height:19px;color:#6b7280">${escapeHtml(lines.app)}</p>
      <p style="margin:12px 0 0;font-size:13px;line-height:19px;color:#6b7280">${escapeHtml(lines.after)}</p>
    </div>
  </body>
</html>`,
  }
}

export async function sendSignatureRequest(to: string, request: SignatureRequest, m: Messages = en) {
  const { subject, text, html } = signatureRequestEmail(request, m)
  const { error } = await resend().emails.send(
    { from: sender(), to, subject, text, html },
    { idempotencyKey: `report-email-${request.id}` },
  )
  if (error) throw new Error(`Resend refused the signature request: ${error.message}`)
}

export type TenantHandover = {
  id: string
  recipientName: string
  address: string
  /// An authenticated handover page, never a report token or signed storage URL.
  link: string
  deadline: Date | null
  windowDays: number
  countersigned: boolean
}

export function tenantHandoverEmail(handover: TenantHandover, m: Messages = en) {
  const words = m.email.handover
  const deadline = handover.deadline && formatDate(m, handover.deadline, { dateStyle: 'long' })
  const period = deadline ? words.period(handover.windowDays, deadline) : words.noPeriod
  const signed = handover.countersigned ? words.countersigned : words.tenantSigned
  return {
    subject: words.subject(handover.address),
    text: [
      m.email.hello(handover.recipientName),
      '',
      signed,
      '',
      period,
      '',
      words.details,
      handover.link,
      '',
      words.signIn,
      '',
      words.notice,
    ].join('\n'),
  }
}

export async function sendTenantHandover(to: string, handover: TenantHandover, m: Messages = en) {
  const { subject, text } = tenantHandoverEmail(handover, m)
  const { error } = await resend().emails.send(
    { from: sender(), to, subject, text },
    { idempotencyKey: `report-email-${handover.id}` },
  )
  if (error) throw new Error(`Resend refused the tenant handover: ${error.message}`)
}

export type SignedCopy = {
  id: string
  recipientName: string
  reportKind: 'CHECK_IN' | 'CHECK_OUT'
  address: string
  signatures: { name: string; role: 'LANDLORD' | 'TENANT'; signedAt: Date }[]
}

/// The signed PDF itself, or, when it is too large to attach, the page the recipient
/// downloads it from after signing in: `/sign/[inspectionId]` for a landlord or tenant,
/// the inspection page for the agent. Never `/reports/[token]` and never a signed
/// storage URL, since both are credentials.
export type SignedCopyPdf = { filename: string; content: Buffer } | { link: string }

/// "Both parties have signed", with the PDF attached, or linked when it is too large.
export function signedCopyEmail(copy: SignedCopy, pdf: SignedCopyPdf, m: Messages = en) {
  const words = m.email.signedCopy
  const report = m.email.reportName(copy.reportKind, copy.address)
  const where = 'link' in pdf
    ? [words.linked(report), pdf.link, '', words.linkSignIn]
    : [words.attached(report)]
  return {
    subject: words.subject(report),
    text: [
      m.email.hello(copy.recipientName),
      '',
      ...where,
      '',
      ...copy.signatures.map((signature) => words.signature(
        m.party[signature.role],
        signature.name,
        formatDate(m, signature.signedAt, { dateStyle: 'long', timeStyle: 'short' }),
      )),
      '',
      words.fingerprint,
    ].join('\n'),
  }
}

export async function sendSignedCopy(to: string, copy: SignedCopy, pdf: SignedCopyPdf, m: Messages = en) {
  const { subject, text } = signedCopyEmail(copy, pdf, m)
  const { error } = await resend().emails.send(
    { from: sender(), to, subject, text, ...('content' in pdf && { attachments: [pdf] }) },
    // Its own key for the link, so a row whose attachment Resend refused as too large
    // is not answered with that refusal again when it retries without one.
    { idempotencyKey: `report-email-${copy.id}${'link' in pdf ? '-link' : ''}` },
  )
  if (error) throw new Error(`Resend refused the signed copy: ${error.message}`)
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
