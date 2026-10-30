import { createHash } from 'node:crypto'
import { Environment } from '@apple/app-store-server-library'
import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'
import { APPLE_PRODUCTS } from '@/lib/apple-catalog'
import { AppleBillingError } from '@/lib/apple-billing-errors'
import { appleBillingOpen, readAppleSubscription, verifyAppleTransaction } from '@/lib/apple-store'
import { resolveBillingWorkspace, subscriptionCanResume, subscriptionIsLive, workspacePlan } from '@/lib/plan'
import type { Stakeholder } from '@/generated/prisma'

type Agent = Pick<Stakeholder, 'id' | 'teamId'>
export const appleAgencyContext = (value?: string | null) => value === 'personal' ? null : value

export async function appleBillingStatus(agent: Agent, agencyId?: string | null) {
  const workspace = await workspacePlan(agent, agencyId)
  const subscription = workspace.subscription
  const current = subscription?.applePurchaseId
    ? await db.applePurchase.findUniqueOrThrow({ where: { id: subscription.applePurchaseId } }) : null
  const provider = current ? 'apple' : subscription?.googlePlayPurchaseId ? 'google_play'
    : subscription?.stripeSubscriptionId ? 'stripe' : subscription?.status === 'comped' ? 'comped' : null
  const kind = workspace.workspace.kind === 'stakeholder' ? 'personal' : 'team'
  const products = APPLE_PRODUCTS.filter((product) => product.kind === kind && product.seats >= workspace.seatsNeeded)
  const blockedProvider = !!subscription && (provider === 'stripe' || provider === 'google_play') && subscriptionCanResume(subscription)
  return {
    plan: workspace.plan, seats: workspace.seats, activeProperties: workspace.active, limit: workspace.limit,
    products, provider, currentProductId: current?.productId ?? null, seatsNeeded: workspace.seatsNeeded,
    canManageBilling: workspace.isManager,
    canPurchase: appleBillingOpen() && workspace.isManager && !blockedProvider && products.length > 0,
    managedByName: subscription?.managedBy?.name ?? null, subscriptionStatus: subscription?.status ?? null,
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null, cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
  }
}

export async function prepareApplePurchase(productId: string, agencyId?: string | null) {
  const agent = await requireAgent()
  if (!appleBillingOpen()) throw new AppleBillingError('billing_unavailable', 'App Store billing is not available yet.')
  const product = APPLE_PRODUCTS.find((entry) => entry.productId === productId)
  if (!product) throw new AppleBillingError('invalid_purchase', 'Choose an available Kivilo plan.')
  const initial = await resolveBillingWorkspace(agent, agencyId)
  return db.$transaction(async (tx) => {
    if (initial.kind === 'agency') await tx.$queryRaw`SELECT "id" FROM "Agency" WHERE "id" = ${initial.id} FOR SHARE`
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${initial.lockKey}, 0))`
    const context = await resolveBillingWorkspace(agent, agencyId, tx)
    const current = await tx.subscription.findUnique({ where: context.where, include: { applePurchase: true } })
    if (!context.canManage || (current?.managedById && current.managedById !== agent.id)) {
      throw new AppleBillingError('billing_conflict', 'Only the member who manages this plan can change its subscription.')
    }
    if (product.kind !== (context.kind === 'stakeholder' ? 'personal' : 'team') || product.seats < context.seatsNeeded) {
      throw new AppleBillingError('billing_conflict', 'Choose enough seats for the current team members.')
    }
    if (current && (current.stripeSubscriptionId || current.googlePlayPurchaseId) && subscriptionCanResume(current)) {
      throw new AppleBillingError('billing_conflict', 'This workspace already has a subscription. Manage that plan before buying another.')
    }
    // An Apple account can hold one subscription per group. Bind the group to its
    // original workspace; even another Kivilo login cannot transfer a paid receipt.
    const other = await tx.applePurchase.findFirst({ where: {
      account: { stakeholderId: agent.id, workspaceKey: { not: context.workspaceKey } },
      productId: { in: APPLE_PRODUCTS.filter((entry) => entry.kind === product.kind).map((entry) => entry.productId) },
      state: { in: ['APPLE_ACTIVE', 'APPLE_CANCELED', 'APPLE_GRACE_PERIOD', 'APPLE_BILLING_RETRY'] },
      OR: [{ expiresAt: { gt: new Date() } }, { autoRenewing: true }],
    } })
    if (other) throw new AppleBillingError('billing_conflict', 'Your App Store team subscription belongs to another workspace. Manage its existing plan first.')
    const binding = await tx.appleBillingAccount.upsert({
      where: { workspaceKey_stakeholderId: { workspaceKey: context.workspaceKey, stakeholderId: agent.id } },
      create: { workspaceKey: context.workspaceKey, stakeholderId: agent.id }, update: {},
    })
    if (binding.retirementStartedAt) throw new AppleBillingError('billing_conflict', 'This account is being deleted.')
    return { appAccountToken: binding.id, originalTransactionId: current?.applePurchase?.originalTransactionId ?? null }
  })
}

export async function reconcileApplePurchase(originalTransactionId: string, environment: Environment, expectedOwnerId?: string) {
  const initial = await readAppleSubscription(originalTransactionId, environment)
  const binding = await db.appleBillingAccount.findUnique({ where: { id: initial.accountId } })
  if (!binding?.stakeholderId || binding.retirementStartedAt || (expectedOwnerId && binding.stakeholderId !== expectedOwnerId)) {
    if (expectedOwnerId) throw new AppleBillingError('purchase_not_found', 'Purchase not found for this account.')
    return null
  }
  const [kind, id, extra] = binding.workspaceKey.split(':')
  if (!id || extra || !['agency', 'team', 'stakeholder'].includes(kind)) throw new Error('Invalid stored Apple billing workspace')
  const where = kind === 'agency' ? { agencyId: id } : kind === 'team' ? { teamId: id } : { stakeholderId: id }
  const result = await db.$transaction(async (tx) => {
    if (kind === 'agency') await tx.$queryRaw`SELECT "id" FROM "Agency" WHERE "id" = ${id} FOR SHARE`
    const lock = `billing:${binding.workspaceKey}`
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lock}, 0))`
    const account = await tx.appleBillingAccount.findUniqueOrThrow({ where: { id: binding.id } })
    if (!account.stakeholderId || account.retirementStartedAt || account.stakeholderId !== binding.stakeholderId) return null
    const state = await readAppleSubscription(originalTransactionId, environment)
    if (state.accountId !== account.id || state.product.kind !== (kind === 'stakeholder' ? 'personal' : 'team')) {
      throw new AppleBillingError('purchase_not_found', 'Purchase not found for this account.')
    }
    const existing = await tx.applePurchase.findUnique({ where: { originalTransactionId } })
    if (existing && (existing.accountId !== account.id || existing.environment !== environment)) {
      throw new AppleBillingError('purchase_not_found', 'Purchase not found for this account.')
    }
    const purchaseData = { transactionId: state.transactionId, productId: state.product.productId,
      environment, state: state.state, expiresAt: state.expiresAt, autoRenewing: state.autoRenewing }
    const row = await tx.applePurchase.upsert({
      where: { originalTransactionId }, create: { originalTransactionId, accountId: account.id, ...purchaseData }, update: purchaseData,
    })
    const current = await tx.subscription.findUnique({ where })
    const candidate = { applePurchaseId: row.id, googlePlayPurchaseId: null, status: state.state, currentPeriodEnd: state.expiresAt }
    if (row.rejectedAt) return { conflict: true }
    const reject = async () => {
      await tx.applePurchase.update({ where: { id: row.id }, data: { rejectedAt: new Date() } })
      const fingerprint = createHash('sha256').update(`apple-purchase-conflict:${row.id}`).digest('hex')
      await tx.errorEvent.createMany({ data: [{
        id: `apple_conflict_${fingerprint}`, source: 'SERVER', context: 'apple_billing_conflict',
        name: 'AppleBillingConflict', message: 'An App Store purchase could not be assigned. Review the rejected ApplePurchase row and help the payer request an Apple refund.',
        path: '/api/apple/notifications', stakeholderId: account.stakeholderId, fingerprint, occurredAt: new Date(),
      }], skipDuplicates: true })
      return { conflict: true }
    }
    if (current?.applePurchaseId !== row.id) {
      if (!subscriptionIsLive(candidate) && !subscriptionCanResume(candidate)) return { verified: true }
      if (current && (current.stripeSubscriptionId || current.googlePlayPurchaseId || current.applePurchaseId) && subscriptionCanResume(current)) return reject()
      const payer = await tx.stakeholder.findUniqueOrThrow({ where: { id: account.stakeholderId } })
      let authorized
      try { authorized = await resolveBillingWorkspace(payer, kind === 'agency' ? id : null, tx) }
      catch (error) {
        if (error instanceof Error && error.message === 'Team not found') return reject()
        throw error
      }
      if (!authorized.canManage || authorized.workspaceKey !== account.workspaceKey || state.product.seats < authorized.seatsNeeded ||
          (current?.managedById && current.managedById !== payer.id)) return reject()
    }
    // Renewal/downgrade of an existing chain remains assigned even if team membership
    // changed. workspacePlan enforces too few seats without discarding paid access.
    const data = { plan: 'PRO' as const, seats: state.product.seats, status: state.state,
      currentPeriodEnd: state.expiresAt, cancelAtPeriodEnd: !state.autoRenewing,
      applePurchaseId: row.id, googlePlayPurchaseId: null, stripeSubscriptionId: null, stripeCustomerId: null }
    await tx.subscription.upsert({ where, create: { ...where, ...data, managedById: account.stakeholderId },
      update: { ...data, ...(current?.applePurchaseId !== row.id ? { managedById: account.stakeholderId } : {}) } })
    if (!row.grantedAt && subscriptionIsLive(candidate)) await tx.applePurchase.update({ where: { id: row.id }, data: { grantedAt: new Date() } })
    return { verified: true }
  }, { timeout: 30_000, maxWait: 10_000 })
  if (result && 'conflict' in result && expectedOwnerId) {
    throw new AppleBillingError('billing_conflict', 'This purchase could not be assigned to the workspace. Contact support for help requesting an Apple refund. Your existing plan is unchanged.')
  }
  return result
}

export async function verifyApplePurchase(signedTransaction: string) {
  const agent = await requireAgent()
  const transaction = await verifyAppleTransaction(signedTransaction)
  if (!transaction.originalTransactionId || !transaction.appAccountToken) throw new AppleBillingError('invalid_purchase', 'This purchase is missing its Kivilo account binding.')
  // Check ownership before the status API round trip, and again under the lock.
  const binding = await db.appleBillingAccount.findUnique({ where: { id: transaction.appAccountToken.toLowerCase() } })
  if (binding?.stakeholderId !== agent.id || binding.retirementStartedAt) throw new AppleBillingError('purchase_not_found', 'Purchase not found for this account.')
  const result = await reconcileApplePurchase(transaction.originalTransactionId, transaction.environment as Environment, agent.id)
  if (!result) throw new AppleBillingError('purchase_not_found', 'Purchase not found for this account.')
  return { verified: true }
}

export async function retireAppleBilling(stakeholderId: string) {
  const accounts = await db.appleBillingAccount.findMany({ where: { stakeholderId } })
  for (const account of accounts) {
    await db.$transaction(async (tx) => {
      const [kind, id] = account.workspaceKey.split(':')
      if (kind === 'agency') await tx.$queryRaw`SELECT "id" FROM "Agency" WHERE "id" = ${id} FOR SHARE`
      const lock = `billing:${account.workspaceKey}`
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lock}, 0))`
      await tx.appleBillingAccount.update({ where: { id: account.id }, data: { stakeholderId: null, retirementStartedAt: new Date() } })
      // Preserve the already-paid term for other team members, without granting
      // later renewals from an erased payer or blocking a new payer indefinitely.
      await tx.subscription.updateMany({ where: { applePurchase: { accountId: account.id },
        status: { in: ['APPLE_ACTIVE', 'APPLE_CANCELED', 'APPLE_GRACE_PERIOD'] }, currentPeriodEnd: { gt: new Date() },
      }, data: {
        status: 'APPLE_RETIRED', cancelAtPeriodEnd: true,
      } })
      await tx.subscription.updateMany({ where: { applePurchase: { accountId: account.id },
        status: { not: 'APPLE_RETIRED' },
      }, data: { status: 'APPLE_EXPIRED', cancelAtPeriodEnd: true } })
    })
  }
}
