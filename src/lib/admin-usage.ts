import { requireAdmin } from '@/lib/admin'
import { db } from '@/lib/db'

/// The inspection funnel includes both clients and predates analytics. A cohort is
/// inspections created in this period, measured by the saved workflow state.
export async function adminUsage(now = new Date()) {
  await requireAdmin()
  const since = new Date(now.getTime() - 30 * 86_400_000)
  const cohort = { createdAt: { gte: since } }
  const [active, screens, sources, created, captured, reviewed, sent, completed, errors] = await Promise.all([
    db.productEvent.findMany({ where: cohort, distinct: ['stakeholderId'], select: { stakeholderId: true } }),
    db.productEvent.groupBy({ by: ['properties'], where: cohort, _count: true, orderBy: { _count: { id: 'desc' } } }),
    db.productEvent.groupBy({ by: ['source'], where: cohort, _count: true }),
    db.inspection.count({ where: cohort }),
    db.inspection.count({ where: { ...cohort, rooms: { some: { captures: { some: {} } } } } }),
    db.inspection.count({ where: { ...cohort, OR: [{ rooms: { some: { status: 'REVIEWED' } } }, { status: { in: ['AWAITING_SIGNATURE', 'COMPLETED'] } }] } }),
    db.inspection.count({ where: { ...cohort, status: { in: ['AWAITING_SIGNATURE', 'COMPLETED'] } } }),
    db.inspection.count({ where: { ...cohort, status: 'COMPLETED' } }),
    db.errorEvent.groupBy({ by: ['fingerprint', 'source', 'name'], where: cohort, _count: true, _max: { createdAt: true }, orderBy: { _count: { id: 'desc' } }, take: 20 }),
  ])
  return { active: active.length, screens, sources, created, captured, reviewed, sent, completed, errors }
}
