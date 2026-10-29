import { randomBytes } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { decryptIdNumber, encryptIdNumber, maskIdNumber } from './crypto'

const key = () => randomBytes(32).toString('base64')
const original = process.env.CDD_ID_KEYS
afterEach(() => {
  process.env.CDD_ID_KEYS = original
})

describe('identity number encryption', () => {
  it('round-trips a normalised number and keeps only the last four in clear', () => {
    process.env.CDD_ID_KEYS = `v1:${key()}`
    const { encrypted, last4 } = encryptIdNumber(' s1234567a ')
    expect(encrypted).not.toContain('1234567')
    expect(last4).toBe('567A')
    expect(decryptIdNumber(encrypted)).toBe('S1234567A')
    expect(maskIdNumber(last4)).toBe('*****567A')
  })

  it('never produces the same ciphertext twice', () => {
    process.env.CDD_ID_KEYS = `v1:${key()}`
    expect(encryptIdNumber('S1234567A').encrypted).not.toBe(encryptIdNumber('S1234567A').encrypted)
  })

  it('refuses tampered ciphertext', () => {
    process.env.CDD_ID_KEYS = `v1:${key()}`
    const parts = encryptIdNumber('S1234567A').encrypted.split('.')
    parts[3] = Buffer.from('S7654321Z').toString('base64url')
    expect(() => decryptIdNumber(parts.join('.'))).toThrow()
  })

  it('decrypts with an older key after rotation and encrypts with the newest', () => {
    const old = key()
    process.env.CDD_ID_KEYS = `v1:${old}`
    const before = encryptIdNumber('S1234567A').encrypted
    process.env.CDD_ID_KEYS = `v1:${old},v2:${key()}`
    expect(decryptIdNumber(before)).toBe('S1234567A')
    expect(encryptIdNumber('S1234567A').encrypted.startsWith('v2.')).toBe(true)
  })

  it('fails loudly without keys, or once the key that sealed a number is gone', () => {
    process.env.CDD_ID_KEYS = `v1:${key()}`
    const sealed = encryptIdNumber('S1234567A').encrypted
    process.env.CDD_ID_KEYS = `v2:${key()}`
    expect(() => decryptIdNumber(sealed)).toThrow('cannot be decrypted')
    delete process.env.CDD_ID_KEYS
    expect(() => encryptIdNumber('S1234567A')).toThrow('CDD_ID_KEYS must be set')
  })
})
