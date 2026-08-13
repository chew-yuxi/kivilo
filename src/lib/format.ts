import type { Property } from '@/generated/prisma'

export function propertyLabel(property: Pick<Property, 'line1' | 'unit' | 'postalCode'>) {
  const unit = property.unit ? `${property.unit}, ` : ''
  return `${unit}${property.line1}, Singapore ${property.postalCode}`
}

const SGD = new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' })

export function sgd(amount: number | string) {
  return SGD.format(Number(amount))
}

export function timecode(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
