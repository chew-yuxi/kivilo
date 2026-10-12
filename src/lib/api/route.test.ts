import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({
  currentStakeholder: vi.fn().mockResolvedValue({ id: 'synthetic-agent' }),
}))

import { authed } from './route'

describe('API error mapping', () => {
  it('keeps an inaccessible inspection indistinguishable from a missing one', async () => {
    const route = authed(async () => { throw new Error('Inspection not found') })
    const response = await route(new Request('https://kivilo.example/api/v1/synthetic'), {
      params: Promise.resolve({}),
    })

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'not_found' })
  })
})
