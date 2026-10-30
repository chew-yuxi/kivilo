import { randomUUID } from 'node:crypto'
import { Environment } from '@apple/app-store-server-library'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { states, read, verify, notification } = vi.hoisted(() => {
  const states = new Map<string, unknown>()
  return {
    states,
    read: vi.fn(async (id: string) => structuredClone(states.get(id))),
    verify: vi.fn(async (id: string) => {
      const state = states.get(id) as { originalTransactionId: string; accountId: string }
      return { originalTransactionId: state.originalTransactionId, appAccountToken: state.accountId, environment: 'Sandbox' }
    }),
    notification: vi.fn(),
  }
})
vi.mock('@/lib/apple-store', () => ({ appleBillingOpen: () => true, readAppleSubscription: read, verifyAppleTransaction: verify, verifyAppleNotification: notification }))
vi.mock('@/lib/auth', async (actual) => ({ ...await actual<typeof import('@/lib/auth')>(), requireAgent: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers({ origin: 'https://my.kivilo.app' }) }))
vi.mock('@/lib/google-play', async (actual) => ({ ...await actual<typeof import('@/lib/google-play')>(), playBillingOpen: () => true }))

import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'
import { appleBillingStatus, prepareApplePurchase, reconcileApplePurchase, retireAppleBilling, verifyApplePurchase } from '@/lib/apple-billing'
import { preparePlayPurchase } from '@/lib/play-billing'
import { startCheckout } from '@/lib/billing-actions'
import { APPLE_PRODUCTS } from '@/lib/apple-catalog'
import { workspacePlan } from '@/lib/plan'
import { POST as webhook } from '@/app/api/apple/notifications/route'
import { AppleBillingError } from '@/lib/apple-billing-errors'
import type { Stakeholder } from '@/generated/prisma'

const people: string[] = []
const agencies: string[] = []
const accounts: string[] = []
const future = () => new Date(Date.now() + 30 * 86400000)
async function person() {
  const payer = await db.stakeholder.create({ data: { name: 'Apple payer', email: `apple-${randomUUID()}@example.test` } })
  people.push(payer.id)
  return payer
}
function as(payer: Stakeholder) { vi.mocked(requireAgent).mockResolvedValue(payer) }
async function team(payer: Stakeholder) {
  const row = await db.agency.create({ data: { name: 'Apple team', members: { create: { stakeholderId: payer.id, role: 'OWNER', status: 'ACTIVE' } } } })
  agencies.push(row.id)
  return row
}
async function purchase(payer: Stakeholder, agencyId: string | null = null, productId = 'kivilo_pro_monthly') {
  as(payer)
  const context = await prepareApplePurchase(productId, agencyId)
  accounts.push(context.appAccountToken)
  const id = randomUUID()
  const state = { originalTransactionId: id, transactionId: randomUUID(), accountId: context.appAccountToken,
    product: APPLE_PRODUCTS.find((product) => product.productId === productId)!, environment: Environment.SANDBOX,
    state: 'APPLE_ACTIVE', expiresAt: future(), autoRenewing: true }
  states.set(id, state)
  return { id, state }
}
function request() { return new Request('https://my.kivilo.app/api/apple/notifications', { method: 'POST', body: JSON.stringify({ signedPayload: 'signed' }) }) }

beforeEach(() => vi.clearAllMocks())
afterAll(async () => {
  await db.errorEvent.deleteMany({ where: { stakeholderId: { in: people } } })
  await db.subscription.deleteMany({ where: { OR: [{ stakeholderId: { in: people } }, { agencyId: { in: agencies } }] } })
  await db.applePurchase.deleteMany({ where: { accountId: { in: accounts } } })
  await db.appleBillingAccount.deleteMany({ where: { id: { in: accounts } } })
  await db.agency.deleteMany({ where: { id: { in: agencies } } })
  await db.stakeholder.deleteMany({ where: { id: { in: people } } })
  await db.$disconnect()
})

describe('Apple entitlement boundary', () => {
  it('grants and restores exactly one workspace subscription', async () => {
    const payer = await person()
    const { id } = await purchase(payer)
    await expect(verifyApplePurchase(id)).resolves.toEqual({ verified: true })
    await verifyApplePurchase(id)
    expect(await workspacePlan(payer, null)).toMatchObject({ plan: 'PRO', limit: 25 })
    expect(await db.subscription.count({ where: { stakeholderId: payer.id } })).toBe(1)
    expect(read).toHaveBeenCalledTimes(4)
  })
  it('refuses another Kivilo account without exposing its purchase', async () => {
    const payer = await person()
    const { id } = await purchase(payer)
    const other = await person()
    as(other)
    await expect(verifyApplePurchase(id)).rejects.toMatchObject({ code: 'purchase_not_found' })
    expect(read).not.toHaveBeenCalled()
    expect((await workspacePlan(other, null)).plan).toBe('FREE')
  })
  it('refreshes renewal, grace, retry, expiry and refund from current Apple state', async () => {
    const payer = await person()
    const { id, state } = await purchase(payer)
    for (const [status, plan] of [['APPLE_ACTIVE', 'PRO'], ['APPLE_GRACE_PERIOD', 'PRO'], ['APPLE_CANCELED', 'PRO'], ['APPLE_BILLING_RETRY', 'FREE'], ['APPLE_EXPIRED', 'FREE'], ['APPLE_REVOKED', 'FREE']]) {
      state.state = status
      await reconcileApplePurchase(id, Environment.SANDBOX)
      expect((await workspacePlan(payer, null)).plan).toBe(plan)
    }
    state.state = 'APPLE_ACTIVE'
    state.expiresAt = new Date(Date.now() - 1000)
    await reconcileApplePurchase(id, Environment.SANDBOX)
    expect((await workspacePlan(payer, null)).plan).toBe('FREE')
  })
  it('fulfills a signed notification before the phone completes verification', async () => {
    const payer = await person()
    const { id } = await purchase(payer)
    notification.mockResolvedValue({ data: { environment: Environment.SANDBOX, signedTransactionInfo: id } })
    expect((await webhook(request())).status).toBe(200)
    expect((await workspacePlan(payer, null)).plan).toBe('PRO')
    read.mockRejectedValueOnce(new AppleBillingError('billing_unavailable', 'Retry'))
    expect((await webhook(request())).status).toBe(503)
    notification.mockRejectedValueOnce(new AppleBillingError('invalid_purchase', 'Invalid'))
    expect((await webhook(request())).status).toBe(400)
  })
  it('binds team purchases to their team and updates seats within the same chain', async () => {
    const payer = await person()
    const agency = await team(payer)
    const { id, state } = await purchase(payer, agency.id, 'kivilo_pro_team_2_monthly')
    await verifyApplePurchase(id)
    expect(await workspacePlan(payer, agency.id)).toMatchObject({ plan: 'PRO', limit: 50 })
    expect((await workspacePlan(payer, null)).plan).toBe('FREE')
    state.product = APPLE_PRODUCTS.find((entry) => entry.productId === 'kivilo_pro_team_4_monthly')!
    await verifyApplePurchase(id)
    expect(await workspacePlan(payer, agency.id)).toMatchObject({ seats: 4, limit: 100 })
    const another = await team(payer)
    await expect(prepareApplePurchase('kivilo_pro_team_1_monthly', another.id)).rejects.toMatchObject({ code: 'billing_conflict' })
  })
  it('refuses a team charge if the payer loses management access during purchase', async () => {
    const payer = await person()
    const agency = await team(payer)
    const { id } = await purchase(payer, agency.id, 'kivilo_pro_team_1_monthly')
    await db.agencyMembership.updateMany({ where: { agencyId: agency.id, stakeholderId: payer.id }, data: { role: 'AGENT' } })
    await expect(verifyApplePurchase(id)).rejects.toMatchObject({ code: 'billing_conflict' })
    expect((await workspacePlan(payer, agency.id)).plan).toBe('FREE')
    expect(await db.errorEvent.count({ where: { stakeholderId: payer.id, context: 'apple_billing_conflict' } })).toBe(1)
  })
  it('records a permanent rejection if another provider wins a checkout race', async () => {
    const payer = await person()
    const { id } = await purchase(payer)
    await db.subscription.create({ data: { stakeholderId: payer.id, managedById: payer.id, plan: 'PRO', seats: 1, status: 'active', stripeSubscriptionId: `sub_${randomUUID()}` } })
    await expect(verifyApplePurchase(id)).rejects.toMatchObject({ code: 'billing_conflict' })
    await db.subscription.delete({ where: { stakeholderId: payer.id } })
    await expect(verifyApplePurchase(id)).rejects.toMatchObject({ code: 'billing_conflict' })
    expect((await workspacePlan(payer, null)).plan).toBe('FREE')
    expect(await db.errorEvent.count({ where: { stakeholderId: payer.id, context: 'apple_billing_conflict' } })).toBe(1)
  })
  it('blocks both Stripe and Google purchases while Apple can resume', async () => {
    const payer = await person()
    const { id, state } = await purchase(payer)
    for (const status of ['APPLE_ACTIVE', 'APPLE_CANCELED', 'APPLE_GRACE_PERIOD', 'APPLE_BILLING_RETRY']) {
      state.state = status
      await verifyApplePurchase(id)
      await expect(startCheckout()).rejects.toThrow('Manage your existing app store subscription')
      await expect(preparePlayPurchase('kivilo_pro', null)).rejects.toMatchObject({ code: 'billing_conflict' })
    }
  })
  it('never restores an erased payer and limits the retained team term to its expiry', async () => {
    const payer = await person()
    const agency = await team(payer)
    const { id } = await purchase(payer, agency.id, 'kivilo_pro_team_1_monthly')
    await verifyApplePurchase(id)
    expect(await appleBillingStatus(payer, agency.id)).toMatchObject({ provider: 'apple', currentProductId: 'kivilo_pro_team_1_monthly' })
    await retireAppleBilling(payer.id)
    await expect(verifyApplePurchase(id)).rejects.toMatchObject({ code: 'purchase_not_found' })
    expect(await reconcileApplePurchase(id, Environment.SANDBOX)).toBeNull()
    expect((await workspacePlan(payer, agency.id)).plan).toBe('PRO')
    await db.subscription.update({ where: { agencyId: agency.id }, data: { currentPeriodEnd: new Date(Date.now() - 1000) } })
    expect((await workspacePlan(payer, agency.id)).plan).toBe('FREE')
  })
})
