import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { screen } from './match'
import { parseTsfaFirstSchedule } from './sg-tsfa'

const schedule = parseTsfaFirstSchedule(
  readFileSync(new URL('./fixtures/sg-tsfa-first-schedule.html', import.meta.url), 'utf8'),
)
const byRef = (letter: string) =>
  schedule.entries.find((entry) => entry.reference === `TSFA First Schedule 2(${letter})`)

describe('parseTsfaFirstSchedule', () => {
  it('reads every designation in force and skips deleted paragraphs', () => {
    expect(schedule.entries).toHaveLength(33)
    expect(byRef('e')).toBeUndefined()
    expect(byRef('zs')).toBeUndefined()
  })

  it('dates the version by the latest amendment in force', () => {
    expect(schedule.generatedAt).toBe('2026-08-26')
  })

  it('reads name, nationality and birth year', () => {
    expect(byRef('zzb')).toMatchObject({
      list: 'SG',
      kind: 'INDIVIDUAL',
      names: [{ name: 'Tan Jun Jie', weak: false }],
      nationalities: ['Singapore'],
      birthYears: [2007],
    })
    expect(byRef('zz')).toMatchObject({ nationalities: ['Malaysia'], birthYears: [1990] })
  })

  it('splits "@" aliases and keeps both birth years when documents disagree', () => {
    expect(byRef('zn')).toMatchObject({
      names: [
        { name: 'Anindia Afiyantari', weak: false },
        { name: 'Anin Dia Afiyan Tari', weak: false },
      ],
      birthYears: [1986, 1987],
    })
  })

  it('lets the matcher find a designated person, particles and all', () => {
    const [candidate] = screen(
      { kind: 'INDIVIDUAL', name: 'Mohamad Latiff Rahim', birthYear: 1983 },
      schedule.entries,
    )
    expect(candidate.entry.reference).toBe('TSFA First Schedule 2(zw)')
  })

  it('refuses a page without the schedule', () => {
    expect(() => parseTsfaFirstSchedule('<html>Access denied</html>')).toThrow('not found')
  })
})
