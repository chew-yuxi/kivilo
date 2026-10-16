import { Resend } from 'resend'
import type { ErrorEvent } from '@/generated/prisma'

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
export function signInEmail(code: string) {
  return {
    /// The code leads the subject so it shows in a phone's notification preview and the
    /// agent does not have to leave the app to read it.
    subject: `${code} is your Kivilo sign-in code`,
    text: [
      `Your Kivilo sign-in code is ${code}.`,
      '',
      'Enter it in the app to finish signing in. It expires in an hour and can only be used once.',
      '',
      'If you did not ask to sign in, you can ignore this email.',
    ].join('\n'),
    html: `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827">
    <div style="max-width:420px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:32px">
      <h1 style="margin:0 0 8px;font-size:18px;font-weight:600">Your Kivilo sign-in code</h1>
      <p style="margin:0 0 24px;font-size:14px;line-height:20px;color:#6b7280">
        Enter this code in the app to finish signing in.
      </p>
      <div style="background:#fdf2f8;border:1px solid #fbcfe8;border-radius:10px;padding:20px;text-align:center">
        <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#be185d">${code}</span>
      </div>
      <p style="margin:24px 0 0;font-size:13px;line-height:19px;color:#6b7280">
        It expires in an hour and can only be used once. If you did not ask to sign in,
        you can ignore this email.
      </p>
    </div>
  </body>
</html>`,
  }
}

export async function sendSignInCode(to: string, code: string) {
  const { subject, text, html } = signInEmail(code)
  const { error } = await resend().emails.send({ from: sender(), to, subject, text, html })
  if (error) throw new Error(`Resend refused the sign-in email: ${error.message}`)
}

export async function sendAccountDeletionComplete(to: string, requestId: string) {
  const { error } = await resend().emails.send({
    from: sender(),
    to,
    subject: 'Your Kivilo account deletion is complete',
    text: [
      'Your Kivilo account has been deleted.',
      '',
      'Data retained for other parties or a legal obligation remains subject to our published retention policy.',
    ].join('\n'),
  }, { idempotencyKey: `account-deletion-${requestId}` })
  if (error) throw new Error(`Resend refused the account deletion email: ${error.message}`)
}

export async function sendMaintenanceNotification(
  to: string,
  notification: { id: string; title: string; body: string },
) {
  const { error } = await resend().emails.send({
    from: sender(),
    to,
    subject: notification.title,
    text: [notification.body, '', 'Open Kivilo to view the maintenance timeline and respond.'].join('\n'),
  }, { idempotencyKey: `maintenance-notification-${notification.id}` })
  if (error) throw new Error(`Resend refused the maintenance notification: ${error.message}`)
}

/// To a landlord or tenant, when the agent publishes an update to their signed report.
/// The link is the update page, which asks them to sign in, so it carries no credential.
export function reportUpdateEmail(notification: { title: string; body: string; href: string }) {
  const origin = process.env.KIVILO_APP_URL
  if (!origin) throw new Error('KIVILO_APP_URL must be set')
  const link = new URL(notification.href, origin).href
  return {
    subject: `${notification.title}, please review and acknowledge`,
    text: [
      notification.body,
      '',
      `Review and acknowledge it here: ${link}`,
      '',
      'You can also open the report in the Kivilo app and acknowledge it there.',
    ].join('\n'),
  }
}

export async function sendReportUpdateNotification(
  to: string,
  notification: { id: string; title: string; body: string; href: string },
) {
  const { subject, text } = reportUpdateEmail(notification)
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
