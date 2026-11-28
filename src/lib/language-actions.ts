'use server'

import { revalidatePath } from 'next/cache'
import { requireAgent } from '@/lib/auth'
import { saveLocale } from '@/lib/language'

/// The web's language picker: the same stored choice the app reports, so the agent's
/// notifications and emails follow it too.
export async function setLanguage(locale: string) {
  const agent = await requireAgent()
  await saveLocale(agent.id, { locale })
  revalidatePath('/', 'layout')
}
