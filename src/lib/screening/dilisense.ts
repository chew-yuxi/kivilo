import { createHash } from 'node:crypto'
import type { ListEntry } from './un-list'

/// Politically exposed persons from Dilisense (plans/compliance-pack.md, tested 30 October
/// 2026: every Singapore minister found, common names noisy without a full legal name and
/// date of birth). Only its PEP records are used; sanctions stay on the official lists Kivilo
/// loads itself. Its records go through Kivilo's own matcher like any list entry, so a
/// common name returns the few close matches rather than hundreds.
const API = () => process.env.DILISENSE_BASE_URL ?? 'https://api.dilisense.com'

type DilisenseRecord = {
  id: string
  source_type: string
  pep_type?: string
  name: string
  alias_names?: string[]
  date_of_birth?: string[]
  citizenship?: string[]
  positions?: string[]
}

export type PepEntry = ListEntry & { pepType: string | null; positions: string[] }

/// "07/10/1952" or "00/00/2019"; only the year is compared.
const year = (date: string) => Number(date.slice(-4)) || null

export async function pepEntries(name: string, dateOfBirth: Date | null, fetcher: typeof fetch = fetch) {
  const key = process.env.DILISENSE_API_KEY
  if (!key) throw new Error('DILISENSE_API_KEY must be set to check politically exposed persons')
  const url = new URL('/v1/checkIndividual', API())
  url.searchParams.set('names', name)
  if (dateOfBirth) {
    const iso = dateOfBirth.toISOString()
    url.searchParams.set('dob', `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`)
  }
  const response = await fetcher(url, { headers: { 'x-api-key': key }, cache: 'no-store' })
  if (!response.ok) throw new Error(`Dilisense answered HTTP ${response.status}`)
  const body = (await response.json()) as { timestamp?: string; found_records?: DilisenseRecord[] }
  const records = (body.found_records ?? []).filter((record) => record.source_type === 'PEP')
  const entries: PepEntry[] = records.map((record) => ({
    list: 'PEP',
    reference: `Dilisense ${record.id}`,
    kind: 'INDIVIDUAL',
    names: [record.name, ...(record.alias_names ?? [])].map((listed) => ({ name: listed, weak: false })),
    birthYears: [...new Set((record.date_of_birth ?? []).map(year).filter((value): value is number => value !== null))],
    nationalities: record.citizenship ?? [],
    listedOn: null,
    pepType: record.pep_type ?? null,
    positions: (record.positions ?? []).slice(0, 3),
  }))
  return {
    entries,
    /// What the check was, for the record: when, and a fingerprint of what came back.
    version: {
      source: 'PEP' as const,
      publishedAt: null,
      checksum: createHash('sha256').update(JSON.stringify(records)).digest('hex'),
      fetchedAt: body.timestamp ?? new Date().toISOString(),
    },
  }
}
