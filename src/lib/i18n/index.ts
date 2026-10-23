import type { Prisma } from '@/generated/prisma'
import { en, type Messages } from './en'
import { th } from './th'
import { zh } from './zh'

export type { Messages }

export const locales = ['en', 'zh', 'th'] as const
export type Locale = (typeof locales)[number]

const catalogs: Record<Locale, Messages> = { en, zh, th }

/// A stored or requested language, or null for anything Kivilo does not speak.
export function parseLocale(value: unknown): Locale | null {
  return locales.find((locale) => locale === value) ?? null
}

/// The catalog for a stored language. Null, never chosen, is English.
export function messages(locale: string | null | undefined): Messages {
  return catalogs[parseLocale(locale) ?? 'en']
}

/// The first language in an `Accept-Language` header that Kivilo speaks, by base
/// language, so `zh-Hant-TW` reads Chinese and `th-TH` Thai.
export function acceptedLocale(header: string | null | undefined): Locale | null {
  for (const part of (header ?? '').split(',')) {
    const locale = parseLocale(part.split(';')[0].trim().split('-')[0].toLowerCase())
    if (locale) return locale
  }
  return null
}

/// Each recipient's catalog, for writing the notifications they will read.
export async function recipientMessages(
  client: Pick<Prisma.TransactionClient, 'stakeholder'>,
  ids: string[],
): Promise<Map<string, Messages>> {
  const people = await client.stakeholder.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { id: true, locale: true },
  })
  return new Map(people.map((person) => [person.id, messages(person.locale)]))
}

/// A date as a person reads it in their language, in Singapore time.
export function formatDate(m: Messages, date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(m.intl, { ...options, timeZone: 'Asia/Singapore' }).format(date)
}

type Words = (m: Messages) => { title: string; body: string }

/// Notification rows with their title and body written in each recipient's language,
/// which is what the inbox, the push and the notification email all read.
export async function inRecipientLanguage<T extends { recipientId: string; words: Words }>(
  client: Pick<Prisma.TransactionClient, 'stakeholder'>,
  rows: T[],
): Promise<(Omit<T, 'words'> & { title: string; body: string })[]> {
  const catalogs = await recipientMessages(client, rows.map((row) => row.recipientId))
  return rows.map(({ words, ...row }) => ({ ...row, ...words(catalogs.get(row.recipientId) ?? en) }))
}
