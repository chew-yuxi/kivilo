import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({
  currentStakeholder: vi.fn().mockResolvedValue({ id: 'synthetic-agent' }),
}))

import { authed } from './route'

describe('API error mapping', () => {
  it.each([
    'This model models/gemini-2.5-pro is no longer available to new users',
    'The model was not found',
  ])('reports withdrawn AI models as a service failure: %s', async (message) => {
    const route = authed(async () => { throw new Error(message) })
    const response = await route(new Request('https://kivilo.example/api/v1/synthetic'), {
      params: Promise.resolve({}),
    })

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'ai_unavailable' })
  })

  it('keeps an inaccessible inspection indistinguishable from a missing one', async () => {
    const route = authed(async () => { throw new Error('Inspection not found') })
    const response = await route(new Request('https://kivilo.example/api/v1/synthetic'), {
      params: Promise.resolve({}),
    })

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'not_found' })
  })
})
