import { describe, expect, it, vi } from 'vitest'
import { signInEmail, signatureRequestEmail, signedCopyEmail, tenantHandoverEmail, propertySharedEmail } from './email'
import { shortFingerprint } from './report-fingerprint'

describe('signInEmail', () => {
  it('carries the code in the subject, the text part, and the html part', () => {
    const email = signInEmail('418025')
    expect(email.subject).toContain('418025')
    expect(email.text).toContain('418025')
    expect(email.html).toContain('418025')
  })

  /// Sign-in is a code rather than a link because a link opens the phone's default
  /// browser and leaves an installed PWA without a session. A clickable shortcut
  /// sneaking into this email would undo that silently, so pin it.
  it('contains nothing clickable', () => {
    const { html, text } = signInEmail('418025')
    expect(html).not.toContain('href=')
    expect(text).not.toContain('http')
  })
})

it('property sharing links require the invited mailbox and contain no bearer credential', () => {
  vi.stubEnv('KIVILO_APP_URL', 'https://kivilo.test')
  try {
    const { text } = propertySharedEmail({
      title: 'Jac shared a property with you', body: '12 Shared Grove', href: '/inspections/example',
    })
    expect(text).toContain('https://kivilo.test/inspections/example')
    expect(text).toContain('email address this message was sent to')
    expect(text).not.toContain('/reports/')
    expect(text).not.toContain('token=')
  } finally {
    vi.unstubAllEnvs()
  }
})

describe('signatureRequestEmail', () => {
  const request = {
    id: 'row',
    recipientName: 'Tan <Wei> Ming',
    role: 'landlord' as const,
    reportKind: 'Check-in' as const,
    address: '#28-05, 2 Marina Boulevard, Singapore 018987',
    from: 'Alaric Yeo of Harbourline Realty',
    link: 'https://kivilo.test/sign/cabc?email=tan%40example.com',
  }

  it('links to the signing page, says a code is needed, and points app users to the app', () => {
    const { subject, text, html } = signatureRequestEmail(request)
    expect(subject).toBe('Please review and sign the check-in report for #28-05, 2 Marina Boulevard, Singapore 018987')
    expect(text).toContain(request.link)
    expect(html).toContain('href="https://kivilo.test/sign/cabc?email=tan%40example.com"')
    for (const body of [text, html]) {
      expect(body).toContain('sign in with a code emailed to this address')
      expect(body).toContain('Kivilo app')
      expect(body).toContain('awaiting your signature')
    }
  })

  it('escapes what people typed before putting it in html', () => {
    const { html } = signatureRequestEmail(request)
    expect(html).toContain('Tan &lt;Wei&gt; Ming')
    expect(html).not.toContain('<Wei>')
  })
})

describe('signedCopyEmail', () => {
  const copy = {
    id: 'row',
    recipientName: 'Priya Raman',
    reportKind: 'Check-out' as const,
    address: '2 Marina Boulevard, Singapore 018987',
    signatures: [
      { name: 'Priya Raman', role: 'Tenant', signedAt: new Date('2026-10-16T02:00:00Z') },
      { name: 'Tan Wei Ming', role: 'Landlord', signedAt: new Date('2026-10-16T03:30:00Z') },
    ],
  }

  /// The only open web copy of a report is behind its share token, which is a credential
  /// the agent may never have created. The signed copy travels as an attachment instead.
  it('names both signatures in Singapore time and carries no link', () => {
    const { subject, text } = signedCopyEmail(copy, { filename: 'Report.pdf', content: Buffer.from('%PDF') })
    expect(subject).toBe('Signed: check-out report for 2 Marina Boulevard, Singapore 018987')
    expect(text).toContain('Both parties have signed')
    expect(text).toContain('attached as a PDF')
    expect(text).toContain('Tenant: Priya Raman, signed 16 October 2026 at 10:00')
    expect(text).toContain('Landlord: Tan Wei Ming, signed 16 October 2026 at 11:30')
    expect(text).not.toContain('http')
    expect(text).not.toContain('/reports/')
  })

  /// Too large to attach: the one link is to a page that asks the reader to sign in.
  it('links a PDF too large to attach and says signing in is needed', () => {
    const link = 'https://kivilo.test/sign/abc?email=priya%40example.com'
    const { text } = signedCopyEmail(copy, { link })
    expect(text).toContain('too large to attach')
    expect(text).toContain(link)
    expect(text).toContain('sign in with a code emailed to this address')
    expect(text).not.toContain('attached as a PDF')
    expect(text.match(/https?:\/\//g)).toHaveLength(1)
  })
})

describe('shortFingerprint', () => {
  it('prints the first sixteen hex digits in groups of four', () => {
    expect(shortFingerprint('0123456789abcdef'.repeat(4))).toBe('0123 4567 89AB CDEF')
  })
})

describe('tenantHandoverEmail', () => {
  const handover = {
    id: 'handover-email', recipientName: 'Marcus Lee', address: '8 Shenton Way, Singapore 068811',
    link: 'https://kivilo.test/handover/checkin?email=marcus%40example.com',
    windowDays: 30, deadline: new Date('2026-06-30T15:59:59.999Z'), countersigned: false,
  }

  it('gives the Singapore deadline and authenticated handover link without calling an unsigned copy completed', () => {
    const { subject, text } = tenantHandoverEmail(handover)
    expect(subject).toBe('Your handover for 8 Shenton Way, Singapore 068811')
    expect(text).toContain('30-day move-in defect period ends on 30 June 2026')
    expect(text).toContain('end of the day in Singapore')
    expect(text).toContain(handover.link)
    expect(text).toContain('Once the landlord has also signed')
    expect(text).toContain('Sign in with a code emailed to this address')
    expect(text).toContain('signed check-in report stays unchanged')
    expect(text).not.toContain('/reports/')
    expect(text).not.toContain('Both parties have signed')
  })

  it('keeps repairs available when the tenancy has no early defect period', () => {
    const { text } = tenantHandoverEmail({ ...handover, deadline: null, windowDays: 0, countersigned: true })
    expect(text).toContain('Both parties have signed')
    expect(text).toContain('not enabled for this tenancy')
    expect(text).toContain('still report repairs')
    expect(text).not.toContain('ends on')
    expect(text).not.toContain('0-day')
  })
})
