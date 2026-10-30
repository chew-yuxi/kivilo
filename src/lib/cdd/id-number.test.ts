import { describe, expect, it } from 'vitest'
import { idNumberProblem } from './id-number'

describe('idNumberProblem', () => {
  it('accepts valid NRIC and FIN numbers in every series', () => {
    for (const [type, id] of [
      ['NRIC', 'S1234567D'], ['NRIC', 'T1234567J'], ['NRIC', 't0712345g'], ['NRIC', 's 1234567-d'],
      ['FIN', 'F1234567N'], ['FIN', 'G1234567X'], ['FIN', 'M1234567K'],
    ] as const) expect(idNumberProblem(type, id), id).toBeNull()
  })

  it('refuses a wrong check letter, as a mistyped digit gives', () => {
    expect(idNumberProblem('NRIC', 'S1234567A')).toBe('This NRIC number is not valid. Check it against the card')
    expect(idNumberProblem('NRIC', 'S1234576D')).toBe('This NRIC number is not valid. Check it against the card')
    expect(idNumberProblem('FIN', 'M1234567X')).toBe('This FIN number is not valid. Check it against the card')
  })

  it('names the right ID type when the number belongs to the other one', () => {
    expect(idNumberProblem('NRIC', 'G1234567X')).toBe('This is a FIN number. Choose FIN as the ID type')
    expect(idNumberProblem('FIN', 'S1234567D')).toBe('This is an NRIC number. Choose NRIC as the ID type')
  })

  it('refuses the wrong shape', () => {
    expect(idNumberProblem('NRIC', 'S123456D')).toMatch(/^An NRIC is a letter, seven digits and a letter/)
    expect(idNumberProblem('PASSPORT', 'E12-34567X')).toBeNull()
    expect(idNumberProblem('PASSPORT', 'A1#')).toBe('Check the passport number: letters and digits only')
  })
})
