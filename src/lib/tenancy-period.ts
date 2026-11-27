// Tenancy dates are calendar days. The final day is the day before the anniversary.
export function tenancyEndDate(start: string, years: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return ''
  const end = new Date(start + 'T00:00:00Z')
  if (Number.isNaN(end.getTime())) return ''
  end.setUTCFullYear(end.getUTCFullYear() + years, end.getUTCMonth(), end.getUTCDate() - 1)
  return end.toISOString().slice(0, 10)
}
