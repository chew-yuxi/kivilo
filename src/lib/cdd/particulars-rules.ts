import type { CddIdType } from '@/generated/prisma'
import { COUNTRIES } from '@/lib/countries'
import { idNumberProblem, normalizeIdNumber } from './id-number'

/// Every rule an individual's particulars must meet before they are stored and screened.
/// Pure, so the client's form and the agent's in-person form (ported to Dart in
/// `mobile/lib/models/cdd.dart`) run the same checks as the server, which stays the
/// authority. Anything that cannot be right is refused with what to fix, never stored.

export type ParticularsField = 'legalName' | 'dateOfBirth' | 'nationality' | 'address' | 'idNumber' | 'pepDetails'
export type ParticularsProblem = { field: ParticularsField; message: string }

export type IndividualParticulars = {
  legalName: string
  idType: CddIdType
  idNumber: string
  nationality: string
  dateOfBirth?: string | null
  address: string
  pepDeclared: boolean
  pepDetails?: string | null
}

const COUNTRY_NAMES = new Set<string>(COUNTRIES)
// Letters in any script, marks, spaces and the punctuation names carry: O'Brien, Siti
// binte Ali, Tan Ah Kow @ Tan Kow, s/o, d/o, Lim (Lin), Jean-Luc.
const NAME = /^[\p{L}\p{M}][\p{L}\p{M} .,'’@/()-]*$/u

/// The client's age in whole years on `today`, from an ISO date.
function ageOn(born: Date, today: Date) {
  const age = today.getUTCFullYear() - born.getUTCFullYear()
  const before = today.getUTCMonth() < born.getUTCMonth()
    || (today.getUTCMonth() === born.getUTCMonth() && today.getUTCDate() < born.getUTCDate())
  return before ? age - 1 : age
}

/// The first problem, field by field in the order the form asks, or null.
export function particularsProblem(input: IndividualParticulars, today = new Date()): ParticularsProblem | null {
  const name = input.legalName.trim()
  if (name.length < 2 || [...name.matchAll(/\p{L}/gu)].length < 2) {
    return { field: 'legalName', message: 'Enter the full name as it appears on the ID' }
  }
  if (!NAME.test(name) || name.length > 120) {
    return { field: 'legalName', message: 'The name can only have letters, spaces and . , \' - @ / ( )' }
  }

  const iso = input.dateOfBirth ?? ''
  const born = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00Z`) : null
  if (!born || Number.isNaN(born.getTime()) || born.toISOString().slice(0, 10) !== iso) {
    return { field: 'dateOfBirth', message: 'Enter the date of birth as it appears on the ID' }
  }
  const age = ageOn(born, today)
  if (born > today) return { field: 'dateOfBirth', message: 'The date of birth cannot be in the future' }
  if (age < 18) return { field: 'dateOfBirth', message: 'A party to a tenancy must be at least 18' }
  if (age > 120) return { field: 'dateOfBirth', message: 'Check the year of birth' }

  if (!COUNTRY_NAMES.has(input.nationality)) {
    return { field: 'nationality', message: 'Choose the nationality from the list' }
  }

  const address = input.address.trim()
  if (address.length < 10 || !/\p{L}/u.test(address) || !/\d/.test(address)) {
    return { field: 'address', message: 'Enter the full residential address, with the block or house number and postal code' }
  }

  const idProblem = idNumberProblem(input.idType, input.idNumber)
  if (idProblem) return { field: 'idNumber', message: idProblem }
  const id = normalizeIdNumber(input.idNumber)
  // S and T record the century of birth, for citizens and permanent residents alike.
  if (input.idType === 'NRIC') {
    const bornIn2000s = born.getUTCFullYear() >= 2000
    if (id[0] === 'S' && bornIn2000s) {
      return { field: 'idNumber', message: 'An NRIC starting with S is for someone born before 2000. Check the NRIC and date of birth against the card' }
    }
    if (id[0] === 'T' && !bornIn2000s) {
      return { field: 'idNumber', message: 'An NRIC starting with T is for someone born in 2000 or later. Check the NRIC and date of birth against the card' }
    }
  }
  if (input.idType === 'FIN' && input.nationality === 'Singapore') {
    return { field: 'idNumber', message: 'A FIN is issued to foreigners. A Singapore citizen uses their NRIC' }
  }

  if (input.pepDeclared && (input.pepDetails?.trim().length ?? 0) < 5) {
    return { field: 'pepDetails', message: 'Say which public position is held, and by whom' }
  }
  return null
}
