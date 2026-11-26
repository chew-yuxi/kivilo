import type { Prisma } from '@/generated/prisma'
import { CddStateError } from './errors'

/// One server switch for new client checks. Existing case links and records stay readable.
export function clientChecksEnabled() {
  return process.env.KIVILO_CLIENT_CHECKS_ENABLED === 'true'
}

export function requireClientChecksEnabled() {
  if (!clientChecksEnabled()) throw new CddStateError('New client checks are paused.')
}

/// Leave existing inbox records in place while withholding pending emails and pushes.
export function deliverableNotificationKinds(): Prisma.NotificationWhereInput {
  return clientChecksEnabled() ? {} : { kind: { not: 'CDD_REQUEST' } }
}
