import { requireAdmin } from '@/lib/admin'
import { db } from '@/lib/db'
import type { Prisma } from '@/generated/prisma'

/// An account cohort, separate from the inspection-created funnel in adminUsage.
/// Dates are authoritative milestones. Source labels are client observations.
export async function adminAcquisition(now = new Date()) {
  await requireAdmin()
  const since = new Date(now.getTime() - 30 * 86_400_000)
  const excludedEmails = [process.env.ADMIN_EMAILS, process.env.ACQUISITION_EXCLUDED_EMAILS]
    .flatMap(value => (value ?? '').split(','))
    .map(value => value.trim().toLowerCase()).filter(Boolean)
  const cohort: Prisma.AccountAcquisitionWhereInput = { verifiedAt: { gte: since, lte: now } }
  const exclusions: Prisma.AccountAcquisitionWhereInput = {
    OR: [{ excluded: true }, { stakeholder: { email: { in: excludedEmails } } }],
  }
  const where: Prisma.AccountAcquisitionWhereInput = { ...cohort, NOT: exclusions }
  const by = ['source', 'medium', 'campaign', 'landing', 'entryPoint'] as const
  // A delayed invoice or account erasure must not change the denominator halfway
  // through reading its milestones.
  const [accounts, completed, paid, excluded] = await db.$transaction(async tx => {
    const accounts = await tx.accountAcquisition.groupBy({ by: [...by], where, _count: true })
    const completed = await tx.accountAcquisition.groupBy({ by: [...by], where: { ...where, firstCompletedReportAt: { lte: now } }, _count: true })
    const paid = await tx.accountAcquisition.groupBy({ by: [...by], where: { ...where, firstPaidAt: { lte: now } }, _count: true })
    const excluded = await tx.accountAcquisition.count({ where: { ...cohort, AND: exclusions } })
    return [accounts, completed, paid, excluded] as const
  }, { isolationLevel: 'RepeatableRead' })
  const key = (row: { [K in typeof by[number]]: string | null }) => JSON.stringify(by.map(field => row[field]))
  const completedBySource = new Map(completed.map(row => [key(row), row._count]))
  const paidBySource = new Map(paid.map(row => [key(row), row._count]))
  const groups = accounts.map(row => ({
    source: row.source, medium: row.medium, campaign: row.campaign, landing: row.landing,
    entryPoint: row.entryPoint, accounts: row._count,
    completed: completedBySource.get(key(row)) ?? 0,
    paid: paidBySource.get(key(row)) ?? 0,
  })).sort((a, b) => b.accounts - a.accounts || a.source.localeCompare(b.source))
  return {
    since, until: now, excluded, groups,
    accounts: groups.reduce((sum, row) => sum + row.accounts, 0),
    completed: groups.reduce((sum, row) => sum + row.completed, 0),
    paid: groups.reduce((sum, row) => sum + row.paid, 0),
  }
}
