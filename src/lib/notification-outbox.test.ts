import { beforeEach, describe, expect, it, vi } from 'vitest'

const { findMany, findFirst, deleteMany, update, maintenanceEmail, reportEmail, renewalEmail, sharedEmail, agencyEmail } = vi.hoisted(() => ({
  findMany: vi.fn(), findFirst: vi.fn(), deleteMany: vi.fn(), update: vi.fn(),
  maintenanceEmail: vi.fn(), reportEmail: vi.fn(), renewalEmail: vi.fn(), sharedEmail: vi.fn(), agencyEmail: vi.fn(),
}))

vi.mock('@/lib/db', () => ({ db: {
  maintenanceCase: { findMany: vi.fn().mockResolvedValue([]) },
  accountDeletionRequest: { findMany: vi.fn().mockResolvedValue([]) },
  notification: { findMany, findFirst, deleteMany, update },
} }))
vi.mock('@/lib/renewals', () => ({ queueRenewalReminders: vi.fn() }))
vi.mock('@/lib/push', () => ({ deliverPushOutbox: vi.fn().mockResolvedValue({ configured: false }) }))
vi.mock('@/lib/email', () => ({
  sendMaintenanceNotification: maintenanceEmail,
  sendReportUpdateNotification: reportEmail,
  sendRenewalReminder: renewalEmail,
  sendPropertySharedNotification: sharedEmail,
  sendAgencyInvitationNotification: agencyEmail,
}))

import { deliverNotificationOutbox } from '@/lib/notification-outbox'

describe('notification delivery permission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findFirst.mockResolvedValue({ id: 'notice-1' })
    deleteMany.mockResolvedValue({ count: 1 })
    update.mockResolvedValue({})
  })

  it('withdraws a private email when the recipient no longer has tenancy access', async () => {
    findMany.mockResolvedValue([{
      id: 'notice-1', recipientId: 'revoked-colleague', tenancyId: 'tenancy-1',
      kind: 'MAINTENANCE_STATUS', title: 'Leaking tap', body: 'Private address',
      href: '/maintenance/case-1', recipient: { email: 'revoked@example.test' },
    }])
    findFirst.mockResolvedValue(null)

    const result = await deliverNotificationOutbox()

    expect(result.email).toEqual({ attempted: 1, sent: 0, failed: [] })
    expect(deleteMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'notice-1', NOT: expect.any(Object) }),
    }))
    expect(maintenanceEmail).not.toHaveBeenCalled()
    expect(sharedEmail).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('delivers a property invitation through its own email template after rechecking access', async () => {
    const notice = {
      id: 'notice-1', recipientId: 'current-colleague', tenancyId: 'tenancy-1',
      kind: 'PROPERTY_SHARED', title: 'Property shared with you', body: '12 Shared Grove',
      href: '/inspections/inspection-1', recipient: { email: 'colleague@example.test' },
    }
    findMany.mockResolvedValue([notice])

    const result = await deliverNotificationOutbox()

    expect(result.email.sent).toBe(1)
    expect(sharedEmail).toHaveBeenCalledWith('colleague@example.test', expect.objectContaining({
      id: notice.id, title: notice.title, body: notice.body, href: notice.href,
    }))
    expect(maintenanceEmail).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ emailSentAt: expect.any(Date), emailTo: 'colleague@example.test' }),
    }))
  })

  it('rechecks and delivers a team invitation through the durable invitation email transport', async () => {
    findMany.mockResolvedValue([{
      id: 'invite-notice', recipientId: 'invitee', tenancyId: null, agencyMembershipId: 'invitation',
      kind: 'AGENCY_INVITATION', title: 'Join Team', body: 'Invite', href: '/team', recipient: { email: 'invitee@example.test' },
    }])
    expect((await deliverNotificationOutbox()).email.sent).toBe(1)
    expect(agencyEmail).toHaveBeenCalledWith('invitee@example.test', expect.objectContaining({ id: 'invite-notice', href: '/team' }))
    expect(maintenanceEmail).not.toHaveBeenCalled()
    findFirst.mockResolvedValue(null)
    agencyEmail.mockClear()
    expect((await deliverNotificationOutbox()).email.sent).toBe(0)
    expect(agencyEmail).not.toHaveBeenCalled()
  })
})
