'use server'

import { revalidatePath } from 'next/cache'
import { restoreFromBin } from '@/lib/actions'

export async function restoreFromWeb(binItemId: string, propertyId: string) {
  try {
    await restoreFromBin(binItemId)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (/Restore the room first|can no longer be changed/.test(message)) return { ok: false as const, error: message }
    if (/not found/i.test(message)) {
      return { ok: false as const, error: 'This can no longer be restored. Refresh the page to continue.' }
    }
    throw error
  }
  revalidatePath(`/properties/${propertyId}/history`)
  return { ok: true as const }
}
