import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/// Identity numbers collected for CEA due diligence are encrypted in the application, so a
/// database copy alone never reveals them (plans/compliance-pack.md). Keys live in the
/// environment, apart from the database, as `CDD_ID_KEYS="v1:<base64 32 bytes>,v2:..."`.
/// The last key encrypts; every listed key can still decrypt, which is how a key rotates:
/// append the new one, then re-encrypt old rows at leisure and drop the old key.
type Key = { version: string; secret: Buffer }

function keys(): Key[] {
  const raw = process.env.CDD_ID_KEYS
  if (!raw) throw new Error('CDD_ID_KEYS must be set to store identity numbers')
  return raw.split(',').map((pair) => {
    const [version, encoded] = pair.trim().split(':')
    const secret = Buffer.from(encoded ?? '', 'base64')
    if (!version || secret.length !== 32) throw new Error(`CDD_ID_KEYS entry "${version}" is not a 32-byte key`)
    return { version, secret }
  })
}

/// As printed on the document: upper case, no spaces or dashes.
export function normalizeIdNumber(idNumber: string) {
  return idNumber.toUpperCase().replace(/[\s-]/g, '')
}

export function encryptIdNumber(idNumber: string) {
  const plain = normalizeIdNumber(idNumber)
  if (plain.length < 4) throw new Error('Identity number is too short')
  const { version, secret } = keys().at(-1)!
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', secret, iv)
  const sealed = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const encrypted = [version, iv, cipher.getAuthTag(), sealed]
    .map((part) => (typeof part === 'string' ? part : part.toString('base64url')))
    .join('.')
  return { encrypted, last4: plain.slice(-4) }
}

export function decryptIdNumber(encrypted: string) {
  const [version, iv, tag, sealed] = encrypted.split('.')
  const key = keys().find((candidate) => candidate.version === version)
  if (!key || !iv || !tag || !sealed) throw new Error('Identity number cannot be decrypted with the configured keys')
  const decipher = createDecipheriv('aes-256-gcm', key.secret, Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(sealed, 'base64url')), decipher.final()]).toString('utf8')
}

/// The only form an identity number is ever shown in.
export function maskIdNumber(last4: string) {
  return `*****${last4}`
}
