import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { COMMON_COUNTRIES, COUNTRIES } from './countries'

// The app offers the same nationalities the server accepts; a country in one list and
// not the other would be refused after the agent picked it.
describe('the app’s country list', () => {
  const dart = readFileSync(new URL('../../mobile/lib/models/countries.dart', import.meta.url), 'utf8')
  const list = (name: string) => {
    const block = dart.slice(dart.indexOf(`const ${name} = [`), dart.indexOf('];', dart.indexOf(`const ${name} = [`)))
    return [...block.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((match) => match[1].replace(/\\'/g, "'"))
  }

  it('matches the server’s exactly', () => {
    expect(list('commonCountries')).toEqual([...COMMON_COUNTRIES])
    expect(list('countries')).toEqual([...COUNTRIES])
  })

  it('offers only countries the server knows', () => {
    for (const country of COMMON_COUNTRIES) expect(COUNTRIES).toContain(country)
  })
})
