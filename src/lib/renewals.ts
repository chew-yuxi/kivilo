import { db } from '@/lib/db'
import { leadTenancies } from '@/lib/auth'
import { activeNotificationRecipients } from '@/lib/notification-recipients'
import { propertyLabel } from '@/lib/format'
import type { Prisma } from '@/generated/prisma'
import type { InspectionWorkFilters } from '@/lib/inspection-work'

/// Calendar months, clamped at month end: 31 May reminds on 28/29 February.
/// Tenancy dates are stored at UTC midnight; no server timezone enters the calculation.
export function renewalDueAt(endDate: Date) {
  const result = new Date(endDate)
  const day = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() - 3)
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(day, lastDay))
  return result
}

function pendingRenewals(now: Date): Prisma.TenancyWhereInput {
  // Four months is only a query bound; the precise three-calendar-month test below
  // handles short months without losing the last three days of a month.
  const horizon = new Date(now)
  horizon.setUTCMonth(horizon.getUTCMonth() + 4)
  return {
    property: { archivedAt: null, trashedAt: null },
    endDate: { gte: now, lte: horizon },
    renewalDecision: null,
    renewedAs: null,
    inspections: { none: { kind: 'CHECK_OUT', status: 'COMPLETED' } },
    OR: [{ renewalSnoozedUntil: null }, { renewalSnoozedUntil: { lte: now } }],
  }
}

/// The lead and team managers can renew a tenancy. Workspace filters narrow those
/// cards without granting access or changing the cron's lead-only delivery.
export async function dueRenewals(
  agentId: string,
  now = new Date(),
  filters: Pick<InspectionWorkFilters, 'agencyId' | 'personal' | 'mine'> = {},
) {
  const scope: Prisma.TenancyWhereInput[] = [leadTenancies(agentId), pendingRenewals(now)]
  if (filters.agencyId) scope.push({
    agencyId: filters.agencyId,
    agency: { members: { some: { stakeholderId: agentId, status: 'ACTIVE' } } },
  })
  if (filters.personal) scope.push({ agencyId: null })
  if (filters.mine) scope.push({ agentId })
  const tenancies = await db.tenancy.findMany({
    where: { AND: scope },
    include: { property: true, tenant: { select: { name: true } } },
    orderBy: { endDate: 'asc' },
  })
  return tenancies.filter((tenancy) => renewalDueAt(tenancy.endDate) <= now).map((tenancy) => ({
    id: tenancy.id,
    property: propertyLabel(tenancy.property),
    tenant: tenancy.tenant.name,
    endDate: tenancy.endDate.toISOString().slice(0, 10),
  }))
}

/// Once per term, to the agent holding the deal. Existing transports retry the durable
/// row independently; opening/dismissing a card never sends mail itself.
export async function queueRenewalReminders(now = new Date()) {
  const tenancies = await db.tenancy.findMany({
    where: { AND: [pendingRenewals(now), { agentId: { not: null } }] },
    include: { property: true },
    orderBy: { endDate: 'asc' },
  })
  const due = tenancies.filter((tenancy) => renewalDueAt(tenancy.endDate) <= now)
  const active = new Set(await activeNotificationRecipients(db, due.map((tenancy) => tenancy.agentId!)))
  const reminders = due.filter((tenancy) => active.has(tenancy.agentId!))
  if (!reminders.length) return 0
  const result = await db.notification.createMany({
    data: reminders.map((tenancy) => ({
      recipientId: tenancy.agentId!,
      tenancyId: tenancy.id,
      kind: 'RENEWAL_DUE' as const,
      title: 'Renewal due',
      body: `${propertyLabel(tenancy.property)}: tenancy ends ${tenancy.endDate.toISOString().slice(0, 10)}. Arrange the renewal with the landlord and tenant.`,
      href: '/inspections',
      dedupeKey: `renewal:${tenancy.id}:${tenancy.endDate.toISOString()}`,
    })),
    skipDuplicates: true,
  })
  return result.count
}
