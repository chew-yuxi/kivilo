'use server'

import { revalidatePath } from 'next/cache'
import { requireStakeholder } from '@/lib/auth'
import { updateTenancyTerms } from '@/lib/maintenance'

export async function setDefectWindow(tenancyId: string, windowDays: number, inspectionId: string) {
  const viewer = await requireStakeholder()
  await updateTenancyTerms(tenancyId, viewer.id, { defectWindowDays: windowDays })
  // The inspection id only chooses which view to refresh; it grants no write access.
  revalidatePath(`/inspections/${inspectionId}`)
  revalidatePath(`/handover/${inspectionId}`)
}
