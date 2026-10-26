import { createHash } from 'node:crypto'
import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'
import { resolveBillingWorkspace, subscriptionCanResume, subscriptionIsLive, workspacePlan } from '@/lib/plan'
import { googlePlay, GooglePlayApiError, playBillingOpen, GOOGLE_PLAY_PRODUCTS, GOOGLE_PLAY_BASE_PLAN_ID, type GooglePlaySubscription } from '@/lib/google-play'
import { PlayBillingError } from '@/lib/play-billing-errors'
import type { Stakeholder } from '@/generated/prisma'

type Agent = Pick<Stakeholder, 'id' | 'teamId'>
const states = [
  'SUBSCRIPTION_STATE_PENDING', 'SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_PAUSED',
  'SUBSCRIPTION_STATE_IN_GRACE_PERIOD', 'SUBSCRIPTION_STATE_ON_HOLD',
  'SUBSCRIPTION_STATE_CANCELED', 'SUBSCRIPTION_STATE_EXPIRED', 'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED',
]
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
export const playAgencyContext = (value?: string | null) => value === 'personal' ? null : value

function validated(resource: GooglePlaySubscription) {
  const [line] = resource.lineItems ?? []
  const product = GOOGLE_PLAY_PRODUCTS.find((candidate) => candidate.productId === line?.productId)
  const expiry = line?.expiryTime ? new Date(line.expiryTime) : null
  if (!product || resource.lineItems?.length !== 1 || line.offerDetails?.basePlanId !== GOOGLE_PLAY_BASE_PLAN_ID ||
      !line.autoRenewingPlan || typeof line.autoRenewingPlan.autoRenewEnabled !== 'boolean' ||
      line.autoRenewingPlan.installmentDetails || line.prepaidPlan ||
      !['ACKNOWLEDGEMENT_STATE_PENDING', 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'].includes(resource.acknowledgementState ?? '') || !states.includes(resource.subscriptionState ?? '') ||
      (expiry && !Number.isFinite(expiry.getTime())) ||
      (!expiry && !['SUBSCRIPTION_STATE_PENDING', 'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED'].includes(resource.subscriptionState!)) ||
      !resource.externalAccountIdentifiers?.obfuscatedExternalAccountId) {
    throw new PlayBillingError('invalid_purchase', 'This is not a supported Kivilo subscription.')
  }
  return {
    product,
    accountId: resource.externalAccountIdentifiers.obfuscatedExternalAccountId,
    state: resource.subscriptionState!,
    expiresAt: expiry,
    autoRenewing: line.autoRenewingPlan.autoRenewEnabled === true,
    acknowledged: resource.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
    testPurchase: resource.testPurchase !== undefined,
  }
}

function accountContext(workspaceKey: string) {
  const [kind, id, extra] = workspaceKey.split(':')
  if (!id || extra || !['agency', 'team', 'stakeholder'].includes(kind)) throw new Error('Invalid stored billing workspace')
  return { kind, id, agencyId: kind === 'agency' ? id : null, where: kind === 'agency' ? { agencyId: id } : kind === 'team' ? { teamId: id } : { stakeholderId: id } }
}

export async function playBillingStatus(agent: Agent, agencyId?: string | null) {
  const context = await resolveBillingWorkspace(agent, agencyId)
  const workspace = await workspacePlan(agent, agencyId)
  const subscription = workspace.subscription
  const current = subscription?.googlePlayPurchaseId
    ? await db.googlePlayPurchase.findUniqueOrThrow({ where: { id: subscription.googlePlayPurchaseId } }) : null
  const provider = current ? 'google_play' : subscription?.stripeSubscriptionId ? 'stripe' : subscription?.status === 'comped' ? 'comped' : null
  const isManager = context.canManage && workspace.isManager
  const blockedProvider = !!subscription && !current && subscriptionCanResume(subscription)
  const kind = context.kind === 'stakeholder' ? 'personal' : 'team'
  const products = GOOGLE_PLAY_PRODUCTS.filter((product) => product.kind === kind && product.seats >= context.seatsNeeded)
  return {
    plan: workspace.plan, seats: workspace.seats, activeProperties: workspace.active, limit: workspace.limit,
    workspace: { kind: context.kind, id: context.id, name: context.teamName },
    agencyId: context.kind === 'agency' ? context.id : 'personal',
    provider, products, currentProductId: current?.productId ?? null,
    seatsNeeded: context.seatsNeeded,
    canManageBilling: isManager,
    canPurchase: playBillingOpen() && isManager && !blockedProvider && products.length > 0 &&
      (!current || subscriptionIsLive(subscription!) || !subscriptionCanResume(subscription!)),
    managedByName: subscription?.managedBy?.name ?? null,
    subscriptionStatus: subscription?.status ?? null,
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    replacementTokenHash: current && isManager && subscriptionCanResume(subscription!) ? hash(current.purchaseToken) : null,
  }
}

/// A durable binding lets an authenticated RTDN finish a purchase even if the phone
/// disappears before submitting its token. The client never chooses an account id.
export async function preparePlayPurchase(productId: string, agencyId?: string | null) {
  const agent = await requireAgent()
  if (!playBillingOpen()) throw new PlayBillingError('billing_unavailable', 'Google Play billing is not available yet.')
  const product = GOOGLE_PLAY_PRODUCTS.find((candidate) => candidate.productId === productId)
  if (!product) throw new PlayBillingError('invalid_purchase', 'Choose an available Kivilo plan.')
  const initial = await resolveBillingWorkspace(agent, agencyId)
  return db.$transaction(async (tx) => {
    if (initial.kind === 'agency') await tx.$queryRaw`SELECT "id" FROM "Agency" WHERE "id" = ${initial.id} FOR SHARE`
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${initial.lockKey}, 0))`
    const context = await resolveBillingWorkspace(agent, agencyId, tx)
    const current = await tx.subscription.findUnique({ where: context.where, include: { googlePlayPurchase: true } })
    if (!context.canManage || (current?.managedById && current.managedById !== agent.id)) {
      throw new PlayBillingError('billing_conflict', 'Only the member who manages this plan can change its subscription.')
    }
    if (product.kind !== (context.kind === 'stakeholder' ? 'personal' : 'team') || product.seats < context.seatsNeeded) {
      throw new PlayBillingError('billing_conflict', 'Choose enough seats for the current team members.')
    }
    if (current && subscriptionCanResume(current) && !current.googlePlayPurchaseId) {
      throw new PlayBillingError('billing_conflict', 'This workspace already has a subscription. Manage that plan before buying another.')
    }
    const replacement = current?.googlePlayPurchase && subscriptionCanResume(current) ? current.googlePlayPurchase : null
    if (replacement && (!subscriptionIsLive(current!) || replacement.productId === productId)) {
      throw new PlayBillingError('billing_conflict', 'Manage the existing subscription in Google Play.')
    }
    const accountId = hash(`kivilo:google-play:${context.workspaceKey}:${agent.id}`)
    const binding = await tx.googlePlayBillingAccount.upsert({
      where: { id: accountId },
      create: { id: accountId, workspaceKey: context.workspaceKey, stakeholderId: agent.id },
      update: {},
    })
    if (!binding.stakeholderId || binding.retirementStartedAt) throw new PlayBillingError('billing_conflict', 'This account is being deleted.')
    return { productId, basePlanId: product.basePlanId, obfuscatedAccountId: accountId,
      replacementTokenHash: replacement ? hash(replacement.purchaseToken) : null,
      replacementMode: replacement ? 'withTimeProration' : null }
  })
}

/// Every source (restore, purchase stream, RTDN) rereads Google under the same workspace
/// lock as Stripe. Event payloads and client product/price/state claims grant nothing.
export async function reconcilePlayPurchase(purchaseToken: string, expectedOwnerId?: string) {
  if (!purchaseToken || purchaseToken.length > 4096) throw new PlayBillingError('invalid_purchase', 'Invalid purchase.')
  try {
    const initial = validated(await googlePlay().getSubscription(purchaseToken))
    const binding = await db.googlePlayBillingAccount.findUnique({ where: { id: initial.accountId } })
    if (!binding?.stakeholderId || binding.retirementStartedAt || (expectedOwnerId && binding.stakeholderId !== expectedOwnerId)) {
      if (expectedOwnerId) throw new PlayBillingError('purchase_not_found', 'Purchase not found for this account.')
      return null
    }
    const context = accountContext(binding.workspaceKey)
    const outcome = await db.$transaction(async (tx) => {
      if (context.kind === 'agency') await tx.$queryRaw`SELECT "id" FROM "Agency" WHERE "id" = ${context.id} FOR SHARE`
      const lockKey = `billing:${binding.workspaceKey}`
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`
      const account = await tx.googlePlayBillingAccount.findUniqueOrThrow({ where: { id: binding.id } })
      if (!account.stakeholderId || account.retirementStartedAt || account.stakeholderId !== binding.stakeholderId) return null
      const resource = await googlePlay().getSubscription(purchaseToken)
      const state = validated(resource)
      if (state.accountId !== account.id || state.product.kind !== (context.kind === 'stakeholder' ? 'personal' : 'team')) {
        throw new PlayBillingError('purchase_not_found', 'Purchase not found for this account.')
      }
      const existing = await tx.googlePlayPurchase.findUnique({ where: { purchaseToken } })
      if (existing && (existing.accountId !== account.id || existing.productId !== state.product.productId)) throw new PlayBillingError('purchase_not_found', 'Purchase not found for this account.')
      const previous = resource.linkedPurchaseToken
        ? await tx.googlePlayPurchase.findUnique({ where: { purchaseToken: resource.linkedPurchaseToken } }) : null
      if (resource.linkedPurchaseToken) {
        // Do not allow an unrecorded predecessor to bypass ownership: Google itself
        // must bind it to this same account, and a retained tombstone cannot transfer.
        const predecessor = previous ? null : validated(await googlePlay().getSubscription(resource.linkedPurchaseToken))
        if ((previous && previous.accountId !== account.id) || (predecessor && predecessor.accountId !== account.id)) {
          throw new PlayBillingError('purchase_not_found', 'Purchase not found for this account.')
        }
      }
      const row = await tx.googlePlayPurchase.upsert({
        where: { purchaseToken },
        create: { purchaseToken, accountId: account.id, productId: state.product.productId, basePlanId: state.product.basePlanId,
          state: state.state, expiresAt: state.expiresAt, autoRenewing: state.autoRenewing,
          acknowledged: state.acknowledged, testPurchase: state.testPurchase },
        update: { state: state.state, expiresAt: state.expiresAt, autoRenewing: state.autoRenewing,
          acknowledged: state.acknowledged || existing?.acknowledged === true, testPurchase: state.testPurchase },
      })
      const current = await tx.subscription.findUnique({ where: context.where, include: { googlePlayPurchase: true } })
      const candidate = { googlePlayPurchaseId: row.id, status: state.state, currentPeriodEnd: state.expiresAt }
      // A rejection is irreversible: retries finish its refund and never grant it,
      // even if the workspace's other subscription has since ended.
      if (row.rejectedAt) return { account, row, acknowledge: false, conflict: true }
      const reject = async (reason: 'duplicate_provider' | 'workspace_changed') => {
        // Only a supported newly acquired purchase bound to our recorded payer can
        // be refunded automatically. Never refund an already granted/current token,
        // an acknowledged purchase, or a token submitted by another signed-in user.
        const rejected = subscriptionIsLive(candidate) && !row.acknowledged && !row.grantedAt && current?.googlePlayPurchaseId !== row.id
          ? await tx.googlePlayPurchase.update({ where: { id: row.id }, data: { rejectedAt: new Date(), refundReason: reason } }) : row
        return { account, row: rejected, acknowledge: false, conflict: true }
      }
      // An old token never takes the current slot back after a replacement.
      if (row.replacedById) return { account, row, acknowledge: false, conflict: false }
      if (current && current.googlePlayPurchaseId !== row.id && subscriptionCanResume(current)) {
        const replacingCurrent = !!current.googlePlayPurchase && !!resource.linkedPurchaseToken &&
          current.googlePlayPurchase.purchaseToken === resource.linkedPurchaseToken
        if (!replacingCurrent) return reject('duplicate_provider')
        // Pending replacement transactions leave the old paid entitlement in place.
        if (!subscriptionIsLive(candidate)) return { account, row, acknowledge: false, conflict: false }
      }
      if (current?.googlePlayPurchaseId !== row.id) {
        const payer = await tx.stakeholder.findUniqueOrThrow({ where: { id: account.stakeholderId } })
        let authorized
        try { authorized = await resolveBillingWorkspace(payer, context.agencyId, tx) }
        catch (error) {
          if (error instanceof Error && error.message === 'Team not found') return reject('workspace_changed')
          throw error
        }
        if (!authorized.canManage || authorized.workspaceKey !== account.workspaceKey || state.product.seats < authorized.seatsNeeded ||
            (current?.managedById && current.managedById !== payer.id)) {
          return reject('workspace_changed')
        }
      }
      // A late expired/failed purchase must not replace another newer subscription.
      if (current && current.googlePlayPurchaseId !== row.id && !subscriptionIsLive(candidate) &&
          !['SUBSCRIPTION_STATE_PENDING', 'SUBSCRIPTION_STATE_ON_HOLD', 'SUBSCRIPTION_STATE_PAUSED'].includes(state.state)) {
        return { account, row, acknowledge: false, conflict: false }
      }
      const data = { plan: 'PRO' as const, seats: state.product.seats, status: state.state,
        currentPeriodEnd: state.expiresAt, cancelAtPeriodEnd: !state.autoRenewing,
        googlePlayPurchaseId: row.id, stripeSubscriptionId: null, stripeCustomerId: null }
      await tx.subscription.upsert({
        where: context.where,
        create: { ...context.where, ...data, managedById: account.stakeholderId },
        update: { ...data, ...(current?.googlePlayPurchaseId === row.id ? {} : { managedById: account.stakeholderId }) },
      })
      if (subscriptionIsLive(candidate) && !row.grantedAt) {
        await tx.googlePlayPurchase.update({ where: { id: row.id }, data: { grantedAt: new Date() } })
      }
      if (previous && previous.id !== row.id && subscriptionIsLive(candidate)) {
        await tx.googlePlayPurchase.update({ where: { id: previous.id }, data: { replacedById: row.id } })
      }
      return { account, row, acknowledge: subscriptionIsLive(candidate) && !row.acknowledged, conflict: false }
    }, { timeout: 30_000, maxWait: 10_000 })
    if (!outcome) return null
    if (outcome.conflict) {
      if (outcome.row.rejectedAt && !outcome.row.refundedAt) {
        await db.$transaction(async (tx) => {
          if (context.kind === 'agency') await tx.$queryRaw`SELECT "id" FROM "Agency" WHERE "id" = ${context.id} FOR SHARE`
          const lockKey = `billing:${binding.workspaceKey}`
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`
          const rejected = await tx.googlePlayPurchase.findUniqueOrThrow({ where: { id: outcome.row.id } })
          if (rejected.refundedAt) return
          if (!rejected.rejectedAt || rejected.grantedAt || rejected.acknowledged) throw new Error('Rejected purchase refund eligibility changed')
          await googlePlay().revokeSubscription(purchaseToken)
          await tx.googlePlayPurchase.update({ where: { id: rejected.id }, data: { refundedAt: new Date() } })
        }, { timeout: 30_000, maxWait: 10_000 })
      }
      throw new PlayBillingError('billing_conflict', outcome.row.rejectedAt
        ? 'This purchase could not replace the current plan and has been refunded. Refresh your plan before buying again.'
        : 'This purchase cannot replace the current plan. Contact support before buying again.', !!outcome.row.rejectedAt)
    }
    if (outcome.acknowledge) {
      // The entitlement has committed before acknowledgement. Retry is harmless if
      // the server stops between Google's response and this local write.
      await googlePlay().acknowledgeSubscription(outcome.row.productId, purchaseToken)
      await db.googlePlayPurchase.update({ where: { id: outcome.row.id }, data: { acknowledged: true } })
    }
    return { workspaceKey: outcome.account.workspaceKey,
      acknowledged: outcome.row.acknowledged || outcome.acknowledge,
      purchasePending: outcome.row.state === 'SUBSCRIPTION_STATE_PENDING' }
  } catch (error) {
    if (error instanceof PlayBillingError) throw error
    // Prisma/HTTP diagnostics can contain the input token. Never let that raw error
    // reach the shared API error reporter or an operator command's console.
    throw new PlayBillingError('billing_unavailable', 'Google Play could not verify the purchase yet. Please retry.')
  }
}

export async function verifyPlayPurchase(purchaseToken: string) {
  const agent = await requireAgent()
  const result = await reconcilePlayPurchase(purchaseToken, agent.id)
  if (!result) throw new PlayBillingError('purchase_not_found', 'Purchase not found for this account.')
  const context = accountContext(result.workspaceKey)
  const status = await playBillingStatus(agent, context.agencyId)
  return { ...status, acknowledged: result.acknowledged, purchasePending: result.purchasePending }
}

/// Stop future payments before deleting a payer. History becomes a non-transferable
/// tombstone, so a restored Play purchase cannot attach itself to a different login.
export async function retirePlayBilling(stakeholderId: string) {
  const accounts = await db.googlePlayBillingAccount.findMany({ where: { stakeholderId } })
  for (const account of accounts) {
    // Freeze new reconciliation first, while retaining the payer until every remote
    // cancellation succeeds. A partial deletion can therefore retry without missing
    // a purchase that landed just before the freeze.
    const purchases = await db.$transaction(async (tx) => {
      const context = accountContext(account.workspaceKey)
      if (context.kind === 'agency') await tx.$queryRaw`SELECT "id" FROM "Agency" WHERE "id" = ${context.id} FOR SHARE`
      const lockKey = `billing:${account.workspaceKey}`
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`
      await tx.googlePlayBillingAccount.update({ where: { id: account.id }, data: { retirementStartedAt: new Date() } })
      return tx.googlePlayPurchase.findMany({ where: { accountId: account.id } })
    })
    for (const purchase of purchases) {
      if (purchase.replacedById || ['SUBSCRIPTION_STATE_EXPIRED', 'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED'].includes(purchase.state)) continue
      let resource: GooglePlaySubscription
      try { resource = await googlePlay().getSubscription(purchase.purchaseToken) }
      catch (error) {
        // Google retires tokens 60 days after expiry; they can no longer renew.
        if (error instanceof GooglePlayApiError && error.status === 410) continue
        throw error
      }
      const current = validated(resource)
      if (current.autoRenewing && !['SUBSCRIPTION_STATE_EXPIRED', 'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED'].includes(current.state)) {
        await googlePlay().cancelSubscription(purchase.purchaseToken)
      }
    }
    await db.$transaction(async (tx) => {
      const lockKey = `billing:${account.workspaceKey}`
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`
      await tx.subscription.updateMany({ where: { googlePlayPurchase: { accountId: account.id } },
        data: { status: 'SUBSCRIPTION_STATE_EXPIRED', currentPeriodEnd: new Date(), managedById: null } })
      await tx.googlePlayBillingAccount.update({ where: { id: account.id }, data: { stakeholderId: null } })
    })
  }
}
