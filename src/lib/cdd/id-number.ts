import type { CddIdType } from '@/generated/prisma'
import { normalizeIdNumber } from './crypto'

/// Singapore NRIC and FIN numbers end in a check letter computed from the rest, so a
/// mistyped number is caught here rather than recorded and screened as if it were right.
/// S and T are NRICs (born before and from 2000); F, G and M are FINs (M from 2022).
const WEIGHTS = [2, 7, 6, 5, 4, 3, 2]
const OFFSET: Record<string, number> = { S: 0, T: 4, F: 0, G: 4, M: 3 }
const LETTERS: Record<string, string> = {
  S: 'JZIHGFEDCBA', T: 'JZIHGFEDCBA', F: 'XWUTRQPNMLK', G: 'XWUTRQPNMLK', M: 'XWUTRQPNJLK',
}

function checkLetter(prefix: string, digits: string) {
  const sum = [...digits].reduce((total, digit, i) => total + Number(digit) * WEIGHTS[i], OFFSET[prefix])
  return LETTERS[prefix][sum % 11]
}

/// Why this ID number cannot be right for its type, or null when it can be.
export function idNumberProblem(idType: CddIdType, idNumber: string): string | null {
  const id = normalizeIdNumber(idNumber)
  if (idType === 'PASSPORT') {
    return /^[A-Z0-9]{5,20}$/.test(id) ? null : 'Check the passport number: letters and digits only'
  }
  // Companies come later (plans/compliance-pack.md); a UEN has its own rules.
  if (idType === 'COMPANY_REGISTRATION') return null
  const parts = /^([STFGM])(\d{7})([A-Z])$/.exec(id)
  if (!parts) return `An ${idType} is a letter, seven digits and a letter, like ${idType === 'NRIC' ? 'S1234567D' : 'G1234567X'}`
  const [, prefix, digits, letter] = parts
  const nric = prefix === 'S' || prefix === 'T'
  if (idType === 'NRIC' && !nric) return 'This is a FIN number. Choose FIN as the ID type'
  if (idType === 'FIN' && nric) return 'This is an NRIC number. Choose NRIC as the ID type'
  if (checkLetter(prefix, digits) !== letter) return `This ${idType} number is not valid. Check it against the card`
  return null
}
