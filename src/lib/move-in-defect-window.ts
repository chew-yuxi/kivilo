const DAY = 24 * 60 * 60 * 1000
const SINGAPORE_OFFSET = 8 * 60 * 60 * 1000

export function singaporeCalendarDate(date: Date) {
  return new Date(date.getTime() + SINGAPORE_OFFSET).toISOString().slice(0, 10)
}

/// Tenancy dates describe Singapore calendar days. The first day counts: a 30-day
/// window beginning 1 June ends at 23:59:59.999 Singapore time on 30 June.
export function moveInDefectWindow(
  tenancy: { startDate: Date; defectWindowDays: number },
  now = new Date(),
) {
  const local = new Date(tenancy.startDate.getTime() + SINGAPORE_OFFSET)
  const opensAt = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - SINGAPORE_OFFSET)
  const deadline = tenancy.defectWindowDays === 0
    ? null
    : new Date(opensAt.getTime() + tenancy.defectWindowDays * DAY - 1)
  return {
    windowDays: tenancy.defectWindowDays,
    opensAt,
    deadline,
    open: deadline !== null && now >= opensAt && now <= deadline,
  }
}
