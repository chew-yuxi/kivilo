import type { ListEntry } from './un-list'

/// Who is being screened: a client, or a beneficial owner of a company client.
export type Person = {
  kind: 'INDIVIDUAL' | 'ENTITY'
  name: string
  birthYear?: number | null
}

export type Candidate = {
  entry: ListEntry
  matchedName: string
  score: number
  nameScore: number
  birthYearAgrees: boolean | null
}

/// At or above this a listed person is shown to the agent for a decision. Tuned to
/// over-flag: a reviewed false alarm costs the agent a minute, a miss is the breach.
export const REVIEW_THRESHOLD = 0.85

export function normalizeName(name: string) {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/// Particles and titles that say nothing about who someone is. Left in, "bin", "al" and
/// "haji" make unrelated Malay and Arabic names look alike.
const FILLER = new Set([
  'bin', 'binti', 'binte', 'bte', 'bt', 'b', 's', 'o', 'd', 'al', 'el', 'ul',
  'mr', 'mrs', 'ms', 'dr', 'haji', 'hajjah', 'hj', 'mullah', 'sheikh', 'shaikh', 'general', 'maulvi', 'qari',
])

function nameParts(name: string) {
  const parts = normalizeName(name).split(' ').filter(Boolean)
  const meaningful = parts.filter((part) => !FILLER.has(part))
  return meaningful.length > 0 ? meaningful : parts
}

/// Credit for two name parts being the same name: full for identical or a likely typo,
/// none below 0.84 Jaro-Winkler, where different names of similar length land.
function partSimilarity(a: string, b: string) {
  const similarity = jaroWinkler(a, b)
  if (similarity >= 0.97) return 1
  return Math.max(0, (similarity - 0.84) / 0.13)
}

function jaroWinkler(a: string, b: string) {
  if (a === b) return 1
  const range = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1)
  const aMatched = new Array<boolean>(a.length).fill(false)
  const bMatched = new Array<boolean>(b.length).fill(false)
  let matches = 0
  for (let i = 0; i < a.length; i++) {
    for (let j = Math.max(0, i - range); j < Math.min(b.length, i + range + 1); j++) {
      if (bMatched[j] || a[i] !== b[j]) continue
      aMatched[i] = bMatched[j] = true
      matches++
      break
    }
  }
  if (matches === 0) return 0
  let transpositions = 0
  for (let i = 0, j = 0; i < a.length; i++) {
    if (!aMatched[i]) continue
    while (!bMatched[j]) j++
    if (a[i] !== b[j]) transpositions++
    j++
  }
  const jaro = (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3
  let prefix = 0
  while (prefix < 4 && a[prefix] === b[prefix]) prefix++
  return jaro + prefix * 0.1 * (1 - jaro)
}

function coverage(from: string[], to: string[]) {
  const total = from.reduce((sum, token) => sum + Math.max(...to.map((other) => partSimilarity(token, other))), 0)
  return total / from.length
}

/// How alike two names are, from 0 to 1, whatever order their parts come in.
export function nameSimilarity(a: string, b: string) {
  const left = nameParts(a)
  const right = nameParts(b)
  if (left.length === 0 || right.length === 0) return 0
  if (left.join(' ') === right.join(' ')) return 1
  const given = coverage(left, right)
  const symmetric = (given + coverage(right, left)) / 2
  // Clients give their name as on their ID; lists often carry extra patronymics. Every
  // part the client gave appearing in the listed name is enough to look, if they gave two.
  const contained = left.length >= 2 && given >= 0.95 ? 0.9 * given : 0
  return Math.max(symmetric, contained)
}

function birthYearAgrees(entry: ListEntry, year: number | null | undefined) {
  if (!year || entry.birthYears.length === 0) return null
  return entry.birthYears.some((listed) => Math.abs(listed - year) <= 1)
}

/// Every listed person or entity close enough to `person` for the agent to decide on,
/// most likely first. A different birth year only lowers a fuzzy match: an identical name
/// is always shown, because listed dates of birth are often approximate or wrong.
export function screen(person: Person, entries: ListEntry[]): Candidate[] {
  const candidates: Candidate[] = []
  for (const entry of entries) {
    if (entry.kind !== person.kind) continue
    let best = { name: '', score: 0 }
    for (const listed of entry.names) {
      const score = nameSimilarity(person.name, listed.name) * (listed.weak ? 0.95 : 1)
      if (score > best.score) best = { name: listed.name, score }
    }
    const agrees = birthYearAgrees(entry, person.birthYear)
    let score = best.score
    if (agrees === true) score = Math.min(1, score + 0.05)
    if (agrees === false && best.score < 0.97) score -= 0.1
    if (score >= REVIEW_THRESHOLD) {
      candidates.push({ entry, matchedName: best.name, score, nameScore: best.score, birthYearAgrees: agrees })
    }
  }
  return candidates.sort((a, b) => b.score - a.score)
}
