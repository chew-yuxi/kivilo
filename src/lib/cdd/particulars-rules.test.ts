import { describe, expect, it } from 'vitest'
import { particularsProblem, type IndividualParticulars } from './particulars-rules'

const today = new Date('2026-10-31T00:00:00Z')
const good: IndividualParticulars = {
  legalName: 'Tan Wei Ling', idType: 'NRIC', idNumber: 'S1234567D', nationality: 'Singapore',
  dateOfBirth: '1985-04-12', address: 'Blk 231 Bishan Street 23, #10-120, Singapore 570231', pepDeclared: false,
}
const check = (change: Partial<IndividualParticulars>) => particularsProblem({ ...good, ...change }, today)

describe('particularsProblem', () => {
  it('accepts real particulars, including names with the punctuation they carry', () => {
    expect(check({})).toBeNull()
    for (const legalName of ['Siti Nurhaliza binte Ahmad', 'Rajesh s/o Kumar', 'Tan Ah Kow @ Tan Kow', "Mary-Anne O'Brien", '陈伟玲', 'Lim (Lin) Mei Hua']) {
      expect(check({ legalName }), legalName).toBeNull()
    }
    expect(check({ idType: 'NRIC', idNumber: 'T0712345G', dateOfBirth: '2007-03-19' })).toBeNull()
    expect(check({ idType: 'FIN', idNumber: 'G1234567X', nationality: 'Malaysia' })).toBeNull()
    expect(check({ idType: 'PASSPORT', idNumber: 'E1234567X', nationality: 'India', address: '12 MG Road, Bengaluru 560001' })).toBeNull()
  })

  it('refuses a name that cannot be one', () => {
    for (const legalName of ['', 'T', 'Tan 123', 'Tan Wei Ling 🙂', '- -']) {
      expect(check({ legalName })?.field, legalName).toBe('legalName')
    }
  })

  it('refuses a date of birth that is malformed, in the future, under 18 or implausible', () => {
    expect(check({ dateOfBirth: '1985-02-30' })).toEqual({ field: 'dateOfBirth', message: 'Enter the date of birth as it appears on the ID' })
    expect(check({ dateOfBirth: null })?.field).toBe('dateOfBirth')
    expect(check({ dateOfBirth: '2027-01-01' })?.message).toBe('The date of birth cannot be in the future')
    expect(check({ dateOfBirth: '2008-11-01', idNumber: 'T0812345J' })?.message).toBe('A party to a tenancy must be at least 18')
    expect(check({ dateOfBirth: '2008-10-31', idNumber: 'T0812345J' })).toBeNull()
    expect(check({ dateOfBirth: '1890-01-01' })?.message).toBe('Check the year of birth')
  })

  it('takes the nationality only from the list', () => {
    for (const nationality of ['Singaporean', 'sg', 'singapore', '']) {
      expect(check({ nationality }), nationality).toEqual({ field: 'nationality', message: 'Choose the nationality from the list' })
    }
  })

  it('refuses an address too short or without a number to be a full one', () => {
    for (const address of ['x', 'Bishan', 'Somewhere in Bishan']) expect(check({ address })?.field, address).toBe('address')
  })

  it('refuses an NRIC whose century does not match the date of birth', () => {
    expect(check({ idNumber: 'S1234567D', dateOfBirth: '2003-05-01' })?.message).toMatch(/^An NRIC starting with S is for someone born before 2000/)
    expect(check({ idNumber: 'T0712345G', dateOfBirth: '1999-12-31' })?.message).toMatch(/^An NRIC starting with T is for someone born in 2000 or later/)
  })

  it('refuses a FIN for a Singapore citizen, and a wrong check letter', () => {
    expect(check({ idType: 'FIN', idNumber: 'G1234567X' })?.message).toBe('A FIN is issued to foreigners. A Singapore citizen uses their NRIC')
    expect(check({ idNumber: 'S1234567A' })).toEqual({ field: 'idNumber', message: 'This NRIC number is not valid. Check it against the card' })
  })

  it('needs the public position described when one is declared', () => {
    expect(check({ pepDeclared: true, pepDetails: ' ' })?.field).toBe('pepDetails')
    expect(check({ pepDeclared: true, pepDetails: 'My uncle is a Member of Parliament' })).toBeNull()
  })
})
