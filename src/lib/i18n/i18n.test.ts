import { describe, expect, it, vi } from 'vitest'
import { acceptedLocale, messages, parseLocale } from '@/lib/i18n'
import { signatureRequestEmail, signedCopyEmail } from '@/lib/email'

describe('choosing a language', () => {
  it('serves English for stored preferences and browser languages while the pilot is closed', () => {
    vi.stubEnv('NEXT_PUBLIC_KIVILO_LANGUAGE_PILOT', 'false')
    try {
      expect(parseLocale('zh')).toBeNull()
      expect(acceptedLocale('th-TH,en;q=0.8')).toBe('en')
      expect(messages('th').party.LANDLORD).toBe('Landlord')
    } finally {
      vi.unstubAllEnvs()
    }
  })
  it('reads the first language Kivilo speaks from Accept-Language', () => {
    expect(acceptedLocale('ja-JP,zh-Hans-SG;q=0.9,en;q=0.8')).toBe('zh')
    expect(acceptedLocale('th-TH')).toBe('th')
    expect(acceptedLocale('fr-FR,de')).toBeNull()
    expect(acceptedLocale(null)).toBeNull()
  })

  it('treats a stored language it does not know, or none, as English', () => {
    expect(parseLocale('ms')).toBeNull()
    expect(messages(null).party.LANDLORD).toBe('Landlord')
    expect(messages('ms').party.LANDLORD).toBe('Landlord')
    expect(messages('zh').party.LANDLORD).toBe('房东')
  })
})

describe('emails in the reader’s language', () => {
  it('asks a Chinese reader to sign in Chinese, keeping the link', () => {
    const { subject, text, html } = signatureRequestEmail({
      id: 'row', recipientName: 'Tan Wei Ming', role: 'landlord', reportKind: 'CHECK_IN',
      address: '2 Marina Boulevard', from: { agent: 'Alaric Yeo', agency: 'Harbourline Realty' },
      link: 'https://kivilo.test/sign/abc?email=tan%40example.com',
    }, messages('zh'))
    expect(subject).toBe('请查看并签署2 Marina Boulevard 的入住检查报告')
    expect(text).toContain('Harbourline Realty 的 Alaric Yeo')
    expect(text).toContain('https://kivilo.test/sign/abc?email=tan%40example.com')
    expect(html).toContain('查看并签署')
  })

  it('dates a Thai signed copy in the Gregorian year, Singapore time', () => {
    const { text } = signedCopyEmail({
      id: 'row', recipientName: 'Priya', reportKind: 'CHECK_OUT', address: '2 Marina Boulevard',
      signatures: [{ name: 'Priya', role: 'TENANT', signedAt: new Date('2026-10-16T02:00:00Z') }],
    }, { filename: 'Report.pdf', content: Buffer.from('%PDF') }, messages('th'))
    expect(text).toContain('ผู้เช่า: Priya ลงนามเมื่อ')
    expect(text).toContain('2026')
    expect(text).not.toContain('2569')
  })
})
