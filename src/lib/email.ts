import { Resend } from 'resend'

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
