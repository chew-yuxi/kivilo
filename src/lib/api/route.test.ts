import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({
  currentStakeholder: vi.fn().mockResolvedValue({ id: 'synthetic-agent' }),
}))

const { recordServerError, afterResponse } = vi.hoisted(() => ({
  recordServerError: vi.fn(async () => {}),
  afterResponse: [] as (() => unknown)[],
}))
vi.mock('@/lib/errors', () => ({ recordServerError }))
vi.mock('next/server', () => ({ after: (task: () => unknown) => afterResponse.push(task) }))

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

  it('answers an unexpected failure with the JSON 500 and records it after the response', async () => {
    const failure = new TypeError('cannot read properties of undefined')
    const route = authed(async () => { throw failure })
    const response = await route(new Request('https://kivilo.example/api/v1/synthetic?x=1', {
      headers: { 'user-agent': 'Kivilo test' },
    }), { params: Promise.resolve({}) })

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'server_error' })
    expect(recordServerError).not.toHaveBeenCalled()

    await afterResponse.pop()!()
    expect(recordServerError).toHaveBeenCalledExactlyOnceWith(failure, {
      context: 'api',
      path: '/api/v1/synthetic',
      userAgent: 'Kivilo test',
      stakeholderId: 'synthetic-agent',
    })
  })
})
