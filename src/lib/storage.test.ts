import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { sign } = vi.hoisted(() => ({ sign: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ storage: { from: () => ({ createSignedUrls: sign }) } }),
}))

import { createDownloadUrls } from '@/lib/storage'

beforeEach(() => {
  sign.mockReset()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://storage.test')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key')
})
afterEach(() => vi.unstubAllEnvs())

describe('batch capture URLs', () => {
  it('signs unique originals and posters once, matching replies by path rather than order', async () => {
    sign.mockResolvedValue({ data: [
      { path: 'room/photo.poster.webp', signedUrl: 'https://storage.test/poster', error: null },
      { path: 'room/photo.jpg', signedUrl: 'https://storage.test/original', error: null },
    ], error: null })

    const urls = await createDownloadUrls(['room/photo.jpg', 'room/photo.poster.webp', 'room/photo.jpg'], 600)
    expect(sign).toHaveBeenCalledExactlyOnceWith(['room/photo.jpg', 'room/photo.poster.webp'], 600)
    expect(urls.get('room/photo.jpg')).toBe('https://storage.test/original')
    expect(urls.get('room/photo.poster.webp')).toBe('https://storage.test/poster')
  })

  it('makes no storage request for an empty room', async () => {
    expect(await createDownloadUrls([])).toEqual(new Map())
    expect(sign).not.toHaveBeenCalled()
  })

  it('fails when storage refuses the batch', async () => {
    const error = new Error('Storage unavailable')
    sign.mockResolvedValue({ data: null, error })
    await expect(createDownloadUrls(['photo.jpg'])).rejects.toBe(error)
  })

  it.each([
    [],
    [{ path: 'photo.jpg', signedUrl: '', error: 'Object not found' }],
    [{ path: 'photo.jpg', signedUrl: '', error: null }],
  ])('refuses a partial or failed batch response %#', async (...data) => {
    sign.mockResolvedValue({ data, error: null })
    await expect(createDownloadUrls(['photo.jpg'])).rejects.toThrow('Could not sign capture')
  })
})
