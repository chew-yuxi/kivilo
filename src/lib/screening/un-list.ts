import { XMLParser } from 'fast-xml-parser'

/// The UN Security Council Consolidated List, as published at
/// https://scsanctions.un.org/resources/xml/en/consolidated.xml. CEA requires every client
/// and beneficial owner to be screened against it before a deal (plans/compliance-pack.md).
export const UN_CONSOLIDATED_URL = 'https://scsanctions.un.org/resources/xml/en/consolidated.xml'

export type ListedName = { name: string; weak: boolean }

export type ListEntry = {
  list: 'UN'
  reference: string
  kind: 'INDIVIDUAL' | 'ENTITY'
  names: ListedName[]
  /// Every year the person may have been born in. Exact dates, approximate years and
  /// ranges are all reduced to years, because that is what a client's date of birth is
  /// compared against.
  birthYears: number[]
  nationalities: string[]
  listedOn: string | null
}

export type ParsedList = { generatedAt: string | null; entries: ListEntry[] }

const REPEATED = new Set([
  'INDIVIDUAL', 'ENTITY', 'INDIVIDUAL_ALIAS', 'ENTITY_ALIAS', 'INDIVIDUAL_DATE_OF_BIRTH', 'VALUE',
])

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseTagValue: false,
  trimValues: true,
  isArray: (name) => REPEATED.has(name),
})

type Node = Record<string, unknown>
const text = (node: Node, key: string) => {
  const value = node[key]
  return typeof value === 'string' && value !== '' ? value : null
}
const nodes = (value: unknown): Node[] => (Array.isArray(value) ? (value as Node[]) : [])

function birthYears(dates: Node[]): number[] {
  const years = new Set<number>()
  for (const date of dates) {
    const exact = text(date, 'DATE')
    const year = text(date, 'YEAR')
    const from = text(date, 'FROM_YEAR')
    const to = text(date, 'TO_YEAR')
    if (exact) years.add(Number(exact.slice(0, 4)))
    if (year) years.add(Number(year))
    if (from && to) for (let y = Number(from); y <= Number(to); y++) years.add(y)
  }
  return [...years].filter(Number.isFinite).sort()
}

function entry(node: Node, kind: ListEntry['kind']): ListEntry {
  const primary = ['FIRST_NAME', 'SECOND_NAME', 'THIRD_NAME', 'FOURTH_NAME']
    .map((key) => text(node, key))
    .filter(Boolean)
    .join(' ')
  const aliases = nodes(node[kind === 'INDIVIDUAL' ? 'INDIVIDUAL_ALIAS' : 'ENTITY_ALIAS'])
    .map((alias) => ({ name: text(alias, 'ALIAS_NAME'), weak: text(alias, 'QUALITY') === 'Low' }))
    .filter((alias): alias is ListedName => alias.name !== null)
  const nationality = node.NATIONALITY as Node | undefined
  return {
    list: 'UN',
    reference: text(node, 'REFERENCE_NUMBER') ?? text(node, 'DATAID') ?? '',
    kind,
    names: [{ name: primary, weak: false }, ...aliases],
    birthYears: kind === 'INDIVIDUAL' ? birthYears(nodes(node.INDIVIDUAL_DATE_OF_BIRTH)) : [],
    nationalities: nationality ? nodes(nationality.VALUE).map(String) : [],
    listedOn: text(node, 'LISTED_ON'),
  }
}

export function parseUnConsolidated(xml: string): ParsedList {
  const root = (parser.parse(xml) as Node).CONSOLIDATED_LIST as Node | undefined
  if (!root) throw new Error('Not a UN consolidated list')
  const individuals = nodes((root.INDIVIDUALS as Node | undefined)?.INDIVIDUAL)
  const entities = nodes((root.ENTITIES as Node | undefined)?.ENTITY)
  return {
    generatedAt: text(root, 'dateGenerated'),
    entries: [
      ...individuals.map((node) => entry(node, 'INDIVIDUAL')),
      ...entities.map((node) => entry(node, 'ENTITY')),
    ],
  }
}
