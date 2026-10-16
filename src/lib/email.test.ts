import { describe, expect, it } from 'vitest'
import { signInEmail, signatureRequestEmail, signedCopyEmail } from './email'
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
  /// The only web copy of a report is behind its share token, which is a credential the
  /// agent may never have created. The signed copy travels as an attachment instead.
  it('names both signatures in Singapore time and carries no link', () => {
    const { subject, text } = signedCopyEmail({
      id: 'row',
      recipientName: 'Priya Raman',
      reportKind: 'Check-out',
      address: '2 Marina Boulevard, Singapore 018987',
      signatures: [
        { name: 'Priya Raman', role: 'Tenant', signedAt: new Date('2026-10-16T02:00:00Z') },
        { name: 'Tan Wei Ming', role: 'Landlord', signedAt: new Date('2026-10-16T03:30:00Z') },
      ],
    })
    expect(subject).toBe('Signed: check-out report for 2 Marina Boulevard, Singapore 018987')
    expect(text).toContain('Both parties have signed')
    expect(text).toContain('Tenant: Priya Raman, signed 16 October 2026 at 10:00')
    expect(text).toContain('Landlord: Tan Wei Ming, signed 16 October 2026 at 11:30')
    expect(text).not.toContain('http')
    expect(text).not.toContain('/reports/')
  })
})

describe('shortFingerprint', () => {
  it('prints the first sixteen hex digits in groups of four', () => {
    expect(shortFingerprint('0123456789abcdef'.repeat(4))).toBe('0123 4567 89AB CDEF')
  })
})
