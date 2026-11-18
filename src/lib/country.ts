import type { Country, PropertyType } from '@/generated/prisma'

/// The one place that knows a country (plans/malaysia.md). A property's country is chosen
/// when it is made and never changes, and everything below follows from it, so a
/// property's reports, repairs, deposit statement and documents cannot disagree.
const COUNTRY = {
  SG: {
    name: 'Singapore',
    /// Both are UTC+8, so deadlines are computed the same way; only the label differs.
    zone: 'SGT',
    currency: 'SGD',
    /// Written straight before a bare amount, in the short sentences that always have.
    symbol: 'S$',
    money: new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }),
    /// What the report header calls the agent's registration number.
    registration: 'CEA registration',
    propertyTypes: ['HDB', 'PRIVATE_NON_LANDED', 'LANDED', 'COMMERCIAL'],
    /// Singapore postal codes have never been checked here, and still are not.
    postcode: null,
    /// Client checks are CEA customer due diligence, which is Singapore law.
    dueDiligence: true,
  },
  MY: {
    name: 'Malaysia',
    zone: 'MYT',
    currency: 'MYR',
    symbol: 'RM',
    money: new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }),
    registration: 'REN registration',
    propertyTypes: ['PRIVATE_NON_LANDED', 'LANDED', 'COMMERCIAL'],
    postcode: /^\d{5}$/,
    dueDiligence: false,
  },
} as const satisfies Record<Country, {
  name: string
  zone: string
  currency: string
  symbol: string
  money: Intl.NumberFormat
  registration: string
  propertyTypes: readonly PropertyType[]
  postcode: RegExp | null
  dueDiligence: boolean
}>

export const COUNTRIES = Object.keys(COUNTRY) as Country[]

export function countryName(country: Country) {
  return COUNTRY[country].name
}

export function zoneLabel(country: Country) {
  return COUNTRY[country].zone
}

/// The ISO 4217 code every API response carrying money sends beside it.
export function currency(country: Country) {
  return COUNTRY[country].currency
}

/// "S$150" or "RM150", for a sentence such as a repair cost agreement.
export function shortMoney(value: { toString(): string }, country: Country) {
  return `${COUNTRY[country].symbol}${value}`
}

/// "$1,200.00" in Singapore, as reports have always printed it; "RM 1,200.00" in Malaysia.
export function money(amount: number | string, country: Country) {
  return COUNTRY[country].money.format(Number(amount))
}

export function registrationLabel(country: Country) {
  return COUNTRY[country].registration
}

export function allowsPropertyType(country: Country, type: PropertyType) {
  return (COUNTRY[country].propertyTypes as readonly PropertyType[]).includes(type)
}

export function validPostcode(country: Country, postcode: string) {
  return COUNTRY[country].postcode?.test(postcode) ?? true
}

export function dueDiligenceApplies(country: Country) {
  return COUNTRY[country].dueDiligence
}
