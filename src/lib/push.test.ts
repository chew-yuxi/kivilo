import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  upsert,
  updateMany,
  deleteMany,
  pendingFindMany,
  claimMany,
  notificationFindMany,
  notificationFindFirst,
  notificationDeleteMany,
  notificationUpdateMany,
  send,
} = vi.hoisted(() => ({
  upsert: vi.fn(),
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
  pendingFindMany: vi.fn(),
  claimMany: vi.fn(),
  notificationFindMany: vi.fn(),
  notificationFindFirst: vi.fn(),
  notificationDeleteMany: vi.fn(),
  notificationUpdateMany: vi.fn(),
  send: vi.fn(),
}))

vi.mock('firebase-admin/app', () => ({
  cert: vi.fn(),
  getApps: () => [{}],
  initializeApp: vi.fn(),
}))
vi.mock('firebase-admin/messaging', () => ({ getMessaging: () => ({ send }) }))

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: (operation: (tx: unknown) => Promise<unknown>) => operation({
      deviceInstallation: { upsert },
      notificationPushDelivery: { deleteMany },
      notification: { updateMany: notificationUpdateMany },
    }),
    deviceInstallation: { upsert, updateMany },
    notification: {
      findMany: notificationFindMany,
      findFirst: notificationFindFirst,
      deleteMany: notificationDeleteMany,
      updateMany: notificationUpdateMany,
    },
    notificationPushDelivery: {
      deleteMany,
      findMany: pendingFindMany,
      updateMany: claimMany,
    },
  },
}))

import {
  deliverPushOutbox,
  disableDeviceInstallation,
  registerDeviceInstallation,
} from '@/lib/push'

describe('push installations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    notificationFindMany.mockResolvedValue([])
    notificationFindFirst.mockResolvedValue({ id: 'notification-1' })
    notificationDeleteMany.mockResolvedValue({ count: 1 })
    notificationUpdateMany.mockResolvedValue({ count: 0 })
    pendingFindMany.mockResolvedValue([])
    deleteMany.mockResolvedValue({ count: 0 })
    claimMany.mockResolvedValue({ count: 1 })
  })

  it('binds a refreshed token to the authenticated stakeholder', async () => {
    upsert.mockResolvedValue({ id: 'device-1' })
    await registerDeviceInstallation('stakeholder-1', {
      token: 'a'.repeat(64),
      platform: 'IOS',
    })
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { token: 'a'.repeat(64) },
      update: expect.objectContaining({
        stakeholderId: 'stakeholder-1',
        platform: 'IOS',
        disabledAt: null,
      }),
    }))
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        installationId: 'device-1',
        sentAt: null,
        notification: { recipientId: { not: 'stakeholder-1' } },
      },
    })
    expect(notificationUpdateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        readAt: null,
        pushExpandedAt: { not: null },
        pushDeliveries: { none: {} },
      }),
      data: { pushExpandedAt: null },
    })
  })

  it('only disables a token owned by the signed-in stakeholder', async () => {
    updateMany.mockResolvedValue({ count: 1 })
    await disableDeviceInstallation('stakeholder-1', { token: 'b'.repeat(64) })
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { stakeholderId: 'stakeholder-1', token: 'b'.repeat(64) },
    }))
  })

  it('discards a delivery left behind when a token belongs to another account', async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = '{}'
    pendingFindMany.mockResolvedValue([{
      id: 'delivery-1',
      installationId: 'device-1',
      notification: { id: 'notification-1', recipientId: 'old-owner' },
      installation: { id: 'device-1', stakeholderId: 'new-owner', token: 'c'.repeat(64) },
    }])

    await expect(deliverPushOutbox()).resolves.toEqual({
      configured: true,
      attempted: 1,
      sent: 0,
      failed: [],
    })
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        id: 'delivery-1',
        sentAt: null,
        installation: { stakeholderId: { not: 'old-owner' } },
      },
    })
    expect(claimMany).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
  })

  it('rechecks the recipient at claim time if registration raced the worker read', async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = '{}'
    pendingFindMany.mockResolvedValue([{
      id: 'delivery-1',
      installationId: 'device-1',
      notification: { id: 'notification-1', recipientId: 'old-owner' },
      installation: { id: 'device-1', stakeholderId: 'old-owner', token: 'c'.repeat(64) },
    }])
    claimMany.mockResolvedValue({ count: 0 })

    await deliverPushOutbox()

    expect(claimMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        installation: { stakeholderId: 'old-owner', disabledAt: null },
      }),
    }))
    expect(send).not.toHaveBeenCalled()
  })

  it('sends no recipient details in a push that can arrive after account switching', async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = '{}'
    pendingFindMany.mockResolvedValue([{
      id: 'delivery-1',
      installationId: 'device-1',
      notification: {
        id: 'notification-1',
        recipientId: 'stakeholder-1',
        title: 'Private repair title',
        body: 'Private repair details',
        href: '/maintenance/private-case',
      },
      installation: { id: 'device-1', stakeholderId: 'stakeholder-1', token: 'c'.repeat(64) },
    }])
    send.mockResolvedValue('firebase-message-id')

    await expect(deliverPushOutbox()).resolves.toEqual({
      configured: true,
      attempted: 1,
      sent: 1,
      failed: [],
    })
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      token: 'c'.repeat(64),
      notification: {
        title: 'Kivilo',
        body: 'Open Kivilo to view your notifications.',
      },
    }))
    const payload = send.mock.calls[0][0]
    expect(payload).not.toHaveProperty('data')
    expect(JSON.stringify(payload)).not.toContain('Private repair')
    expect(JSON.stringify(payload)).not.toContain('private-case')
  })

  it('withdraws a queued delivery when tenancy access was revoked after it was claimed', async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = '{}'
    pendingFindMany.mockResolvedValue([{
      id: 'delivery-1', installationId: 'device-1',
      notification: { id: 'notification-1', recipientId: 'former-collaborator' },
      installation: { id: 'device-1', stakeholderId: 'former-collaborator', token: 'd'.repeat(64) },
    }])
    notificationFindFirst.mockResolvedValue(null)

    await expect(deliverPushOutbox()).resolves.toMatchObject({ sent: 0, failed: [] })

    expect(notificationDeleteMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'notification-1', NOT: expect.any(Object) }),
    }))
    expect(send).not.toHaveBeenCalled()
  })

  it('leaves durable notifications untouched until FCM is configured', async () => {
    await expect(deliverPushOutbox()).resolves.toEqual({
      configured: false,
      attempted: 0,
      sent: 0,
      failed: [],
    })
  })
})
