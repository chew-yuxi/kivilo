import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'
import { z } from 'zod'

import { db } from '@/lib/db'

const installationInput = z.object({
  token: z.string().trim().min(20).max(4096),
  platform: z.enum(['ANDROID', 'IOS']),
})

export async function registerDeviceInstallation(stakeholderId: string, raw: unknown) {
  const input = installationInput.parse(raw)
  return db.$transaction(async (tx) => {
    const installation = await tx.deviceInstallation.upsert({
      where: { token: input.token },
      create: { stakeholderId, ...input },
      update: {
        stakeholderId,
        platform: input.platform,
        lastSeenAt: new Date(),
        disabledAt: null,
      },
      select: { id: true },
    })
    // A token can outlive a sign-out. Old recipients' queued deliveries must
    // not follow the same installation when a different account registers it.
    await tx.notificationPushDelivery.deleteMany({
      where: {
        installationId: installation.id,
        sentAt: null,
        notification: { recipientId: { not: stakeholderId } },
      },
    })
    return installation
  })
}

export async function disableDeviceInstallation(stakeholderId: string, raw: unknown) {
  const { token } = installationInput.pick({ token: true }).parse(raw)
  await db.deviceInstallation.updateMany({
    where: { stakeholderId, token },
    data: { disabledAt: new Date() },
  })
}

function firebaseMessaging() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!serviceAccountJson) return null
  if (getApps().length === 0) {
    initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) })
  }
  return getMessaging()
}

function permanentlyInvalidToken(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) return false
  return new Set([
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered',
  ]).has(String(error.code))
}

/**
 * Expands each durable notification into per-device deliveries, then sends claimed
 * deliveries. A short lease prevents overlapping cron runs from sending the same row.
 */
export async function deliverPushOutbox(limit = 50) {
  const messaging = firebaseMessaging()
  if (!messaging) return { configured: false, attempted: 0, sent: 0, failed: [] as string[] }

  const unexpanded = await db.notification.findMany({
    where: { pushExpandedAt: null },
    select: { id: true, recipientId: true },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })
  for (const notification of unexpanded) {
    await db.$transaction(async (tx) => {
      const installations = await tx.deviceInstallation.findMany({
        where: {
          stakeholderId: notification.recipientId,
          disabledAt: null,
          lastSeenAt: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
        },
        select: { id: true },
      })
      if (installations.length) {
        await tx.notificationPushDelivery.createMany({
          data: installations.map((installation) => ({
            notificationId: notification.id,
            installationId: installation.id,
          })),
          skipDuplicates: true,
        })
      }
      await tx.notification.update({
        where: { id: notification.id },
        data: { pushExpandedAt: new Date() },
      })
    })
  }

  const leaseCutoff = new Date(Date.now() - 5 * 60 * 1000)
  const pending = await db.notificationPushDelivery.findMany({
    where: {
      sentAt: null,
      attempts: { lt: 8 },
      installation: { disabledAt: null },
      OR: [{ claimedAt: null }, { claimedAt: { lt: leaseCutoff } }],
    },
    include: { notification: true, installation: true },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })

  let sent = 0
  const failures: string[] = []
  for (const delivery of pending) {
    if (delivery.installation.stakeholderId !== delivery.notification.recipientId) {
      await db.notificationPushDelivery.deleteMany({
        where: {
          id: delivery.id,
          sentAt: null,
          installation: { stakeholderId: { not: delivery.notification.recipientId } },
        },
      })
      continue
    }
    const claimed = await db.notificationPushDelivery.updateMany({
      where: {
        id: delivery.id,
        sentAt: null,
        attempts: { lt: 8 },
        installation: {
          stakeholderId: delivery.notification.recipientId,
          disabledAt: null,
        },
        OR: [{ claimedAt: null }, { claimedAt: { lt: leaseCutoff } }],
      },
      data: { claimedAt: new Date() },
    })
    if (claimed.count === 0) continue

    try {
      await messaging.send({
        token: delivery.installation.token,
        notification: {
          title: 'Kivilo',
          body: 'Open Kivilo to view your notifications.',
        },
        android: { priority: 'high', notification: { sound: 'default' } },
        apns: { payload: { aps: { sound: 'default' } } },
      })
      await db.notificationPushDelivery.updateMany({
        where: { id: delivery.id },
        data: { sentAt: new Date(), claimedAt: null, attempts: { increment: 1 }, error: null },
      })
      sent += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await db.$transaction([
        db.notificationPushDelivery.updateMany({
          where: { id: delivery.id },
          data: { claimedAt: null, attempts: { increment: 1 }, error: message.slice(0, 1000) },
        }),
        ...(permanentlyInvalidToken(error)
          ? [db.deviceInstallation.updateMany({
              where: {
                id: delivery.installationId,
                stakeholderId: delivery.notification.recipientId,
              },
              data: { disabledAt: new Date() },
            })]
          : []),
      ])
      failures.push(delivery.id)
    }
  }

  return { configured: true, attempted: pending.length, sent, failed: failures }
}
