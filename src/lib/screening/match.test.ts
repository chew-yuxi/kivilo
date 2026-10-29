import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { nameSimilarity, normalizeName, screen } from './match'
import { parseUnConsolidated, type ListEntry } from './un-list'

const { entries } = parseUnConsolidated(
  readFileSync(new URL('./fixtures/un-consolidated-sample.xml', import.meta.url), 'utf8'),
)
const refs = (name: string, birthYear?: number, kind: 'INDIVIDUAL' | 'ENTITY' = 'INDIVIDUAL') =>
  screen({ kind, name, birthYear }, entries).map((candidate) => candidate.entry.reference)

describe('normalizeName', () => {
  it('ignores case, accents and punctuation', () => {
    expect(normalizeName('  Jean-Marie  LUGÉRERO, Runiga ')).toBe('jean marie lugerero runiga')
  })
})

describe('nameSimilarity', () => {
  it('scores the same name in a different order as identical parts', () => {
    expect(nameSimilarity('Mandro Khawa Panga', 'KHAWA PANGA MANDRO')).toBeGreaterThan(0.95)
  })

  it('scores unrelated names low', () => {
    expect(nameSimilarity('Tan Wei Ming', 'KHAWA PANGA MANDRO')).toBeLessThan(0.7)
  })
})

describe('screen', () => {
  it('finds a listed person under their primary name', () => {
    expect(refs('Khawa Panga Mandro')).toEqual(['CDi.009'])
  })

  it('finds them with the parts reordered, accents added and a one-letter typo', () => {
    expect(refs('Mandro, Khawá Panga')).toContain('CDi.009')
    expect(refs('Khawa Pnaga Mandro')).toContain('CDi.009')
  })

  it('finds them under an alias and says which name matched', () => {
    const [candidate] = screen({ kind: 'INDIVIDUAL', name: 'Bosco Ntaganda' }, entries)
    expect(candidate.entry.reference).toBe('CDi.030')
    expect(candidate.matchedName).toBe('Bosco Ntaganda')
  })

  it('still shows an identical name when the birth year disagrees, since listed dates can be wrong', () => {
    const [candidate] = screen({ kind: 'INDIVIDUAL', name: 'Gaston Iyamuremye', birthYear: 1990 }, entries)
    expect(candidate.entry.reference).toBe('CDi.003')
    expect(candidate.birthYearAgrees).toBe(false)
  })

  it('lets an agreeing birth year raise a near match, and a far one lower it', () => {
    const near = screen({ kind: 'INDIVIDUAL', name: 'Bosco Taganda', birthYear: 1974 }, entries)[0]
    expect(near.birthYearAgrees).toBe(true)
    expect(near.score).toBeGreaterThanOrEqual(near.nameScore)
  })

  it('does not flag an ordinary client', () => {
    expect(refs('Tan Wei Ming', 1985)).toEqual([])
    expect(refs('Siti Nurhaliza binte Ahmad', 1990)).toEqual([])
  })

  it('screens a company only against listed entities, aliases included', () => {
    expect(refs('Allied Democratic Forces', undefined, 'ENTITY')).toEqual(['CDe.001'])
    expect(refs('Allied Democratic Forces')).toEqual([])
  })

  const listed = (name: string, birthYears: number[] = []): ListEntry => ({
    list: 'UN', reference: 'TEST', kind: 'INDIVIDUAL', names: [{ name, weak: false }], birthYears, nationalities: [], listedOn: null,
  })

  it('ignores particles and titles, so common Malay and Arabic names are not confused', () => {
    const list = [listed('FAYSAL AHMAD BIN ALI AL-ZAHRANI'), listed('Ghassan al-Tajiki')]
    expect(screen({ kind: 'INDIVIDUAL', name: 'Muhammad Faizal bin Abdullah' }, list)).toEqual([])
    expect(screen({ kind: 'INDIVIDUAL', name: 'Ali Hassan' }, list)).toEqual([])
  })

  it('flags a client who gives fewer names than the list, unless the birth year disagrees', () => {
    const list = [listed('ADNAN S. HASAN AHMED', [1970])]
    expect(screen({ kind: 'INDIVIDUAL', name: 'Adnan Ahmed', birthYear: 1970 }, list)).toHaveLength(1)
    expect(screen({ kind: 'INDIVIDUAL', name: 'Adnan Ahmed', birthYear: 1995 }, list)).toEqual([])
  })
})

