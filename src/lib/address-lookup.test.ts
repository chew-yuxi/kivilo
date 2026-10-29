import { afterEach, describe, expect, it, vi } from 'vitest'

/// The OneMap login stays on the server, the three-day token is reused until it is near
/// expiry, and only real addresses with their own postal code come back.

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)
process.env.ONEMAP_EMAIL = 'kivilo@example.test'
process.env.ONEMAP_PASSWORD = 'secret'

const { searchAddresses } = await import('@/lib/address-lookup')

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })
const login = () => json({ access_token: 'token-1', expiry_timestamp: String(Math.floor(Date.now() / 1000) + 3 * 86400) })
const results = (rows: object[]) => json({ found: rows.length, totalNumPages: 1, pageNum: 1, results: rows })
const row = (blk: string, road: string, building: string, postal: string) =>
  ({ SEARCHVAL: '', BLK_NO: blk, ROAD_NAME: road, BUILDING: building, ADDRESS: '', POSTAL: postal })

afterEach(() => fetchMock.mockReset())

describe('address lookup', () => {
  it('logs in once, then searches with the token and returns clean addresses', async () => {
    fetchMock.mockResolvedValueOnce(login()).mockResolvedValueOnce(results([
      row('23', 'MARINA WAY', 'MARINA ONE RESIDENCES', '018979'),
      row('23', 'MARINA WAY', 'MARINA ONE RESIDENCES', '018979'),
      row('231', 'BISHAN STREET 23', 'NIL', '570231'),
      row('231', 'BISHAN STREET 23', 'PCF SPARKLETOTS PRESCHOOL', 'NIL'),
    ])).mockResolvedValueOnce(results([]))

    expect(await searchAddresses('agent-1', ' marina ')).toEqual([
      { line1: '23 Marina Way', postalCode: '018979', building: 'Marina One Residences' },
      { line1: '231 Bishan Street 23', postalCode: '570231', building: null },
    ])
    await searchAddresses('agent-1', '570231')

    const [loginUrl, loginInit] = fetchMock.mock.calls[0]
    expect(String(loginUrl)).toBe('https://www.onemap.gov.sg/api/auth/post/getToken')
    expect(JSON.parse(loginInit.body)).toEqual({ email: 'kivilo@example.test', password: 'secret' })
    // The second search reuses the token rather than logging in again.
    expect(fetchMock).toHaveBeenCalledTimes(3)
    const [searchUrl, searchInit] = fetchMock.mock.calls[2]
    expect(new URL(String(searchUrl)).searchParams.get('searchVal')).toBe('570231')
    expect(searchInit.headers).toEqual({ Authorization: 'token-1' })
  })

  it('refuses a query too short to mean anything, without calling OneMap', async () => {
    await expect(searchAddresses('agent-2', ' a ')).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('limits one account to a typing pace', async () => {
    fetchMock.mockImplementation(async () => results([]))
    for (let i = 0; i < 60; i++) await searchAddresses('agent-3', `query ${i}`)
    await expect(searchAddresses('agent-3', 'one more')).rejects.toThrow('Too many address lookups')
    await expect(searchAddresses('agent-4', 'someone else')).resolves.toEqual([])
  })
})
