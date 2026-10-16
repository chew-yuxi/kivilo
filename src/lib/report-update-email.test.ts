import { afterEach, describe, expect, it, vi } from 'vitest'
import { reportUpdateEmail } from './email'

const notification = {
  title: 'The report for #02-05, 27 Jalan Merah Saga, Singapore 278106 was updated',
  body: 'Update 1: New dishwasher. Please review it and acknowledge it.',
  href: '/updates/addendum-1',
}

describe('reportUpdateEmail', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('links to the update page on the app origin and mentions the app', () => {
    vi.stubEnv('KIVILO_APP_URL', 'https://kivilo.example')
    const email = reportUpdateEmail(notification)

    expect(email.subject).toBe(`${notification.title}, please review and acknowledge`)
    expect(email.text).toContain('Update 1: New dishwasher.')
    expect(email.text).toContain('https://kivilo.example/updates/addendum-1')
    expect(email.text).toContain('Kivilo app')
  })

  it('refuses to send a link without an origin, so the outbox retries rather than mailing a dead one', () => {
    vi.stubEnv('KIVILO_APP_URL', '')
    expect(() => reportUpdateEmail(notification)).toThrow('KIVILO_APP_URL must be set')
  })
})
