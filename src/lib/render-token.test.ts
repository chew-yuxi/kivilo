import { beforeAll, describe, expect, it } from 'vitest'
import { mintRenderToken, readRenderToken } from '@/lib/render-token'

beforeAll(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
})

describe('report render token', () => {
  it('names the inspection it was minted for, for two minutes only', () => {
    const now = Date.parse('2026-10-13T10:00:00Z')
    const token = mintRenderToken('inspection-1', now)
    expect(readRenderToken(token, now)).toBe('inspection-1')
    expect(readRenderToken(token, now + 119_000)).toBe('inspection-1')
    expect(readRenderToken(token, now + 120_000)).toBeNull()
  })

  it('refuses forged, altered and ordinary share tokens', () => {
    const now = Date.now()
    const token = mintRenderToken('inspection-1', now)
    const [, id, expires, signature] = token.split('.')
    expect(readRenderToken(`render.inspection-2.${expires}.${signature}`, now)).toBeNull()
    expect(readRenderToken(`render.${id}.${Number(expires) + 60_000}.${signature}`, now)).toBeNull()
    expect(readRenderToken(`render.${id}.${expires}.${signature.slice(1)}x`, now)).toBeNull()
    expect(readRenderToken('Zm9vYmFyYmF6cXV4cXV1eHF1dXhxdXV4cXV1eHF1dXg', now)).toBeNull()
  })
})
