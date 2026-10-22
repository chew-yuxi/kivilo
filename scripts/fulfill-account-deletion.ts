import 'dotenv/config'
import { retireFindingDraftsForAccount, retireInspectionFindingPhotos } from '@/lib/finding-photos'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from '@/lib/db'
import { sendAccountDeletionComplete } from '@/lib/email'
import { syncSubscription } from '@/lib/billing'
import { isLive } from '@/lib/plan'
import { stripe } from '@/lib/stripe'
import { CAPTURE_BUCKET, serviceClient } from '@/lib/storage'
import type { InspectionStatus } from '@/generated/prisma'
import { lockAgencyTenancy } from '@/lib/agency'

// This is an operator command, not an automatic cascade. Each retention choice must
// come from the company's approved policy. The request remains PROCESSING until every
// deleted room's Storage prefix is empty after outstanding signed URLs have expired.
const draftStatuses: InspectionStatus[] = ['DRAFT', 'CAPTURING', 'PROCESSING', 'REVIEW', 'FAILED']
// Supabase signed upload URLs last two hours. A further hour covers a request that
// started before the database row was deleted but reached Storage later.
const uploadWindow = 3 * 60 * 60 * 1000

async function removeAuthUser(authUserId: string) {
  const admin = serviceClient().auth.admin
  const { data, error } = await admin.getUserById(authUserId)
  if (error && error.status !== 404) throw error
  if (data?.user) {
    const deleted = await admin.deleteUser(authUserId)
    if (deleted.error && deleted.error.status !== 404) throw deleted.error
  }
}

async function deleteOwnedDraft(inspectionId: string, stakeholderId: string, requestId: string) {
  await db.$transaction(async (tx) => {
    const source = await tx.inspection.findUnique({ where: { id: inspectionId }, select: { tenancyId: true } })
    if (!source) return
    await lockAgencyTenancy(source.tenancyId, tx)
    // Send for signature takes this same row lock. If Send won, nothing is purged;
    // if deletion won, Send finds no inspection. Lock the tenancy too so a party
    // cannot be changed between the sole-party check and the cascade.
    const rows = await tx.$queryRaw<{
      id: string
      status: InspectionStatus
      conductedById: string | null
      landlordId: string
      tenantId: string
      agentId: string | null
    }[]>`
      SELECT i."id", i."status", i."conductedById",
             t."landlordId", t."tenantId", t."agentId"
      FROM "Inspection" i JOIN "Tenancy" t ON t."id" = i."tenancyId"
      WHERE i."id" = ${inspectionId}
      FOR UPDATE OF i
    `
    if (rows.length === 0) return // A previous invocation completed this transaction.
    const current = rows[0]
    // Sharing takes the tenancy lock too. Read grants after acquiring it, so an
    // invitation committed while this transaction waited is visible before deleting.
    const sharedAccess = await tx.inspection.count({ where: {
      id: inspectionId,
      OR: [
        { accessGrants: { some: { stakeholderId: { not: stakeholderId } } } },
        { tenancy: { collaborators: { some: { stakeholderId: { not: stakeholderId } } } } },
      ],
    } })
    if (current.conductedById !== stakeholderId || !draftStatuses.includes(current.status) ||
        current.landlordId !== stakeholderId || current.tenantId !== stakeholderId ||
        (current.agentId !== null && current.agentId !== stakeholderId) || sharedAccess) {
      throw new Error(`Inspection ${inspectionId} changed status, parties or access; review it before resuming deletion`)
    }
    const rooms = await tx.room.findMany({ where: { inspectionId }, select: { id: true } })
    const readyAt = new Date(Date.now() + uploadWindow)
    await tx.accountDeletionStoragePurge.createMany({
      data: rooms.map((room) => ({ requestId, roomId: room.id, readyAt })),
    })
    await retireInspectionFindingPhotos(tx, inspectionId)
    await tx.inspection.delete({ where: { id: inspectionId } })
  })
}

async function sweepRoom(roomId: string) {
  const storage = serviceClient().storage.from(CAPTURE_BUCKET)
  // All Kivilo upload paths are direct children of a room ID. Listing at offset zero
  // after each removal avoids skipped objects as the prefix shrinks.
  for (let pass = 0; pass < 100; pass++) {
    const { data, error } = await storage.list(roomId, { limit: 1000, offset: 0 })
    if (error) throw error
    const objects = data ?? []
    if (objects.length === 0) return
    if (objects.some((object) => object.id === null)) {
      throw new Error(`Room ${roomId} has a nested Storage folder; inspect it before deleting`)
    }
    const paths = objects.map((object) => `${roomId}/${object.name}`)
    for (let start = 0; start < paths.length; start += 100) {
      const removed = await storage.remove(paths.slice(start, start + 100))
      if (removed.error) throw removed.error
    }
  }
  throw new Error(`Room ${roomId} still has Storage objects after 100 cleanup passes`)
}

export async function fulfillAccountDeletion(requestId: string | undefined, policyVersion: string | undefined) {
  if (!requestId || !policyVersion ||
      process.env.KIVILO_RETAIN_SIGNED_RECORDS !== '1' ||
      process.env.KIVILO_DELETE_SOLE_UNSIGNED_RECORDS !== '1' ||
      process.env.KIVILO_RETAIN_SHARED_UNSIGNED_RECORDS !== '1') {
    throw new Error(
      'Usage: Set KIVILO_RETENTION_POLICY_VERSION=<approved version>, ' +
      'KIVILO_RETAIN_SIGNED_RECORDS=1, KIVILO_DELETE_SOLE_UNSIGNED_RECORDS=1, ' +
      'KIVILO_RETAIN_SHARED_UNSIGNED_RECORDS=1, then run ' +
      'pnpm exec tsx scripts/fulfill-account-deletion.ts <request id>',
    )
  }
  const request = await db.accountDeletionRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: { stakeholder: true },
  })

  // An operational workspace survives its members. Require an explicit handover
  // before deleting an owner, even if this request predates team ownership.
  if (await db.agencyMembership.count({ where: { stakeholderId: request.stakeholderId, role: 'OWNER', status: 'ACTIVE' } })) {
    throw new Error('Transfer team ownership and step down as owner before fulfilling this account deletion request')
  }

  if (request.status !== 'COMPLETED') {
    if (request.processingPolicyVersion && request.processingPolicyVersion !== policyVersion) {
      throw new Error('This deletion request is already processing under a different retention policy version')
    }
    if (request.status === 'REQUESTED') {
      await db.accountDeletionRequest.update({
        where: { id: requestId, status: 'REQUESTED' },
        data: { status: 'PROCESSING', processingPolicyVersion: policyVersion },
      })
    } else if (!request.processingPolicyVersion) {
      await db.accountDeletionRequest.update({
        where: { id: requestId, status: 'PROCESSING' },
        data: { processingPolicyVersion: policyVersion },
      })
    }
    const person = request.stakeholder
    if (person.authUserId) await removeAuthUser(person.authUserId)

    // Stop account-specific deliveries immediately, even when media cleanup keeps
    // the request PROCESSING for several hours. Reruns may safely repeat this.
    await db.$transaction([
      db.deviceInstallation.deleteMany({ where: { stakeholderId: person.id } }),
      db.notification.deleteMany({ where: { recipientId: person.id } }),
      db.errorEvent.deleteMany({ where: { stakeholderId: person.id } }),
      db.productEvent.deleteMany({ where: { stakeholderId: person.id } }),
      db.tenancyCollaborator.deleteMany({ where: { stakeholderId: person.id } }),
      db.inspectionAccessGrant.deleteMany({ where: { stakeholderId: person.id } }),
    ])

    // A plan this person pays for would keep charging their card after they are gone,
    // so it is canceled now and the workspace drops to Free. Clearing the manager lets a
    // teammate subscribe again, on a customer of their own: the portal only ever opens
    // for the member who manages the plan, so nobody reaches the deleted payer's invoices.
    // Stripe is re-read first, so a rerun after a partial failure never cancels twice.
    const managed = await db.subscription.findMany({ where: { managedById: person.id } })
    for (const { stripeSubscriptionId, status } of managed) {
      if (!stripeSubscriptionId || !isLive(status)) continue
      const current = await stripe().subscriptions.retrieve(stripeSubscriptionId)
      if (current.status !== 'canceled') await stripe().subscriptions.cancel(stripeSubscriptionId)
      await syncSubscription(stripeSubscriptionId)
    }
    await db.subscription.updateMany({ where: { managedById: person.id }, data: { managedById: null } })

    await retireFindingDraftsForAccount(person.id)

    // An inspection can be this agent's work while also being a landlord's or
    // tenant's record. Keep that shared work under the explicit retention choice.
    // Only a draft whose conductor, parties and access grants are this account can
    // be deleted without erasing another person's unsigned record.
    const soleDrafts = await db.inspection.findMany({
      where: {
        conductedById: person.id,
        status: { in: draftStatuses },
        accessGrants: { none: { stakeholderId: { not: person.id } } },
        tenancy: {
          landlordId: person.id,
          tenantId: person.id,
          OR: [{ agentId: null }, { agentId: person.id }],
          collaborators: { none: { stakeholderId: { not: person.id } } },
        },
      },
      select: { id: true },
    })
    for (const inspection of soleDrafts) {
      await deleteOwnedDraft(inspection.id, person.id, requestId)
    }

    const pendingPurges = await db.accountDeletionStoragePurge.findMany({
      where: { requestId, completedAt: null },
      orderBy: { readyAt: 'asc' },
    })
    for (const purge of pendingPurges) {
      if (purge.readyAt > new Date()) continue
      await sweepRoom(purge.roomId)
      await db.accountDeletionStoragePurge.update({
        where: { id: purge.id },
        data: { completedAt: new Date() },
      })
    }

    // Report branding carries licence numbers and a phone number. Signed reports keep
    // their content; their header simply stops naming an agency. The logo is removed
    // before the row, and removing an absent object succeeds, so a rerun after a
    // failure here repeats safely.
    const branding = await db.agentBranding.findUnique({ where: { stakeholderId: person.id } })
    if (branding?.logoPath) {
      const { error } = await serviceClient().storage.from(CAPTURE_BUCKET).remove([branding.logoPath])
      if (error) throw error
    }

    await db.$transaction(async (tx) => {
      const current = await tx.$queryRaw<{
        status: 'REQUESTED' | 'PROCESSING' | 'COMPLETED'
        processingPolicyVersion: string | null
      }[]>`
        SELECT "status", "processingPolicyVersion" FROM "AccountDeletionRequest"
        WHERE "id" = ${requestId} FOR UPDATE
      `
      if (current.length !== 1 || current[0].status !== 'PROCESSING' ||
          current[0].processingPolicyVersion !== policyVersion) {
        throw new Error('Deletion request status or retention policy changed; inspect it before completing')
      }

      const soleDraftsLeft = await tx.inspection.count({
        where: {
          conductedById: person.id,
          status: { in: draftStatuses },
          accessGrants: { none: { stakeholderId: { not: person.id } } },
          tenancy: {
            landlordId: person.id,
            tenantId: person.id,
            OR: [{ agentId: null }, { agentId: person.id }],
            collaborators: { none: { stakeholderId: { not: person.id } } },
          },
        },
      })
      const storageLeft = await tx.accountDeletionStoragePurge.count({
        where: { requestId, completedAt: null },
      })
      // A capture or room deleted before this request can still have an independent
      // Storage tombstone. We cannot reconstruct its former owner after its DB row is
      // gone, so conservatively wait for every general purge to finish as well.
      const generalStorageLeft = await tx.storagePurge.count({ where: { completedAt: null } })
      if (soleDraftsLeft || storageLeft || generalStorageLeft) {
        throw new Error(`Deletion remains PROCESSING: ${soleDraftsLeft} sole-party drafts, ${storageLeft} request room prefixes, and ${generalStorageLeft} general Storage tombstones await cleanup. Rerun the Storage purge worker after signed upload URLs expire, then retry this request.`)
      }

      // Remaining unsigned records involve another party, conductor or collaborator. The
      // operator explicitly accepted retaining them under the named policy.
      const sharedUnsigned = await tx.inspection.count({
        where: {
          status: { in: draftStatuses },
          OR: [
            { conductedById: person.id },
            { tenancy: { OR: [
              { agentId: person.id },
              { landlordId: person.id },
              { tenantId: person.id },
            ] } },
          ],
        },
      })
      const signedReferences = await tx.inspection.count({
        where: {
          status: { in: ['AWAITING_SIGNATURE', 'COMPLETED'] },
          OR: [
            { conductedById: person.id },
            { tenancy: { OR: [
              { agentId: person.id },
              { landlordId: person.id },
              { tenantId: person.id },
            ] } },
            { signatures: { some: { stakeholderId: person.id } } },
          ],
        },
      })

      // A tenancy with no inspections has no signed report to keep an agent link for.
      await tx.tenancy.updateMany({
        where: { agentId: person.id, inspections: { none: {} } },
        data: { agentId: null },
      })

      // These belong only to the account, not to other parties' tenancy history.
      // The notification cascade also removes queued push deliveries and emailTo.
      await tx.deviceInstallation.deleteMany({ where: { stakeholderId: person.id } })
      await tx.notification.deleteMany({ where: { recipientId: person.id } })
      await tx.tenancyCollaborator.deleteMany({ where: { stakeholderId: person.id } })
      await tx.inspectionAccessGrant.deleteMany({ where: { stakeholderId: person.id } })
      // The logo object went before this transaction; see above.
      await tx.agentBranding.deleteMany({ where: { stakeholderId: person.id } })

      await tx.stakeholder.update({
        where: { id: person.id },
        data: {
          authUserId: null,
          email: null,
          phone: null,
          idNumber: null,
          name: signedReferences || sharedUnsigned ? person.name : 'Deleted user',
        },
      })
      await tx.accountDeletionRequest.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          fulfilledUnderPolicy: policyVersion,
        },
      })
    }, { isolationLevel: 'Serializable', timeout: 30_000 })
  }

  // Keep the recipient address only until the completion notice is confirmed.
  if (request.email && !request.notificationSentAt) {
    await sendAccountDeletionComplete(request.email, requestId)
    await db.accountDeletionRequest.update({
      where: { id: requestId },
      data: { email: null, notificationSentAt: new Date() },
    })
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fulfillAccountDeletion(process.argv[2], process.env.KIVILO_RETENTION_POLICY_VERSION)
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
    .finally(async () => db.$disconnect())
}
