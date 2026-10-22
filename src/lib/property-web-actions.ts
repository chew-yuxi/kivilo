'use server'

import { ZodError } from 'zod'
import { updatePropertyLifecycle } from '@/lib/property-actions'
import { PropertyLifecycleError } from '@/lib/property-management'

export async function updatePropertyFromWeb(
  id: string,
  input: Parameters<typeof updatePropertyLifecycle>[1],
) {
  try {
    return { ok: true as const, property: await updatePropertyLifecycle(id, input) }
  } catch (error) {
    if (error instanceof PropertyLifecycleError) return { ok: false as const, error: error.message }
    if (error instanceof ZodError)
      return { ok: false as const, error: error.issues.map((issue) => issue.message).join(' ') }
    if (error instanceof Error && /not found/i.test(error.message))
      return {
        ok: false as const,
        error: 'This property is no longer available. Refresh the page to continue.',
      }
    throw error
  }
}
