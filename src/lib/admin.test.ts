import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({ requireStakeholder: vi.fn() }))
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND') } }))

import { requireStakeholder } from '@/lib/auth'
import { isAdmin, requireAdmin } from '@/lib/admin'

afterEach(() => vi.unstubAllEnvs())

describe('admin boundary', () => {
  it('denies everybody without an explicit allowlist', () => {
    vi.stubEnv('ADMIN_EMAILS', '')
    expect(isAdmin('owner@example.com')).toBe(false)
    expect(isAdmin(null)).toBe(false)
  })

  it('matches only complete emails and refuses another signed-in account', async () => {
    vi.stubEnv('ADMIN_EMAILS', ' Owner@Example.com, second@example.com ')
    expect(isAdmin('owner@example.com')).toBe(true)
    expect(isAdmin('not-owner@example.com')).toBe(false)
    expect(isAdmin('owner@example.com.attacker.com')).toBe(false)
    vi.mocked(requireStakeholder).mockResolvedValue({ email: 'not-owner@example.com' } as never)
    await expect(requireAdmin()).rejects.toThrow('NOT_FOUND')
    vi.mocked(requireStakeholder).mockResolvedValue({ email: 'owner@example.com' } as never)
    await expect(requireAdmin()).resolves.toEqual({ email: 'owner@example.com' })
  })
})
