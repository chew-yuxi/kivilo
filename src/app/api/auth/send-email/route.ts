import { Webhook } from 'standardwebhooks'
import { sendSignInCode } from '@/lib/email'

/// Supabase's Send Email Hook. Instead of mailing the sign-in code itself, Supabase
/// POSTs it here and we deliver it through Resend.
///
/// Supabase still generates the code, sets its expiry, validates it on `verifyOtp`, and
/// applies its own rate limits, so this route is a mail transport and not an
/// authorization boundary. It is enabled per environment: locally the hook stays off and
/// the built-in mailer keeps delivering to mailpit, which is what `pnpm test:e2e` reads.
///
/// The request is unauthenticated in the session sense, so the shared hook secret is the
/// only thing separating Supabase from anyone who finds the URL. Verify it before
/// touching the payload. `src/proxy.ts` does not match this path and must not: a webhook
/// carries no session cookie and would be redirected to /login.

type HookPayload = {
  user: { email: string }
  email_data: { token: string; email_action_type: string }
}

/// Kivilo only ever asks Supabase for a sign-in code. `signup` is the same flow for an
/// address that has not been seen before, since the login form passes
/// `shouldCreateUser: true`. Anything else means a flow was switched on that this route
/// has no copy for, and sending a "sign-in code" for it would be wrong.
const SIGN_IN_ACTIONS = new Set(['magiclink', 'signup', 'email'])

/// Supabase surfaces `message` to the caller, so keep it something an agent can act on.
function refuse(httpCode: number, message: string) {
  return Response.json({ error: { http_code: httpCode, message } }, { status: httpCode })
}

export async function POST(request: Request) {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET
  if (!secret) return refuse(500, 'SEND_EMAIL_HOOK_SECRET is not set')

  const body = await request.text()

  let payload: HookPayload
  try {
    /// Supabase stores the secret as `v1,whsec_<base64>`; the library wants the base64.
    const webhook = new Webhook(secret.replace('v1,whsec_', ''))
    payload = webhook.verify(body, {
      'webhook-id': request.headers.get('webhook-id') ?? '',
      'webhook-timestamp': request.headers.get('webhook-timestamp') ?? '',
      'webhook-signature': request.headers.get('webhook-signature') ?? '',
    }) as HookPayload
  } catch {
    /// Same response whether the signature is wrong, replayed, or absent.
    return refuse(401, 'Invalid webhook signature')
  }

  const { email_action_type: action, token } = payload.email_data
  if (!SIGN_IN_ACTIONS.has(action)) {
    return refuse(400, `No email template for auth action "${action}"`)
  }

  await sendSignInCode(payload.user.email, token)

  return Response.json({})
}
