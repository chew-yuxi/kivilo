import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseUnConsolidated } from './un-list'

const sample = readFileSync(new URL('./fixtures/un-consolidated-sample.xml', import.meta.url), 'utf8')

describe('parseUnConsolidated', () => {
  const list = parseUnConsolidated(sample)
  const byRef = (reference: string) => list.entries.find((entry) => entry.reference === reference)!

  it('reads individuals and entities with the date the UN generated the list', () => {
    expect(list.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(list.entries.filter((entry) => entry.kind === 'INDIVIDUAL')).toHaveLength(4)
    expect(list.entries.filter((entry) => entry.kind === 'ENTITY')).toHaveLength(1)
  })

  it('joins the name parts and keeps every alias, marking low-quality ones weak', () => {
    const gaston = byRef('CDi.003')
    expect(gaston.names[0]).toEqual({ name: 'GASTON IYAMUREMYE', weak: false })
    expect(gaston.names).toContainEqual({ name: 'Rumuli', weak: true })
    expect(gaston.names).toContainEqual({ name: 'Victor Rumuri', weak: false })
    expect(gaston.nationalities).toEqual(['Rwanda'])
  })

  it('reduces every shape of date of birth to years, keeping every listed date', () => {
    expect(byRef('CDi.009').birthYears).toEqual([1973])
    expect(byRef('CDi.003').birthYears).toEqual([1948])
    expect(byRef('CDi.028').birthYears).toEqual([1960, 1966])
    expect(byRef('CDi.030').birthYears).toEqual([1973, 1974])
  })

  it('keeps an entity’s accented and punctuated aliases as written', () => {
    const adf = byRef('CDe.001')
    expect(adf.birthYears).toEqual([])
    expect(adf.names.map((name) => name.name)).toContain('ADF/NALU')
    expect(adf.names.some((name) => name.name.startsWith('Forces Démocratiques'))).toBe(true)
  })

  it('refuses something that is not the consolidated list', () => {
    expect(() => parseUnConsolidated('<html></html>')).toThrow('Not a UN consolidated list')
  })
})
