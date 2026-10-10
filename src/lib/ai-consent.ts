'use server'

import { revalidatePath } from 'next/cache'
import { authorizeInspection, requireAgent } from '@/lib/auth'
import { db } from '@/lib/db'

/// The inspector explicitly agrees before property images, video, or inspection
/// inventory are sent to Gemini or Anthropic. Consent is scoped to one inspection.
export async function grantAiConsent(inspectionId: string) {
  const agent = await requireAgent()
  await authorizeInspection(inspectionId, agent.id)
  const inspection = await db.inspection.findUniqueOrThrow({
    where: { id: inspectionId },
    select: { aiConsentAt: true },
  })
  if (inspection.aiConsentAt) return { consentedAt: inspection.aiConsentAt }
  const consentedAt = new Date()
  const updated = await db.inspection.updateMany({
    where: { id: inspectionId, aiConsentAt: null },
    data: { aiConsentAt: consentedAt, aiConsentById: agent.id },
  })
  const result = updated.count
    ? consentedAt
    : (await db.inspection.findUniqueOrThrow({
        where: { id: inspectionId },
        select: { aiConsentAt: true },
      })).aiConsentAt!
  revalidatePath(`/inspections/${inspectionId}`)
  return { consentedAt: result }
}
