import { describe, expect, it } from 'vitest'
import { signInEmail } from './email'

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
