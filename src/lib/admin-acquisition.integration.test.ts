import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/lib/db'

const { authorize } = vi.hoisted(() => ({ authorize: vi.fn(async () => ({ id: 'admin' })) }))
vi.mock('@/lib/admin', () => ({ requireAdmin: authorize }))
import { adminAcquisition } from '@/lib/admin-acquisition'

const ids: string[] = []
const now = new Date('2050-06-30T12:00:00Z')
const recent = new Date('2050-06-10T12:00:00Z')
const milestone = new Date('2050-06-20T12:00:00Z')

describe('account acquisition cohort', () => {
  afterEach(() => { vi.unstubAllEnvs(); authorize.mockReset(); authorize.mockResolvedValue({ id: 'admin' }) })
  afterAll(async () => {
    await db.stakeholder.deleteMany({ where: { id: { in: ids } } })
    await db.$disconnect()
  })

  it('uses verified-account dates and keeps paid/report milestones independent, excluding QA accounts', async () => {
    const emails = Array.from({ length: 8 }, () => `${randomUUID()}@acquisition.example`)
    vi.stubEnv('ADMIN_EMAILS', emails[4].toUpperCase())
    vi.stubEnv('ACQUISITION_EXCLUDED_EMAILS', ` ${emails[5]} `)
    for (let i = 0; i < emails.length; i++) {
      const person = await db.stakeholder.create({ data: {
        name: 'Acquisition cohort fixture', email: emails[i],
        // A stakeholder may predate account creation by years.
        createdAt: new Date('2040-01-01T00:00:00Z'),
        acquisition: { create: {
          verifiedAt: i === 6 ? new Date('2050-05-01T00:00:00Z') : i === 7 ? new Date('2050-07-01T00:00:00Z') : recent,
          source: i === 2 ? 'unattributed' : 'google', medium: i === 2 ? null : 'organic',
          landing: i === 2 ? null : '/product', entryPoint: i === 2 ? 'NATIVE' : 'WEB',
          excluded: i === 3,
          firstCompletedReportAt: i === 0 ? milestone : null,
          firstPaidAt: i === 1 ? milestone : null,
          firstPaidInvoiceId: i === 1 ? `in_${randomUUID()}` : null,
          firstPaidAmount: i === 1 ? 3900 : null, firstPaidCurrency: i === 1 ? 'sgd' : null,
        } },
      } })
      ids.push(person.id)
    }
    const data = await adminAcquisition(now)
    expect(data).toMatchObject({ accounts: 3, completed: 1, paid: 1, excluded: 3 })
    expect(data.groups).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'google', accounts: 2, completed: 1, paid: 1 }),
      expect.objectContaining({ source: 'unattributed', accounts: 1, completed: 0, paid: 0, entryPoint: 'NATIVE' }),
    ]))
    expect(authorize).toHaveBeenCalledOnce()
  })

  it('refuses an unauthorized caller before reading cohort data', async () => {
    authorize.mockRejectedValueOnce(new Error('Not found'))
    await expect(adminAcquisition(now)).rejects.toThrow('Not found')
  })
})
