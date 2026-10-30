import { afterEach, describe, expect, it } from 'vitest'
import { cddRequestEmail } from '@/lib/email'

const origin = process.env.KIVILO_APP_URL
afterEach(() => {
  process.env.KIVILO_APP_URL = origin
})

describe('cddRequestEmail', () => {
  it('links the page to sign in and fill in, and never mentions screening', () => {
    process.env.KIVILO_APP_URL = 'https://my.kivilo.app'
    const { subject, text, html } = cddRequestEmail({
      title: 'Jane Agent needs your details for your rental',
      body: 'Jane Agent is your property agent and needs your details as on your ID.',
      href: '/cdd/case-1',
    })
    expect(subject).toBe('Jane Agent needs your details for your rental')
    expect(text).toContain('https://my.kivilo.app/cdd/case-1')
    expect(text).toContain('Sign in using the email address')
    for (const word of ['screen', 'sanction', 'match', 'terror', 'report']) {
      expect(text.toLowerCase()).not.toContain(word)
      expect(html.toLowerCase()).not.toContain(word)
    }
    expect(html).toContain('href="https://my.kivilo.app/cdd/case-1"')
  })

  it('escapes the agent’s name in the HTML', () => {
    process.env.KIVILO_APP_URL = 'https://my.kivilo.app'
    const { html } = cddRequestEmail({ title: '<b>Jo</b> needs your details', body: 'x', href: '/cdd/case-1' })
    expect(html).toContain('&lt;b&gt;Jo&lt;/b&gt;')
  })
})
