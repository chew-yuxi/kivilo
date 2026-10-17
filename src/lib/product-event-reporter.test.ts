import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let values: Map<string, string>
let storage: { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn> }
let fetcher: ReturnType<typeof vi.fn>

const key = (owner: string) => `kivilo:usage:${owner}`
const event = (screen = 'inspection') => ({
  id: randomUUID(), name: 'screen_viewed', properties: { screen },
  release: null, occurredAt: '2026-10-17T00:00:00.000Z',
})

beforeEach(() => {
  vi.resetModules()
  values = new Map()
  storage = {
    getItem: vi.fn((name: string) => values.get(name) ?? null),
    setItem: vi.fn((name: string, value: string) => { values.set(name, value) }),
  }
  fetcher = vi.fn().mockRejectedValue(new TypeError('Offline'))
  vi.stubGlobal('localStorage', storage)
  vi.stubGlobal('fetch', fetcher)
  vi.stubGlobal('crypto', { randomUUID })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('screen event delivery', () => {
  it('retains an offline event and replays its identity until the server confirms', async () => {
    const reporter = await import('./product-event-reporter')
    reporter.reportScreen('agent-a', 'capture')
    // reportScreen starts its first attempt immediately; the second is the retry.
    await Promise.resolve()
    const saved = JSON.parse(values.get(key('agent-a'))!)
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ name: 'screen_viewed', properties: { screen: 'capture' } })
    expect(fetcher).toHaveBeenCalledTimes(1)

    fetcher.mockResolvedValueOnce(new Response('{"recorded":0}', { status: 200 }))
    await reporter.flushProductEvents('agent-a')
    expect(fetcher.mock.calls[1][1].body).toBe(fetcher.mock.calls[0][1].body)
    expect(JSON.parse(values.get(key('agent-a'))!)).toEqual([])
  })

  it.each([401, 404, 503])('keeps a batch after HTTP %s rather than losing it', async (status) => {
    const queued = [event()]
    values.set(key('agent-a'), JSON.stringify(queued))
    fetcher.mockResolvedValueOnce(new Response('{}', { status }))
    const { flushProductEvents } = await import('./product-event-reporter')
    await flushProductEvents('agent-a')
    expect(JSON.parse(values.get(key('agent-a'))!)).toEqual(queued)
  })

  it('sends the queue owner as a precondition and keeps separate accounts independent', async () => {
    const first = [event('capture')]
    const second = [event('account')]
    values.set(key('agent-a'), JSON.stringify(first))
    values.set(key('agent-b'), JSON.stringify(second))
    fetcher.mockResolvedValueOnce(new Response('{}', { status: 404 }))
    fetcher.mockResolvedValueOnce(new Response('{"recorded":1}', { status: 200 }))
    const { flushProductEvents } = await import('./product-event-reporter')
    await flushProductEvents('agent-a')
    await flushProductEvents('agent-b')
    expect(fetcher.mock.calls[0][1].headers['x-kivilo-owner']).toBe('agent-a')
    expect(fetcher.mock.calls[1][1].headers['x-kivilo-owner']).toBe('agent-b')
    expect(JSON.parse(values.get(key('agent-a'))!)).toEqual(first)
    expect(JSON.parse(values.get(key('agent-b'))!)).toEqual([])
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).not.toHaveProperty('stakeholderId')
  })

  it('keeps an event added while a previous batch is being acknowledged', async () => {
    let acknowledge: (response: Response) => void = () => { throw new Error('No request') }
    const queued = event()
    const newer = event('room')
    values.set(key('agent-a'), JSON.stringify([queued]))
    fetcher.mockImplementationOnce(() => new Promise<Response>((resolve) => { acknowledge = resolve }))
    const { flushProductEvents } = await import('./product-event-reporter')
    const delivery = flushProductEvents('agent-a')
    values.set(key('agent-a'), JSON.stringify([queued, newer]))
    acknowledge(new Response('{"recorded":1}', { status: 200 }))
    await delivery
    expect(JSON.parse(values.get(key('agent-a'))!)).toEqual([newer])
  })

  it('discards a permanently invalid batch after a 400 response', async () => {
    values.set(key('agent-a'), JSON.stringify([event()]))
    fetcher.mockResolvedValueOnce(new Response('{}', { status: 400 }))
    const { flushProductEvents } = await import('./product-event-reporter')
    await flushProductEvents('agent-a')
    expect(JSON.parse(values.get(key('agent-a'))!)).toEqual([])
  })
})

describe('unavailable browser storage', () => {
  it('keeps a bounded in-memory queue when reads are denied and retries it later', async () => {
    storage.getItem.mockImplementation(() => { throw new DOMException('Denied', 'SecurityError') })
    const reporter = await import('./product-event-reporter')
    expect(() => {
      for (let index = 0; index < 25; index += 1) reporter.reportScreen('agent-a', 'room')
    }).not.toThrow()
    await Promise.resolve()
    fetcher.mockClear().mockResolvedValue(new Response('{"recorded":20}', { status: 200 }))
    await reporter.flushProductEvents('agent-a')
    expect(JSON.parse(fetcher.mock.calls[0][1].body).events).toHaveLength(20)
    await reporter.flushProductEvents('agent-a')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('retains the event when a storage write exceeds quota', async () => {
    storage.setItem.mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError') })
    const reporter = await import('./product-event-reporter')
    expect(() => reporter.reportScreen('agent-a', 'inspection')).not.toThrow()
    await Promise.resolve()
    fetcher.mockClear().mockResolvedValueOnce(new Response('{"recorded":1}', { status: 200 }))
    await reporter.flushProductEvents('agent-a')
    expect(JSON.parse(fetcher.mock.calls[0][1].body).events[0].properties.screen).toBe('inspection')
  })

  it.each(['{broken', '{"unexpected":"object"}'])('replaces corrupt storage with a usable memory queue: %s', async (corrupt) => {
    values.set(key('agent-a'), corrupt)
    const reporter = await import('./product-event-reporter')
    expect(() => reporter.reportScreen('agent-a', 'capture')).not.toThrow()
    await Promise.resolve()
    fetcher.mockClear().mockResolvedValueOnce(new Response('{"recorded":1}', { status: 200 }))
    await reporter.flushProductEvents('agent-a')
    expect(JSON.parse(fetcher.mock.calls[0][1].body).events).toMatchObject([{ properties: { screen: 'capture' } }])
  })
})
