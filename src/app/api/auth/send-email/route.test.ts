import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Webhook } from 'standardwebhooks'

const sendSignInCode = vi.fn()
vi.mock('@/lib/email', () => ({ sendSignInCode: (...args: unknown[]) => sendSignInCode(...args) }))

/// Any valid base64 works; Supabase stores it prefixed with `v1,whsec_`.
const SECRET = 'c2VjcmV0LWtpdmlsby1zZW5kLWVtYWlsLWhvb2s='
process.env.SEND_EMAIL_HOOK_SECRET = `v1,whsec_${SECRET}`

const { POST } = await import('./route')

function hookRequest(payload: unknown, { tamper = false } = {}) {
  const body = JSON.stringify(payload)
  const id = 'msg_test'
  const timestamp = new Date()
  const signature = new Webhook(SECRET).sign(id, timestamp, body)

  return new Request('https://kivilo.example/api/auth/send-email', {
    method: 'POST',
    body,
    headers: {
      'webhook-id': id,
      'webhook-timestamp': Math.floor(timestamp.getTime() / 1000).toString(),
      'webhook-signature': tamper ? 'v1,notarealsignature' : signature,
    },
  })
}

const signInPayload = {
  user: { email: 'agent@kivilo.test' },
  email_data: { token: '418025', email_action_type: 'magiclink' },
}

describe('send-email hook', () => {
  beforeEach(() => sendSignInCode.mockReset())

  it('sends the code for a signed sign-in request', async () => {
    const response = await POST(hookRequest(signInPayload))
    expect(response.status).toBe(200)
    expect(sendSignInCode).toHaveBeenCalledWith('agent@kivilo.test', '418025')
  })

  /// A first-time address arrives as `signup`, since the login form passes
  /// `shouldCreateUser: true`. It is the same email.
  it('treats signup as a sign-in', async () => {
    const payload = { ...signInPayload, email_data: { token: '999111', email_action_type: 'signup' } }
    const response = await POST(hookRequest(payload))
    expect(response.status).toBe(200)
    expect(sendSignInCode).toHaveBeenCalledWith('agent@kivilo.test', '999111')
  })

  /// The shared secret is the only thing standing between Supabase and anyone who finds
  /// this URL, so an unsigned caller must not be able to mail a code to an address of
  /// their choosing.
  it('refuses a bad signature without sending', async () => {
    const response = await POST(hookRequest(signInPayload, { tamper: true }))
    expect(response.status).toBe(401)
    expect(sendSignInCode).not.toHaveBeenCalled()
  })

  it('refuses an auth action it has no copy for', async () => {
    const payload = { ...signInPayload, email_data: { token: '1', email_action_type: 'recovery' } }
    const response = await POST(hookRequest(payload))
    expect(response.status).toBe(400)
    expect(sendSignInCode).not.toHaveBeenCalled()
  })
})
