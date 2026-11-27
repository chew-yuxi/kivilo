import { afterEach, expect, it, vi } from 'vitest'
import { GET as home } from '@/app/api/v1/home/route'
import { GET as overview } from '@/app/api/v1/properties/[id]/overview/route'
import { POST as createCheckIn } from '@/app/api/v1/inspections/route'
import { GET as verification } from '@/app/api/v1/tenancies/[id]/verification/route'
import { createInspection } from '@/lib/actions'
import { deliverableNotificationKinds } from './availability'
import { requestParticulars, sendDueReminders, startDeal, verifyTenancyParties } from './cases'

vi.mock('@/lib/auth', () => ({ currentStakeholder: async () => ({ id: 'agent' }) }))
vi.mock('@/lib/home-tasks', () => ({ homeTasks: async () => ({ tasks: [] }) }))
vi.mock('@/lib/property-work', () => ({ propertyOverview: async () => ({ country: 'SG', terms: [{ tenancyId: 't', monthlyRent: '1000' }] }) }))
vi.mock('@/lib/actions', () => ({ createInspection: vi.fn(async () => 'check-in') }))
vi.mock('@/lib/db', () => ({ db: {} })) // The paused paths must not look up a client or enqueue anything.
afterEach(() => vi.unstubAllEnvs())

it('accepts a check-in from an installed app that still asks to verify both parties', async () => {
  vi.stubEnv('KIVILO_CLIENT_CHECKS_ENABLED', undefined)
  const request = new Request('https://example.test/api/v1/inspections', {
    method: 'POST', body: JSON.stringify({
      propertyId: 'property', sameLandlord: true, tenantName: 'Tenant',
      startDate: '2026-11-01', endDate: '2027-11-01', monthlyRent: '1000', deposit: '1000', verifyParties: true,
    }),
  })
  const response = await createCheckIn(request, { params: Promise.resolve({}) })
  expect(await response.json()).toEqual({ id: 'check-in' })
  expect(createInspection).toHaveBeenCalledOnce()
  const prompt = await verification(new Request('https://example.test/'), { params: Promise.resolve({ id: 'tenancy' }) })
  expect(await prompt.json()).toEqual({ enabled: false })
})

it('pauses direct starts, requests, reminders and outbound client-check messages', async () => {
  vi.stubEnv('KIVILO_CLIENT_CHECKS_ENABLED', undefined)
  await expect(startDeal('agent', { clientRole: 'TENANT', clientName: 'Tenant' })).rejects.toThrow('paused')
  await expect(verifyTenancyParties('agent', 'tenancy')).rejects.toThrow('paused')
  await expect(requestParticulars('case', 'agent')).rejects.toThrow('paused')
  expect(await sendDueReminders()).toEqual([])
  expect(deliverableNotificationKinds()).toEqual({ kind: { not: 'CDD_REQUEST' } })
})

it('hides the Home card and property prompts and keeps the ordinary tenancy visible', async () => {
  vi.stubEnv('KIVILO_CLIENT_CHECKS_ENABLED', undefined)
  const request = new Request('https://example.test/')
  const tasks = await home(request, { params: Promise.resolve({}) })
  expect(await tasks.json()).toEqual({ tasks: [], dueDiligence: false })
  const details = await overview(request, { params: Promise.resolve({ id: 'property' }) })
  expect(await details.json()).toEqual({ country: 'SG', terms: [{ tenancyId: 't', monthlyRent: '1000', verification: null }] })
})
