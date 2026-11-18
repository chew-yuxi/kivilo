import type { Property } from '@/generated/prisma'
import { countryName } from '@/lib/country'

/// "#28-05, 2 Marina Boulevard, Singapore 018987", or "A-12-3, Jalan Ampang, 50450
/// Malaysia": each the way that country writes an address.
export function propertyLabel(property: Pick<Property, 'line1' | 'unit' | 'postalCode' | 'country'>) {
  const unit = property.unit ? `${property.unit}, ` : ''
  if (property.country === 'SG') return `${unit}${property.line1}, Singapore ${property.postalCode}`
  return `${unit}${property.line1}, ${property.postalCode} ${countryName(property.country)}`
}

export function timecode(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
