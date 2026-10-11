import { db } from '@/lib/db'
import { sendMaintenanceNotification } from '@/lib/email'
import { deliverPushOutbox } from '@/lib/push'
import { activeNotificationRecipients } from '@/lib/notification-recipients'

/// Creates reminders and delivers the durable email and push outboxes. In-app
/// notifications are already committed with the domain change; transports retry alone.
export async function deliverNotificationOutbox(limit = 25) {
  const overdue = await db.maintenanceCase.findMany({
    where: {
      status: 'REPORTED',
      createdAt: { lte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    include: { tenancy: true },
    take: 100,
  })
  const activeRecipients = new Set(await activeNotificationRecipients(
    db,
    overdue.flatMap((item) => [item.tenancy.landlordId, item.tenancy.agentId].filter(
      (id): id is string => Boolean(id),
    )),
  ))
  for (const item of overdue) {
    const recipients = [item.tenancy.landlordId]
    if (item.tenancy.agentId && item.tenancy.endDate >= new Date()) recipients.push(item.tenancy.agentId)
    const active = recipients.filter((id) => activeRecipients.has(id))
    if (active.length) await db.notification.createMany({
      data: active.map((recipientId) => ({
        recipientId,
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
      await sendMaintenanceNotification(notification.recipient.email!, notification)
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
