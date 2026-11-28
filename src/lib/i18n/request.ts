import { headers } from 'next/headers'
import { acceptedLocale, parseLocale, type Locale } from '@/lib/i18n'

/// The language a page is drawn in: the signed-in person's own choice, else the
/// browser's, else English. Never from the URL, so every link already sent keeps working.
export async function requestLocale(person?: { locale: string | null } | null): Promise<Locale> {
  return parseLocale(person?.locale) ??
    acceptedLocale((await headers()).get('accept-language')) ??
    'en'
}
