'use server'

import { ZodError } from 'zod'
import { updatePropertyLifecycle } from '@/lib/property-actions'
import { PropertyLifecycleError } from '@/lib/property-management'
import { currentStakeholder } from '@/lib/auth'
import { messages } from '@/lib/i18n'
import { requestLocale } from '@/lib/i18n/request'

export async function updatePropertyFromWeb(
  id: string,
  input: Parameters<typeof updatePropertyLifecycle>[1],
) {
  try {
    return { ok: true as const, property: await updatePropertyLifecycle(id, input) }
  } catch (error) {
    const w = messages(await requestLocale(await currentStakeholder())).pwa
    if (error instanceof PropertyLifecycleError) return { ok: false as const, error: w.lifecycleError(error.code, error.message) }
    if (error instanceof ZodError)
      return { ok: false as const, error: error.issues.map((issue) => issue.message).join(' ') }
    if (error instanceof Error && /not found/i.test(error.message))
      return {
        ok: false as const,
        error: w.propertyNoLongerAvailable,
      }
    throw error
  }
}
