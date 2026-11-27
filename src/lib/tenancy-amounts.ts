import { z } from 'zod'
import type { Prisma } from '@/generated/prisma'

// A released phone writes zero for an untouched field. Only a client which
// preserves blanks can distinguish a deliberate zero from that older default.
export const tenancyAmount = z.string().trim().regex(/^\d{1,8}(?:\.\d{1,2})?$/, 'Enter a valid amount with up to 2 decimals')
export const optionalTenancyAmount = z.union([z.literal(''), tenancyAmount])

export function amountEntered(value: string, preservesBlanks: boolean) {
  return value !== '' && (preservesBlanks || Number(value) !== 0)
}

export function recordedAmount(value: Prisma.Decimal, entered: boolean | null) {
  return entered || !value.isZero() ? value.toString() : null
}
