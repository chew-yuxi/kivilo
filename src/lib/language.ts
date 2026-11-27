import { z } from 'zod'
import { db } from '@/lib/db'
import { locales } from '@/lib/i18n'

const languageInput = z.object({ locale: z.enum(locales) })

/// Records the language a person reads Kivilo in, which their notifications and emails
/// are then written in. It is their own preference, so it needs no tenancy access.
export async function saveLocale(stakeholderId: string, input: unknown) {
  const { locale } = languageInput.parse(input)
  await db.stakeholder.update({ where: { id: stakeholderId }, data: { locale } })
  return { locale }
}
