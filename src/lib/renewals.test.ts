import { describe, expect, it } from 'vitest'
import { renewalDueAt } from './renewals'
import { renewalReminderEmail } from './email'

describe('renewal reminder timing', () => {
  it.each([
    ['2027-01-17', '2026-10-17'],
    ['2027-05-31', '2027-02-28'],
    ['2028-05-31', '2028-02-29'],
    ['2027-03-31', '2026-12-31'],
    ['2027-07-31', '2027-04-30'],
  ])('reminds three calendar months before %s on %s', (end, due) => {
    expect(renewalDueAt(new Date(end)).toISOString()).toBe(`${due}T00:00:00.000Z`)
  })

  it('uses renewal wording in the email and carries no report credential', () => {
    const { subject, text } = renewalReminderEmail({ title: 'Renewal due', body: 'Unit 12 ends 2027-01-17.' })
    expect(subject).toBe('Renewal due')
    expect(text).toContain('start the renewal')
    expect(text).not.toContain('maintenance')
    expect(text).not.toContain('/reports/')
  })
})
