import { randomUUID } from 'node:crypto'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { purchases, client, notificationIdentity } = vi.hoisted(() => {
  const purchases = new Map<string, unknown>()
  return {
    purchases,
    notificationIdentity: vi.fn(async () => true),
    client: {
      getSubscription: vi.fn(async (token: string) => {
        const value = purchases.get(token)
        if (!value) throw new Error('Purchase unavailable')
        return structuredClone(value)
      }),
      acknowledgeSubscription: vi.fn(async () => {}),
      cancelSubscription: vi.fn(async () => {}),
      revokeSubscription: vi.fn(async () => {}),
    },
  }
})
vi.mock('@/lib/google-play', async (importActual) => ({
  ...await importActual<typeof import('@/lib/google-play')>(),
  googlePlay: () => client,
  playBillingOpen: () => true,
  verifyGooglePlayNotification: notificationIdentity,
}))
vi.mock('@/lib/auth', async (importActual) => ({
  ...await importActual<typeof import('@/lib/auth')>(), requireAgent: vi.fn(),
}))

import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'
import { playBillingStatus, preparePlayPurchase, reconcilePlayPurchase, retirePlayBilling, verifyPlayPurchase } from '@/lib/play-billing'
import { workspacePlan } from '@/lib/plan'
import { setTeam } from '../../scripts/set-team'
import { POST as rtdn } from '@/app/api/google-play/rtdn/route'
import type { GooglePlaySubscription } from '@/lib/google-play'
import type { Stakeholder } from '@/generated/prisma'

const tag = randomUUID()
const people: string[] = []
const agencies: string[] = []
const tokens: string[] = []
const future = () => new Date(Date.now() + 30 * 86400000).toISOString()
async function person(name = 'payer') {
  const created = await db.stakeholder.create({ data: { name, email: `play-${randomUUID()}@example.test` } })
  people.push(created.id)
  return created
}
function as(payer: Stakeholder) { vi.mocked(requireAgent).mockResolvedValue(payer) }
async function purchase(payer: Stakeholder, options: { state?: string; agencyId?: string; productId?: string; linkedPurchaseToken?: string } = {}) {
  as(payer)
  const productId = options.productId ?? 'kivilo_pro'
  const binding = await preparePlayPurchase(productId, options.agencyId ?? null)
  const token = `token-${tag}-${randomUUID()}`
  tokens.push(token)
  const value: GooglePlaySubscription = {
    subscriptionState: options.state ?? 'SUBSCRIPTION_STATE_ACTIVE',
    acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING',
    externalAccountIdentifiers: { obfuscatedExternalAccountId: binding.obfuscatedAccountId },
    lineItems: [{ productId, expiryTime: future(), offerDetails: { basePlanId: 'monthly' }, autoRenewingPlan: { autoRenewEnabled: true } }],
    ...(options.linkedPurchaseToken && { linkedPurchaseToken: options.linkedPurchaseToken }),
  }
  purchases.set(token, value)
  return { token, value, binding }
}
async function agency(owner: Stakeholder, members: Stakeholder[] = []) {
  const created = await db.agency.create({ data: { name: `Play team ${tag}`, members: { create: [
    { stakeholderId: owner.id, role: 'OWNER', status: 'ACTIVE' },
    ...members.map((member) => ({ stakeholderId: member.id, role: 'AGENT' as const, status: 'ACTIVE' as const })),
  ] } } })
  agencies.push(created.id)
  return created
}
function notification(token?: string, voided = false, packageName = 'one.kivilo.kivilo') {
  const payload = { packageName, ...(token ? voided
    ? { voidedPurchaseNotification: { purchaseToken: token, productType: 1 } }
    : { subscriptionNotification: { purchaseToken: token } } : { testNotification: {} }) }
  return new Request('https://my.kivilo.app/api/google-play/rtdn', { method: 'POST', body: JSON.stringify({ message: {
    data: Buffer.from(JSON.stringify(payload)).toString('base64'), messageId: randomUUID(),
  } }) })
}

beforeEach(() => { vi.clearAllMocks(); notificationIdentity.mockResolvedValue(true) })
afterAll(async () => {
  await db.subscription.deleteMany({ where: { OR: [{ stakeholderId: { in: people } }, { agencyId: { in: agencies } }] } })
  await db.googlePlayPurchase.deleteMany({ where: { purchaseToken: { in: tokens } } })
  await db.googlePlayBillingAccount.deleteMany({ where: { OR: [{ stakeholderId: { in: people } }, { workspaceKey: { in: people.map((id) => `stakeholder:${id}`) } }] } })
  await db.agency.deleteMany({ where: { id: { in: agencies } } })
  await db.stakeholder.deleteMany({ where: { id: { in: people } } })
  await db.$disconnect()
})

describe('Play entitlement verification', () => {
  it('commits one paid entitlement before acknowledgement and restores idempotently', async () => {
    const payer = await person()
    const { token } = await purchase(payer)
    client.acknowledgeSubscription.mockImplementationOnce(async () => {
      expect(await workspacePlan(payer, null)).toMatchObject({ plan: 'PRO', limit: 25 })
      expect(await db.googlePlayPurchase.count({ where: { purchaseToken: token } })).toBe(1)
    })
    expect(await verifyPlayPurchase(token)).toMatchObject({ provider: 'google_play', plan: 'PRO', acknowledged: true })
    expect(await verifyPlayPurchase(token)).toMatchObject({ plan: 'PRO' })
    expect(await db.subscription.count({ where: { stakeholderId: payer.id } })).toBe(1)
    expect(client.acknowledgeSubscription).toHaveBeenCalledTimes(1)
  })

  it('uses the durable purchase context for RTDN before the client submits its token', async () => {
    const payer = await person()
    const { token } = await purchase(payer)
    expect((await rtdn(notification(token))).status).toBe(200)
    expect(await workspacePlan(payer, null)).toMatchObject({ plan: 'PRO' })
    expect(client.acknowledgeSubscription).toHaveBeenCalledWith('kivilo_pro', token)
  })

  it('refuses a valid purchase from another signed-in account', async () => {
    const payer = await person()
    const { token } = await purchase(payer)
    const other = await person()
    as(other)
    await expect(verifyPlayPurchase(token)).rejects.toMatchObject({ code: 'purchase_not_found' })
    expect(await workspacePlan(other, null)).toMatchObject({ plan: 'FREE' })
    expect(client.acknowledgeSubscription).not.toHaveBeenCalled()
    expect(client.revokeSubscription).not.toHaveBeenCalled()
  })

  it('never acknowledges or grants a pending purchase and later completes it', async () => {
    const payer = await person()
    const { token, value } = await purchase(payer, { state: 'SUBSCRIPTION_STATE_PENDING' })
    delete value.lineItems![0].expiryTime
    expect(await verifyPlayPurchase(token)).toMatchObject({ plan: 'FREE', purchasePending: true, acknowledged: false })
    expect(client.acknowledgeSubscription).not.toHaveBeenCalled()
    value.subscriptionState = 'SUBSCRIPTION_STATE_ACTIVE'
    value.lineItems![0].expiryTime = future()
    expect(await verifyPlayPurchase(token)).toMatchObject({ plan: 'PRO', purchasePending: false, acknowledged: true })
  })

  it('uses fresh lifecycle state and enforces expiry locally without an RTDN', async () => {
    const payer = await person()
    const { token, value } = await purchase(payer)
    for (const [state, expected] of [
      ['SUBSCRIPTION_STATE_ACTIVE', 'PRO'], ['SUBSCRIPTION_STATE_IN_GRACE_PERIOD', 'PRO'],
      ['SUBSCRIPTION_STATE_ON_HOLD', 'FREE'], ['SUBSCRIPTION_STATE_PAUSED', 'FREE'],
      ['SUBSCRIPTION_STATE_CANCELED', 'PRO'], ['SUBSCRIPTION_STATE_EXPIRED', 'FREE'],
    ]) {
      value.subscriptionState = state
      await reconcilePlayPurchase(token)
      expect((await workspacePlan(payer, null)).plan).toBe(expected)
    }
    value.subscriptionState = 'SUBSCRIPTION_STATE_ACTIVE'
    await reconcilePlayPurchase(token)
    await db.subscription.update({ where: { stakeholderId: payer.id }, data: { currentPeriodEnd: new Date(Date.now() - 1) } })
    expect((await workspacePlan(payer, null)).plan).toBe('FREE')
  })

  it.each(['catalog', 'basePlan', 'multiple', 'binding', 'expiry'])('refuses invalid %s without acknowledgement', async (invalid) => {
    const payer = await person()
    const { token, value } = await purchase(payer)
    if (invalid === 'catalog') value.lineItems![0].productId = 'another_product'
    if (invalid === 'basePlan') value.lineItems![0].offerDetails!.basePlanId = 'annual'
    if (invalid === 'multiple') value.lineItems!.push(value.lineItems![0])
    if (invalid === 'binding') delete value.externalAccountIdentifiers
    if (invalid === 'expiry') value.lineItems![0].expiryTime = 'invalid'
    await expect(verifyPlayPurchase(token)).rejects.toMatchObject({ code: 'invalid_purchase' })
    expect(client.acknowledgeSubscription).not.toHaveBeenCalled()
    expect((await workspacePlan(payer, null)).plan).toBe('FREE')
  })

  it('retains conflict evidence without overwriting Stripe or granting a duplicate', async () => {
    const payer = await person()
    const { token } = await purchase(payer)
    await db.subscription.create({ data: { stakeholderId: payer.id, seats: 1, plan: 'PRO', status: 'active',
      stripeSubscriptionId: `sub-${randomUUID()}`, managedById: payer.id } })
    await expect(verifyPlayPurchase(token)).rejects.toMatchObject({ code: 'billing_conflict' })
    expect(await db.googlePlayPurchase.count({ where: { purchaseToken: token } })).toBe(1)
    expect((await db.subscription.findUniqueOrThrow({ where: { stakeholderId: payer.id } })).googlePlayPurchaseId).toBeNull()
    expect(client.acknowledgeSubscription).not.toHaveBeenCalled()
    expect(client.revokeSubscription).toHaveBeenCalledExactlyOnceWith(token)
    expect(await db.googlePlayPurchase.findUniqueOrThrow({ where: { purchaseToken: token } })).toMatchObject({ refundedAt: expect.any(Date), grantedAt: null })
    await expect(verifyPlayPurchase(token)).rejects.toMatchObject({ code: 'billing_conflict' })
    expect(client.revokeSubscription).toHaveBeenCalledTimes(1)
    expect((await rtdn(notification(token))).status).toBe(200)
    expect(client.revokeSubscription).toHaveBeenCalledTimes(1)
    await expect(preparePlayPurchase('kivilo_pro', null)).rejects.toMatchObject({ code: 'billing_conflict' })
  })

  it('retries a durable rejection refund without ever granting the rejected token', async () => {
    const payer = await person(); const { token } = await purchase(payer)
    await db.subscription.create({ data: { stakeholderId: payer.id, seats: 1, plan: 'PRO', status: 'comped', managedById: payer.id } })
    client.revokeSubscription.mockRejectedValueOnce(new Error(`Failed refund ${token}`))
    await expect(verifyPlayPurchase(token)).rejects.toMatchObject({ code: 'billing_unavailable' })
    expect(await db.googlePlayPurchase.findUniqueOrThrow({ where: { purchaseToken: token } })).toMatchObject({ rejectedAt: expect.any(Date), refundedAt: null, grantedAt: null })
    // Even if the conflicting entitlement goes away, this token must be refunded,
    // not reconsidered as a fresh paid purchase.
    await db.subscription.delete({ where: { stakeholderId: payer.id } })
    await expect(verifyPlayPurchase(token)).rejects.toMatchObject({ code: 'billing_conflict' })
    expect(client.revokeSubscription).toHaveBeenCalledTimes(2)
    expect((await workspacePlan(payer, null)).plan).toBe('FREE')
    expect(client.acknowledgeSubscription).not.toHaveBeenCalled()
  })

  it('never refunds an acknowledged purchase when another subscription owns the workspace', async () => {
    const payer = await person(); const { token, value } = await purchase(payer)
    value.acknowledgementState = 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'
    await db.subscription.create({ data: { stakeholderId: payer.id, seats: 1, plan: 'PRO', status: 'comped', managedById: payer.id } })
    await expect(verifyPlayPurchase(token)).rejects.toMatchObject({ code: 'billing_conflict' })
    expect(client.revokeSubscription).not.toHaveBeenCalled()
    expect(await db.googlePlayPurchase.findUniqueOrThrow({ where: { purchaseToken: token } })).toMatchObject({ rejectedAt: null, refundedAt: null })
  })

  it('keeps a held subscription with Google instead of offering a second purchase', async () => {
    const payer = await person()
    const { token, value } = await purchase(payer)
    await verifyPlayPurchase(token)
    value.subscriptionState = 'SUBSCRIPTION_STATE_ON_HOLD'
    await reconcilePlayPurchase(token)
    expect(await playBillingStatus(payer, null)).toMatchObject({ plan: 'FREE', provider: 'google_play', canPurchase: false })
    await expect(setTeam(payer.email!, 'another team')).rejects.toThrow('Google Play')
  })

  it('acknowledgement failure is retryable after the durable grant', async () => {
    const payer = await person()
    const { token } = await purchase(payer)
    client.acknowledgeSubscription.mockRejectedValueOnce(new Error(`secret ${token}`))
    await expect(verifyPlayPurchase(token)).rejects.toMatchObject({ code: 'billing_unavailable' })
    expect((await workspacePlan(payer, null)).plan).toBe('PRO')
    expect(await verifyPlayPurchase(token)).toMatchObject({ acknowledged: true })
  })

  it('serializes stale reads behind the fresh state under the workspace lock', async () => {
    const payer = await person(); const { token, value } = await purchase(payer)
    await verifyPlayPurchase(token)
    let release!: () => void
    let started!: () => void
    const began = new Promise<void>((resolve) => { started = resolve })
    const continueRead = new Promise<void>((resolve) => { release = resolve })
    client.getSubscription.mockImplementationOnce(async () => {
      const stale = structuredClone(value)
      started()
      await continueRead
      return stale
    })
    const earlier = reconcilePlayPurchase(token)
    await began
    value.subscriptionState = 'SUBSCRIPTION_STATE_EXPIRED'
    await reconcilePlayPurchase(token)
    release()
    await earlier
    expect((await workspacePlan(payer, null)).plan).toBe('FREE')
  })

  it('keeps deletion retryable and prevents renewal racing a failed cancellation', async () => {
    const payer = await person(); const { token } = await purchase(payer)
    await verifyPlayPurchase(token)
    client.cancelSubscription.mockRejectedValueOnce(new Error('Cancellation temporarily unavailable'))
    await expect(retirePlayBilling(payer.id)).rejects.toThrow('temporarily unavailable')
    expect(await reconcilePlayPurchase(token)).toBeNull()
    expect(await db.googlePlayBillingAccount.count({ where: { stakeholderId: payer.id, retirementStartedAt: { not: null } } })).toBe(1)
    await retirePlayBilling(payer.id)
    expect(client.cancelSubscription).toHaveBeenCalledTimes(2)
    expect((await workspacePlan(payer, null)).plan).toBe('FREE')
  })

  it('retires renewal and makes an erased payer binding non-transferable', async () => {
    const payer = await person()
    const { token } = await purchase(payer)
    await verifyPlayPurchase(token)
    await retirePlayBilling(payer.id)
    expect(client.cancelSubscription).toHaveBeenCalledWith(token)
    expect(await reconcilePlayPurchase(token)).toBeNull()
    await expect(verifyPlayPurchase(token)).rejects.toMatchObject({ code: 'purchase_not_found' })
    expect((await workspacePlan(payer, null)).plan).toBe('FREE')
  })
})

describe('Play team bindings and replacements', () => {
  it('charges the selected agency pool only, with verified seats and manager controls', async () => {
    const owner = await person('owner'); const member = await person('member')
    const group = await agency(owner, [member])
    as(member)
    await expect(preparePlayPurchase('kivilo_pro_team_2', group.id)).rejects.toMatchObject({ code: 'billing_conflict' })
    as(owner)
    await expect(preparePlayPurchase('kivilo_pro_team_1', group.id)).rejects.toMatchObject({ code: 'billing_conflict' })
    const { token } = await purchase(owner, { agencyId: group.id, productId: 'kivilo_pro_team_2' })
    expect(await verifyPlayPurchase(token)).toMatchObject({ plan: 'PRO', seats: 2, limit: 50 })
    expect(await workspacePlan(member, group.id)).toMatchObject({ plan: 'PRO', limit: 50 })
    expect(await workspacePlan(owner, null)).toMatchObject({ plan: 'FREE' })
    expect(await playBillingStatus(member, group.id)).toMatchObject({ canPurchase: false, replacementTokenHash: null })
  })

  it('replaces one team token and cannot restore the retired predecessor over it', async () => {
    const owner = await person(); const group = await agency(owner)
    const first = await purchase(owner, { agencyId: group.id, productId: 'kivilo_pro_team_1' })
    await verifyPlayPurchase(first.token)
    const second = await purchase(owner, { agencyId: group.id, productId: 'kivilo_pro_team_2', linkedPurchaseToken: first.token })
    expect(second.binding).toMatchObject({ replacementMode: 'withTimeProration' })
    expect(await verifyPlayPurchase(second.token)).toMatchObject({ seats: 2 })
    await reconcilePlayPurchase(first.token)
    expect(await workspacePlan(owner, group.id)).toMatchObject({ seats: 2 })
    expect((await db.googlePlayPurchase.findUniqueOrThrow({ where: { purchaseToken: first.token } })).replacedById).toBeTruthy()
  })

  it('rechecks replacement authority even for a valid linked purchase', async () => {
    const owner = await person(); const group = await agency(owner)
    const first = await purchase(owner, { agencyId: group.id, productId: 'kivilo_pro_team_1' })
    await verifyPlayPurchase(first.token)
    const replacement = await purchase(owner, { agencyId: group.id, productId: 'kivilo_pro_team_2', linkedPurchaseToken: first.token })
    await db.agencyMembership.update({ where: { agencyId_stakeholderId: { agencyId: group.id, stakeholderId: owner.id } }, data: { role: 'AGENT' } })
    await expect(verifyPlayPurchase(replacement.token)).rejects.toMatchObject({ code: 'billing_conflict' })
    await expect(verifyPlayPurchase(replacement.token)).rejects.toMatchObject({ code: 'billing_conflict' })
    // An already-purchased renewal remains valid despite the later role change.
    await reconcilePlayPurchase(first.token)
    expect(await workspacePlan(owner, group.id)).toMatchObject({ plan: 'PRO', seats: 1 })
  })

  it('refuses a seat downgrade after new members join between purchase context and payment', async () => {
    const owner = await person(); const member = await person(); const group = await agency(owner)
    const first = await purchase(owner, { agencyId: group.id, productId: 'kivilo_pro_team_2' })
    await verifyPlayPurchase(first.token)
    const replacement = await purchase(owner, { agencyId: group.id, productId: 'kivilo_pro_team_1', linkedPurchaseToken: first.token })
    await db.agencyMembership.create({ data: { agencyId: group.id, stakeholderId: member.id, status: 'ACTIVE', role: 'AGENT' } })
    await expect(verifyPlayPurchase(replacement.token)).rejects.toMatchObject({ code: 'billing_conflict' })
    expect(await workspacePlan(owner, group.id)).toMatchObject({ seats: 2 })
  })

  it('refuses a linked token from another workspace even when the payer is the same', async () => {
    const owner = await person(); const group = await agency(owner)
    const own = await purchase(owner)
    await verifyPlayPurchase(own.token)
    const teamPurchase = await purchase(owner, { agencyId: group.id, productId: 'kivilo_pro_team_1', linkedPurchaseToken: own.token })
    await expect(verifyPlayPurchase(teamPurchase.token)).rejects.toMatchObject({ code: 'purchase_not_found' })
    expect(await workspacePlan(owner, group.id)).toMatchObject({ plan: 'FREE' })
  })
})

describe('authenticated Google Play RTDN', () => {
  it('rejects identity before reading or trusting its payload', async () => {
    notificationIdentity.mockResolvedValue(false)
    const request = notification('untrusted-token')
    expect((await rtdn(request)).status).toBe(401)
    expect(request.bodyUsed).toBe(false)
    expect(client.getSubscription).not.toHaveBeenCalled()
  })
  it('ignores another package and accepts test notifications without changing plans', async () => {
    expect((await rtdn(notification('other-token', false, 'another.package'))).status).toBe(200)
    expect((await rtdn(notification())).status).toBe(200)
    expect(client.getSubscription).not.toHaveBeenCalled()
  })
  it('uses a fresh subscription read for voided notifications and retries API failures', async () => {
    const payer = await person(); const { token, value } = await purchase(payer)
    await verifyPlayPurchase(token)
    value.subscriptionState = 'SUBSCRIPTION_STATE_EXPIRED'
    expect((await rtdn(notification(token, true))).status).toBe(200)
    expect((await workspacePlan(payer, null)).plan).toBe('FREE')
    client.getSubscription.mockRejectedValueOnce(new Error(`URL with ${token}`))
    const failure = await rtdn(notification(token))
    expect(failure.status).toBe(503)
    expect(await failure.text()).not.toContain(token)
  })
})
