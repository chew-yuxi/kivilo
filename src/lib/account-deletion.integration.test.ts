import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'

const { sendComplete } = vi.hoisted(() => ({ sendComplete: vi.fn(async () => {}) }))
vi.mock('@/lib/email', () => ({ sendAccountDeletionComplete: sendComplete }))

import { db } from '@/lib/db'
import { CAPTURE_BUCKET, captureExists, serviceClient, uploadBytes } from '@/lib/storage'
import { fulfillAccountDeletion } from '../../scripts/fulfill-account-deletion'

const policyVersion = 'local-integration-test'

function assertLocalSupabase() {
  const database = new URL(process.env.DATABASE_URL ?? '')
  const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
  if (database.hostname !== '127.0.0.1' || database.port !== '56322' ||
      supabase.hostname !== '127.0.0.1' || supabase.port !== '56321') {
    throw new Error('Account deletion integration test may run only against local Supabase')
  }
}

afterAll(async () => db.$disconnect())

describe('operator account deletion fulfillment', () => {
  it('anonymizes an account without retained records and sends one mocked completion notice', async () => {
    assertLocalSupabase()
    vi.stubEnv('KIVILO_RETAIN_SIGNED_RECORDS', '1')
    vi.stubEnv('KIVILO_DELETE_SOLE_UNSIGNED_RECORDS', '1')
    vi.stubEnv('KIVILO_RETAIN_SHARED_UNSIGNED_RECORDS', '1')
    sendComplete.mockReset()
    sendComplete.mockResolvedValue(undefined)

    const tag = randomUUID()
    const email = `deletion-empty-${tag}@example.test`
    const admin = serviceClient().auth.admin
    let authUserId: string | undefined
    let stakeholderId: string | undefined
    let requestId: string | undefined
    try {
      const createdUser = await admin.createUser({
        email, password: `${randomUUID()}Qa1!`, email_confirm: true,
      })
      if (createdUser.error || !createdUser.data.user) {
        throw createdUser.error ?? new Error('Local Auth user was not created')
      }
      authUserId = createdUser.data.user.id
      const person = await db.stakeholder.create({ data: {
        name: `Deletion QA empty ${tag}`, email, phone: '00000000',
        idNumber: `QA-${tag}`, authUserId,
      } })
      stakeholderId = person.id
      const request = await db.accountDeletionRequest.create({ data: {
        stakeholderId: person.id, email, dueAt: new Date('2099-01-01'),
      } })
      requestId = request.id

      sendComplete.mockRejectedValueOnce(new Error('Local synthetic mail outage'))
      await expect(fulfillAccountDeletion(request.id, policyVersion))
        .rejects.toThrow('Local synthetic mail outage')
      expect((await admin.getUserById(authUserId)).data.user).toBeNull()
      expect(await db.stakeholder.findUniqueOrThrow({ where: { id: person.id } })).toMatchObject({
        name: 'Deleted user', authUserId: null, email: null, phone: null, idNumber: null,
      })
      const pendingNotice = await db.accountDeletionRequest.findUniqueOrThrow({ where: { id: request.id } })
      expect(pendingNotice).toMatchObject({
        status: 'COMPLETED', email, notificationSentAt: null, fulfilledUnderPolicy: policyVersion,
      })
      expect(pendingNotice.completedAt).not.toBeNull()
      expect(sendComplete).toHaveBeenCalledExactlyOnceWith(email, request.id)
      await fulfillAccountDeletion(request.id, policyVersion)
      const notified = await db.accountDeletionRequest.findUniqueOrThrow({ where: { id: request.id } })
      expect(notified.email).toBeNull()
      expect(notified.notificationSentAt).not.toBeNull()
      expect(sendComplete).toHaveBeenCalledTimes(2)
      await fulfillAccountDeletion(request.id, policyVersion)
      expect(sendComplete).toHaveBeenCalledTimes(2)
    } finally {
      vi.unstubAllEnvs()
      if (requestId) await db.accountDeletionRequest.deleteMany({ where: { id: requestId } })
      if (stakeholderId) await db.stakeholder.deleteMany({ where: { id: stakeholderId } })
      if (authUserId) {
        const remaining = await admin.getUserById(authUserId)
        if (remaining.data.user) await admin.deleteUser(authUserId)
      }
    }
  }, 30_000)

  it('removes sole drafts and account access, retains shared records, and waits for media purge before completion', async () => {
    assertLocalSupabase()
    vi.stubEnv('KIVILO_RETAIN_SIGNED_RECORDS', '1')
    vi.stubEnv('KIVILO_DELETE_SOLE_UNSIGNED_RECORDS', '1')
    vi.stubEnv('KIVILO_RETAIN_SHARED_UNSIGNED_RECORDS', '1')
    sendComplete.mockReset()
    sendComplete.mockResolvedValue(undefined)

    const tag = randomUUID()
    const email = `deletion-qa-${tag}@example.test`
    const admin = serviceClient().auth.admin
    const storage = serviceClient().storage.from(CAPTURE_BUCKET)
    let authUserId: string | undefined
    let personId: string | undefined
    let partnerId: string | undefined
    let requestId: string | undefined
    const propertyIds: string[] = []
    const storagePaths: string[] = []

    try {
      const createdUser = await admin.createUser({
        email,
        password: `${randomUUID()}Qa1!`,
        email_confirm: true,
      })
      if (createdUser.error || !createdUser.data.user) {
        throw createdUser.error ?? new Error('Local Auth user was not created')
      }
      authUserId = createdUser.data.user.id

      const person = await db.stakeholder.create({ data: {
        name: `Deletion QA ${tag}`,
        email,
        phone: '00000000',
        idNumber: `QA-${tag}`,
        authUserId,
      } })
      personId = person.id
      const partner = await db.stakeholder.create({ data: { name: `Deletion QA partner ${tag}` } })
      partnerId = partner.id

      const soleProperty = await db.property.create({ data: {
        line1: `Deletion QA sole ${tag}`, postalCode: '000000', type: 'PRIVATE_NON_LANDED',
      } })
      propertyIds.push(soleProperty.id)
      const sharedProperty = await db.property.create({ data: {
        line1: `Deletion QA shared ${tag}`, postalCode: '000000', type: 'PRIVATE_NON_LANDED',
      } })
      propertyIds.push(sharedProperty.id)
      const dates = { startDate: new Date('2026-01-01'), endDate: new Date('2027-01-01'),
        monthlyRent: '100', deposit: '200' }
      const soleTenancy = await db.tenancy.create({ data: {
        propertyId: soleProperty.id, landlordId: person.id, tenantId: person.id,
        agentId: person.id, ...dates,
      } })
      const sharedTenancy = await db.tenancy.create({ data: {
        propertyId: sharedProperty.id, landlordId: person.id, tenantId: partner.id,
        agentId: person.id, ...dates,
      } })
      const soleDraft = await db.inspection.create({ data: {
        tenancyId: soleTenancy.id, kind: 'CHECK_IN', status: 'DRAFT', conductedById: person.id,
      } })
      const sharedDraft = await db.inspection.create({ data: {
        tenancyId: sharedTenancy.id, kind: 'CHECK_IN', status: 'REVIEW', conductedById: person.id,
      } })
      const signed = await db.inspection.create({ data: {
        tenancyId: sharedTenancy.id, kind: 'CHECK_IN', status: 'COMPLETED', conductedById: person.id,
      } })
      await db.signature.create({ data: {
        inspectionId: signed.id, stakeholderId: person.id, imageData: 'data:image/png;base64,AA==',
      } })
      const soleRoom = await db.room.create({ data: { inspectionId: soleDraft.id, name: 'Sole room', order: 0 } })
      const sharedRoom = await db.room.create({ data: { inspectionId: sharedDraft.id, name: 'Shared room', order: 0 } })
      const signedRoom = await db.room.create({ data: { inspectionId: signed.id, name: 'Signed room', order: 0 } })
      const solePath = `${soleRoom.id}/capture.jpg`
      const latePath = `${soleRoom.id}/late-upload.jpg`
      const sharedPath = `${sharedRoom.id}/capture.jpg`
      const signedPath = `${signedRoom.id}/capture.jpg`
      storagePaths.push(solePath, latePath, sharedPath, signedPath)
      for (const path of storagePaths.filter((path) => path !== latePath)) {
        await uploadBytes(path, new Uint8Array([1, 2, 3]), 'image/jpeg')
      }
      for (const [roomId, path] of [[soleRoom.id, solePath], [sharedRoom.id, sharedPath], [signedRoom.id, signedPath]]) {
        await db.capture.create({ data: {
          roomId, storagePath: path, kind: 'PHOTO', mimeType: 'image/jpeg', sizeBytes: 3,
        } })
      }

      const installation = await db.deviceInstallation.create({ data: {
        stakeholderId: person.id, token: `local-qa-${tag}`, platform: 'ANDROID',
      } })
      const notification = await db.notification.create({ data: {
        recipientId: person.id, kind: 'MAINTENANCE_STATUS', title: 'Synthetic QA',
        body: 'Synthetic QA', emailTo: email, pushExpandedAt: new Date(),
      } })
      await db.notificationPushDelivery.create({ data: {
        notificationId: notification.id, installationId: installation.id,
      } })
      const request = await db.accountDeletionRequest.create({ data: {
        stakeholderId: person.id, email, dueAt: new Date('2099-01-01'),
      } })
      requestId = request.id

      await expect(fulfillAccountDeletion(request.id, policyVersion))
        .rejects.toThrow('Deletion remains PROCESSING')
      const authAfterFirstRun = await admin.getUserById(authUserId)
      expect(authAfterFirstRun.data.user).toBeNull()
      expect(await db.inspection.findUnique({ where: { id: soleDraft.id } })).toBeNull()
      expect(await db.inspection.findUnique({ where: { id: sharedDraft.id } })).not.toBeNull()
      expect(await db.inspection.findUnique({ where: { id: signed.id } })).not.toBeNull()
      expect(await db.signature.count({ where: { inspectionId: signed.id, stakeholderId: person.id } })).toBe(1)
      expect(await captureExists(solePath)).toBe(true)
      expect(await captureExists(latePath)).toBe(false)
      // A signed URL minted before deletion can still write after its DB row is gone.
      await uploadBytes(latePath, new Uint8Array([4, 5, 6]), 'image/jpeg')
      expect(await captureExists(latePath)).toBe(true)
      expect(await db.deviceInstallation.count({ where: { stakeholderId: person.id } })).toBe(0)
      expect(await db.notification.count({ where: { recipientId: person.id } })).toBe(0)
      expect(await db.notificationPushDelivery.count({ where: { notificationId: notification.id } })).toBe(0)
      expect((await db.accountDeletionRequest.findUniqueOrThrow({ where: { id: request.id } })).status).toBe('PROCESSING')
      expect(sendComplete).not.toHaveBeenCalled()

      await expect(fulfillAccountDeletion(request.id, policyVersion))
        .rejects.toThrow('Deletion remains PROCESSING')
      expect(await captureExists(latePath)).toBe(true)
      const purges = await db.accountDeletionStoragePurge.findMany({ where: { requestId: request.id } })
      expect(purges).toHaveLength(1)
      expect(purges[0].roomId).toBe(soleRoom.id)
      expect(sendComplete).not.toHaveBeenCalled()

      // Simulate the signed-upload URL window expiring without a three-hour test delay.
      await db.accountDeletionStoragePurge.update({
        where: { id: purges[0].id }, data: { readyAt: new Date(Date.now() - 1000) },
      })
      await fulfillAccountDeletion(request.id, policyVersion)

      expect(await captureExists(solePath)).toBe(false)
      expect(await captureExists(latePath)).toBe(false)
      expect(await captureExists(sharedPath)).toBe(true)
      expect(await captureExists(signedPath)).toBe(true)
      expect((await storage.list(soleRoom.id)).data).toEqual([])
      const completed = await db.accountDeletionRequest.findUniqueOrThrow({ where: { id: request.id } })
      expect(completed.status).toBe('COMPLETED')
      expect(completed.completedAt).not.toBeNull()
      expect(completed.fulfilledUnderPolicy).toBe(policyVersion)
      expect(completed.notificationSentAt).not.toBeNull()
      expect(completed.email).toBeNull()
      const scrubbed = await db.stakeholder.findUniqueOrThrow({ where: { id: person.id } })
      expect(scrubbed).toMatchObject({ authUserId: null, email: null, phone: null, idNumber: null, name: person.name })
      expect(sendComplete).toHaveBeenCalledExactlyOnceWith(email, request.id)

      await fulfillAccountDeletion(request.id, policyVersion)
      expect(sendComplete).toHaveBeenCalledTimes(1)
      expect(await db.accountDeletionStoragePurge.count({ where: { requestId: request.id } })).toBe(1)
    } finally {
      vi.unstubAllEnvs()
      if (requestId) await db.accountDeletionRequest.deleteMany({ where: { id: requestId } })
      for (const propertyId of propertyIds.reverse()) await db.property.deleteMany({ where: { id: propertyId } })
      if (personId) await db.stakeholder.deleteMany({ where: { id: personId } })
      if (partnerId) await db.stakeholder.deleteMany({ where: { id: partnerId } })
      if (storagePaths.length) await storage.remove(storagePaths)
      if (authUserId) {
        const remaining = await admin.getUserById(authUserId)
        if (remaining.data.user) await admin.deleteUser(authUserId)
      }
    }
  }, 60_000)
})
