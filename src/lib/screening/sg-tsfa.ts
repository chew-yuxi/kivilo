import type { ListEntry, ParsedList } from './un-list'

/// Singapore's own terrorist designations: paragraph 2 of the First Schedule of the
/// Terrorism (Suppression of Financing) Act 2002, which CEA requires agents to screen
/// against alongside the UN lists. Paragraph 1 refers to UN lists already in the UN
/// consolidated list. There is no data feed, only the statute on Singapore Statutes Online
/// (plans/compliance-pack.md, "Day 0").
export const SG_TSFA_URL = 'https://sso.agc.gov.sg/Act/TSFA2002?ProvIds=Sc1-'

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

function textOf(html: string) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match)
    .replace(/\s+/g, ' ')
}

/// "(zzb) Tan Jun Jie (Singapore citizen) (Date of Birth: 19 March 2007)". A deleted
/// paragraph reads "(e) [Deleted by ...]" and never matches, since a name cannot start
/// with a bracket.
const ENTRY = /\(\s*([a-z]{1,3})\s*\)\s*([^()[\];]+?)\s*\(([A-Za-z ]+?) citizen\)((?:\s*\([^)]*\))*)/g
const BIRTH = /Date of Birth:\s*\d{1,2}\s+[A-Za-z]+\s+(\d{4})/g
const IN_FORCE = /wef (\d{2})\/(\d{2})\/(\d{4})/g

export function parseTsfaFirstSchedule(html: string): ParsedList {
  const text = textOf(html)
  const start = text.indexOf('The following individuals')
  const end = text.indexOf('In this Schedule', start)
  if (start < 0 || end < 0) throw new Error('First Schedule paragraph 2 not found')
  const paragraph = text.slice(start, end)

  const entries: ListEntry[] = [...paragraph.matchAll(ENTRY)].map(([, letter, names, country, details]) => ({
    list: 'SG',
    reference: `TSFA First Schedule 2(${letter})`,
    kind: 'INDIVIDUAL',
    names: names.split(' @ ').map((name) => ({ name: name.trim(), weak: false })),
    birthYears: [...new Set([...details.matchAll(BIRTH)].map((match) => Number(match[1])))].sort(),
    nationalities: [country.trim()],
    listedOn: null,
  }))
  // The latest amendment in force dates this version of the schedule.
  const dates = [...paragraph.matchAll(IN_FORCE)].map(([, day, month, year]) => `${year}-${month}-${day}`)
  return { generatedAt: dates.sort().at(-1) ?? null, entries }
}
