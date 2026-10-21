import { db } from '@/lib/db'
import { sendMaintenanceNotification, sendReportUpdateNotification, sendRenewalReminder, sendPropertySharedNotification } from '@/lib/email'
import { queueRenewalReminders } from '@/lib/renewals'
import { deliverPushOutbox } from '@/lib/push'
import { activeNotificationRecipients, notificationCanBeDelivered } from '@/lib/notification-recipients'

/// Creates reminders and delivers the durable email and push outboxes. In-app
/// notifications are already committed with the domain change; transports retry alone.
export async function deliverNotificationOutbox(limit = 25) {
  await queueRenewalReminders()
  const overdue = await db.maintenanceCase.findMany({
    where: {
      status: 'REPORTED',
      createdAt: { lte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    include: { tenancy: { include: { collaborators: { select: { stakeholderId: true } } } } },
    take: 100,
  })
  const activeRecipients = new Set(await activeNotificationRecipients(
    db,
    overdue.flatMap((item) => [item.tenancy.landlordId, item.tenancy.agentId, ...item.tenancy.collaborators.map((person) => person.stakeholderId)].filter(
      (id): id is string => Boolean(id),
    )),
  ))
  for (const item of overdue) {
    const recipients = [item.tenancy.landlordId]
    if (item.tenancy.endDate >= new Date()) {
      if (item.tenancy.agentId) recipients.push(item.tenancy.agentId)
      recipients.push(...item.tenancy.collaborators.map((person) => person.stakeholderId))
    }
    const active = recipients.filter((id) => activeRecipients.has(id))
    if (active.length) await db.notification.createMany({
      data: active.map((recipientId) => ({
        recipientId,
        tenancyId: item.tenancyId,
        kind: 'MAINTENANCE_STATUS' as const,
        title: 'Maintenance report needs acknowledgement',
        body: item.title,
        href: `/maintenance/${item.id}`,
        dedupeKey: `maintenance-overdue:${item.id}:${recipientId}`,
      })),
      skipDuplicates: true,
    })
  }

  const pending = await db.notification.findMany({
    where: {
      emailSentAt: null,
      emailAttempts: { lt: 8 },
      recipient: {
        email: { not: null },
        deletionRequests: { none: { status: { in: ['PROCESSING', 'COMPLETED'] } } },
      },
    },
    include: { recipient: { select: { email: true } } },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })
  let sent = 0
  const failures: string[] = []
  for (const notification of pending) {
    try {
      if (!await notificationCanBeDelivered(db, notification)) continue
      if (notification.kind === 'PROPERTY_SHARED') {
        await sendPropertySharedNotification(notification.recipient.email!, { ...notification, href: notification.href! })
      } else if (notification.kind === 'REPORT_UPDATED') {
        await sendReportUpdateNotification(notification.recipient.email!, { ...notification, href: notification.href! })
      } else if (notification.kind === 'RENEWAL_DUE') {
        await sendRenewalReminder(notification.recipient.email!, notification)
      } else {
        await sendMaintenanceNotification(notification.recipient.email!, notification)
      }
      await db.notification.update({
        where: { id: notification.id },
        data: {
          emailTo: notification.recipient.email,
          emailSentAt: new Date(),
          emailAttempts: { increment: 1 },
          emailError: null,
        },
      })
      sent += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await db.notification.update({
        where: { id: notification.id },
        data: {
          emailTo: notification.recipient.email,
          emailAttempts: { increment: 1 },
          emailError: message.slice(0, 1000),
        },
      })
      failures.push(notification.id)
    }
  }
  const push = await deliverPushOutbox(limit)
  return { email: { attempted: pending.length, sent, failed: failures }, push }
}
