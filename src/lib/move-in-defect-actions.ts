'use server'

import { revalidatePath } from 'next/cache'
import { requireStakeholder } from '@/lib/auth'
import { acknowledgeAddendum } from '@/lib/addendum-actions'
import { disputeMoveInDefect, MoveInDefectStaleTargetError } from '@/lib/move-in-defects'

export async function agreeMoveInDefectAsSelf(addendumId: string) {
  try {
    await acknowledgeAddendum(addendumId)
    return { error: null }
  } catch (error) {
    if (error instanceof MoveInDefectStaleTargetError) return { error: error.message }
    throw error
  }
}

export async function disputeMoveInDefectAsSelf(addendumId: string, reason: string) {
  const viewer = await requireStakeholder()
  await disputeMoveInDefect(addendumId, viewer.id, { reason })
  revalidatePath(`/updates/${addendumId}`)
}
