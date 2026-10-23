import type { InspectionStatus } from '@/generated/prisma'

export type BinKind = 'ROOM' | 'ITEM' | 'CAPTURE' | 'FINDING'

export const BIN_DAYS = 30

/// A sent or signed report never changes, so its rooms, lines and photos cannot come
/// back. Findings are the check-out's working assessment and stay editable after Send,
/// so a deleted finding can be restored for as long as it could have been deleted.
export function restoreAllowed(kind: string, status: InspectionStatus | undefined) {
  if (!status) return false
  if (kind === 'FINDING') return true
  return status !== 'AWAITING_SIGNATURE' && status !== 'COMPLETED'
}
