import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'

/// Signing by email link. Send emails each party a link; the agent can send it again;
/// whoever signs, and however, the signature records a fingerprint of what they signed;
/// and the second signature emails everyone the signed PDF. Every email goes through the
/// ReportEmail outbox, so these tests read the rows and then run delivery with the
/// sending itself faked.

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/storage', () => ({
  // Every report PDF is already stored, so nothing is drawn.
  captureExists: vi.fn(async () => true),
  createDownloadUrl: vi.fn(async (path: string) => `https://storage.test/${path}`),
  downloadCapture: vi.fn(async () => new Uint8Array([37, 80, 68, 70])),
}))
vi.mock('@/lib/report-pdf/render', async (importActual) => ({
  // The emails' copy is faked; `reportPdfUrl`, behind the signing page's download, is real.
  ...(await importActual<typeof import('@/lib/report-pdf/render')>()),
  storedReportPdf: vi.fn(async () => ({ path: 'reports/x/y.pdf', filename: 'Check-in report.pdf' })),
}))
vi.mock('@/lib/email', () => ({
  sendSignatureRequest: vi.fn(async () => undefined),
  sendSignedCopy: vi.fn(async () => undefined),
  sendTenantHandover: vi.fn(async () => undefined),
}))
vi.mock('@/lib/auth', async (importActual) => {
  // Only the session lookup is faked; the authorization rules are the real ones.
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, currentStakeholder: vi.fn(), requireAgent: vi.fn(), requireStakeholder: vi.fn() }
})

import { db } from '@/lib/db'
import { currentStakeholder, requireAgent, requireStakeholder, signingRole } from '@/lib/auth'
import { completeReview, emailSigningLink, signInspection, signOwnReport } from '@/lib/actions'
import { deliverReportEmails, MAX_ATTACHMENT_BYTES } from '@/lib/report-email-delivery'
import { queueSignedCopies, queueTenantHandover, signingParties } from '@/lib/report-email'
import { downloadCapture } from '@/lib/storage'
import { GET as signedPdf } from '@/app/sign/[inspectionId]/pdf/route'
import { reportFingerprint } from '@/lib/report-fingerprint'
import { sendSignatureRequest, sendSignedCopy, sendTenantHandover } from '@/lib/email'
import type { Stakeholder } from '@/generated/prisma'

const tag = randomUUID().slice(0, 8)
const postalCode = '996655'
const created: string[] = []
const png = 'data:image/png;base64,iVBORw0KGgo='

async function person(name: string, email: string | null) {
  const row = await db.stakeholder.create({
    data: { name: `${name} ${tag}`, email: email && `${email}-${tag}-${randomUUID().slice(0, 6)}@kivilo.test` },
  })
  created.push(row.id)
  return row
}

/// A check-in reviewed and ready to send: one reviewed kitchen with one item and one
/// stamped photo.
async function readyToSend({ tenantEmail = true } = {}) {
  const landlord = await person('Landlord', 'landlord')
  const tenant = await person('Tenant', tenantEmail ? 'tenant' : null)
  const agent = await person('Agent', 'agent')
  const property = await db.property.create({
    data: { line1: `Signing ${tag}`, postalCode, type: 'PRIVATE_NON_LANDED' },
  })
  const tenancy = await db.tenancy.create({
    data: {
      propertyId: property.id, landlordId: landlord.id, tenantId: tenant.id, agentId: agent.id,
      startDate: new Date('2026-01-01'), endDate: new Date('2099-01-01'), monthlyRent: '3000', deposit: '6000',
    },
  })
  const inspection = await db.inspection.create({
    data: { tenancyId: tenancy.id, kind: 'CHECK_IN', status: 'REVIEW', conductedById: agent.id, conductedAt: new Date() },
  })
  const room = await db.room.create({
    data: { inspectionId: inspection.id, name: 'Kitchen', order: 0, status: 'REVIEWED' },
  })
  await db.inspectionItem.create({
    data: { roomId: room.id, name: 'Hob', category: 'APPLIANCE', condition: 'GOOD', editedByHuman: true },
  })
  await db.capture.create({
    data: {
      roomId: room.id, kind: 'PHOTO', storagePath: `${room.id}/hob.jpg`, mimeType: 'image/jpeg',
      sizeBytes: 10, processedAt: new Date(), note: 'Hob plate',
    },
  })
  return { landlord, tenant, agent, inspection, room }
}

/// The agent's actions resolve the session through requireAgent, a party's own
/// signature through requireStakeholder.
function asAgent(stakeholder: Stakeholder) {
  vi.mocked(requireAgent).mockResolvedValueOnce(stakeholder)
}

function asSigner(stakeholder: Stakeholder) {
  vi.mocked(requireStakeholder).mockResolvedValueOnce(stakeholder)
}

async function sent(deal: { landlord: Stakeholder; agent: Stakeholder; inspection: { id: string } }) {
  asAgent(deal.agent)
  await completeReview(deal.inspection.id)
}

function emails(inspectionId: string) {
  return db.reportEmail.findMany({ where: { inspectionId }, orderBy: { createdAt: 'asc' } })
}

describe('signing by email link', () => {
  beforeEach(() => {
    vi.mocked(requireAgent).mockReset()
    vi.mocked(requireStakeholder).mockReset()
    vi.mocked(sendSignatureRequest).mockReset()
    vi.mocked(sendSignedCopy).mockReset()
    vi.mocked(sendTenantHandover).mockReset()
    process.env.KIVILO_APP_URL = 'https://kivilo.test'
  })

  afterAll(async () => {
    await db.property.deleteMany({ where: { postalCode } })
    await db.stakeholder.deleteMany({ where: { id: { in: created } } })
    await db.$disconnect()
  })

  it('queues a signing email to each party with an address when the report is sent', async () => {
    const deal = await readyToSend({ tenantEmail: false })
    await sent(deal)

    const rows = await emails(deal.inspection.id)
    expect(rows).toMatchObject([{ recipientId: deal.landlord.id, kind: 'SIGNATURE_REQUEST', sentAt: null }])
    expect(await signingParties(deal.inspection.id)).toMatchObject([
      { role: 'LANDLORD', signedAt: null, signingEmail: { state: 'QUEUED' } },
      { role: 'TENANT', email: null, signedAt: null, signingEmail: null },
    ])
  })

  it('records the same content fingerprint whichever way each party signs, then queues the signed PDF once', async () => {
    const deal = await readyToSend()
    await sent(deal)
    const fingerprint = await reportFingerprint(db, deal.inspection.id)
    expect(fingerprint).toMatch(/^[0-9a-f]{64}$/)

    // The tenant on the agent's phone at the handover, the landlord from their own login
    // (the web link and the app both call signOwnReport).
    asAgent(deal.agent)
    await signInspection(deal.inspection.id, deal.tenant.id, png)
    asSigner(deal.landlord)
    await signOwnReport(deal.inspection.id, png)

    const signatures = await db.signature.findMany({ where: { inspectionId: deal.inspection.id } })
    expect(signatures.map((signature) => signature.contentHash)).toEqual([fingerprint, fingerprint])

    const copies = (await emails(deal.inspection.id)).filter((row) => row.kind === 'SIGNED_COPY')
    expect(copies.map((row) => row.recipientId).sort()).toEqual(
      [deal.landlord.id, deal.tenant.id, deal.agent.id].sort(),
    )

    // A retried signature after a lost response neither re-signs nor re-queues.
    asAgent(deal.agent)
    await signInspection(deal.inspection.id, deal.tenant.id, png)
    expect((await emails(deal.inspection.id)).filter((row) => row.kind === 'SIGNED_COPY')).toHaveLength(3)
  })

  it('fingerprints the content: a different note gives a different value, an unstamped capture does not', async () => {
    const deal = await readyToSend()
    const before = await reportFingerprint(db, deal.inspection.id)
    // A late upload that landed after Send is not part of what was agreed.
    await db.capture.create({
      data: { roomId: deal.room.id, kind: 'PHOTO', storagePath: `${deal.room.id}/late.jpg`, mimeType: 'image/jpeg', sizeBytes: 10 },
    })
    expect(await reportFingerprint(db, deal.inspection.id)).toBe(before)
    await db.capture.updateMany({ where: { roomId: deal.room.id, note: 'Hob plate' }, data: { note: 'Hob plate, chipped' } })
    expect(await reportFingerprint(db, deal.inspection.id)).not.toBe(before)
  })

  it('queues the tenant handover immediately after their first check-in signature, once only', async () => {
    const deal = await readyToSend()
    await sent(deal)
    expect((await emails(deal.inspection.id)).some((row) => row.kind === 'TENANT_HANDOVER')).toBe(false)
    asAgent(deal.agent)
    await signInspection(deal.inspection.id, deal.tenant.id, png)
    const handovers = (await emails(deal.inspection.id)).filter((row) => row.kind === 'TENANT_HANDOVER')
    expect(handovers).toMatchObject([{
      recipientId: deal.tenant.id, sentAt: null,
      dedupeKey: `tenant-handover:${deal.inspection.id}:${deal.tenant.id}`,
    }])
    expect(await db.inspection.findUnique({ where: { id: deal.inspection.id }, select: { status: true } }))
      .toMatchObject({ status: 'AWAITING_SIGNATURE' })
    await db.$transaction((tx) => queueTenantHandover(tx, deal.inspection.id))
    asAgent(deal.agent)
    await signInspection(deal.inspection.id, deal.tenant.id, png)
    expect((await emails(deal.inspection.id)).filter((row) => row.kind === 'TENANT_HANDOVER')).toHaveLength(1)
  })

  it('retries a failed tenant handover email with its own safe link and tenancy deadline', async () => {
    const deal = await readyToSend()
    await sent(deal)
    asAgent(deal.agent)
    await signInspection(deal.inspection.id, deal.tenant.id, png)
    await db.reportEmail.updateMany({
      where: { OR: [{ inspectionId: { not: deal.inspection.id } }, { kind: { not: 'TENANT_HANDOVER' } }], sentAt: null },
      data: { retryAt: new Date('2100-01-01') },
    })
    vi.mocked(sendTenantHandover).mockRejectedValueOnce(new Error('Resend is down'))
    await deliverReportEmails(500)
    const [queued] = (await emails(deal.inspection.id)).filter((row) => row.kind === 'TENANT_HANDOVER')
    expect(queued).toMatchObject({ attempts: 1, sentAt: null, error: 'Resend is down' })
    await db.reportEmail.update({ where: { id: queued.id }, data: { retryAt: new Date() } })
    await deliverReportEmails(500)
    const [to, message] = vi.mocked(sendTenantHandover).mock.calls.at(-1)!
    expect(to).toBe(deal.tenant.email)
    expect(message).toMatchObject({ windowDays: 30, countersigned: false, deadline: new Date('2026-01-30T15:59:59.999Z') })
    const link = new URL(message.link)
    expect(link.origin).toBe('https://kivilo.test')
    expect(link.pathname).toBe(`/handover/${deal.inspection.id}`)
    expect(link.searchParams.get('email')).toBe(deal.tenant.email)
    expect(link.toString()).not.toContain('/reports/')
    expect(await db.reportEmail.findUnique({ where: { id: queued.id } })).toMatchObject({ attempts: 2, error: null, emailTo: deal.tenant.email })
    expect(vi.mocked(sendSignedCopy)).not.toHaveBeenCalled()
  })

  it('lets the agent resend the link, without doubling one still waiting to go', async () => {
    const deal = await readyToSend({ tenantEmail: false })
    const outsider = await person('Other agent', 'outsider')

    // Before Send there is nothing to sign.
    asAgent(deal.agent)
    await expect(emailSigningLink(deal.inspection.id, deal.landlord.id)).rejects.toThrow('Report is not awaiting signature')
    await sent(deal)

    asAgent(deal.agent)
    await emailSigningLink(deal.inspection.id, deal.landlord.id)
    expect(await emails(deal.inspection.id)).toHaveLength(1)

    await db.reportEmail.updateMany({ where: { inspectionId: deal.inspection.id }, data: { sentAt: new Date() } })
    asAgent(deal.agent)
    await emailSigningLink(deal.inspection.id, deal.landlord.id)
    expect(await emails(deal.inspection.id)).toHaveLength(2)

    asAgent(deal.agent)
    await expect(emailSigningLink(deal.inspection.id, deal.tenant.id)).rejects.toThrow('no email on file')
    // Only the two parties, never an arbitrary stakeholder id.
    asAgent(deal.agent)
    await expect(emailSigningLink(deal.inspection.id, outsider.id)).rejects.toThrow('Signature party not found')
    // Another agent is told the inspection does not exist.
    asAgent(outsider)
    await expect(emailSigningLink(deal.inspection.id, deal.landlord.id)).rejects.toThrow('Inspection not found')

    asSigner(deal.landlord)
    await signOwnReport(deal.inspection.id, png)
    asAgent(deal.agent)
    await expect(emailSigningLink(deal.inspection.id, deal.landlord.id)).rejects.toThrow('already signed')
  })

  it('opens the signing page to the two parties only, refusing everyone else like a missing report', async () => {
    const deal = await readyToSend()
    const outsider = await person('Stranger', 'stranger')

    // Not yet sent: nothing to sign, even for the landlord.
    expect(await signingRole(deal.inspection.id, deal.landlord.id)).toBeNull()
    await sent(deal)

    expect(await signingRole(deal.inspection.id, deal.landlord.id)).toBe('LANDLORD')
    expect(await signingRole(deal.inspection.id, deal.tenant.id)).toBe('TENANT')
    // The agent collects signatures but does not sign; a stranger is a stranger.
    expect(await signingRole(deal.inspection.id, deal.agent.id)).toBeNull()
    expect(await signingRole(deal.inspection.id, outsider.id)).toBeNull()
    expect(await signingRole('cmnope00000000000000000', deal.landlord.id)).toBeNull()

    // And the signature itself refuses them just the same.
    asSigner(outsider)
    await expect(signOwnReport(deal.inspection.id, png)).rejects.toThrow('Report not found')
    asSigner(deal.agent)
    await expect(signOwnReport(deal.inspection.id, png)).rejects.toThrow('Report not found')
  })

  it('delivers requests with the signing link, withdraws ones made moot, and backs off on failure', async () => {
    const deal = await readyToSend()
    await sent(deal)
    // The tenant signs at the handover before the cron runs: their request is withdrawn.
    asAgent(deal.agent)
    await signInspection(deal.inspection.id, deal.tenant.id, png)

    // Rows left by the tests above are not this test's business; keep them out of the run.
    await db.reportEmail.updateMany({
      where: { inspectionId: { not: deal.inspection.id }, sentAt: null },
      data: { retryAt: new Date('2100-01-01') },
    })
    vi.mocked(sendSignatureRequest).mockRejectedValueOnce(new Error('Resend is down'))
    await deliverReportEmails(500)
    let rows = (await emails(deal.inspection.id)).filter((row) => row.kind === 'SIGNATURE_REQUEST')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ recipientId: deal.landlord.id, attempts: 1, sentAt: null, error: 'Resend is down' })
    expect(rows[0].retryAt.getTime()).toBeGreaterThan(Date.now())

    // Due again: it goes, with a link to the signing page naming the landlord's address.
    await db.reportEmail.update({ where: { id: rows[0].id }, data: { retryAt: new Date() } })
    await deliverReportEmails(500)
    rows = (await emails(deal.inspection.id)).filter((row) => row.kind === 'SIGNATURE_REQUEST')
    expect(rows[0]).toMatchObject({ attempts: 2, error: null, emailTo: deal.landlord.email })
    expect(rows[0].sentAt).not.toBeNull()
    const [to, request] = vi.mocked(sendSignatureRequest).mock.calls.at(-1)!
    expect(to).toBe(deal.landlord.email)
    expect(request).toMatchObject({ id: rows[0].id, role: 'landlord', reportKind: 'Check-in' })
    expect(new URL(request.link).pathname).toBe(`/sign/${deal.inspection.id}`)
    expect(new URL(request.link).searchParams.get('email')).toBe(deal.landlord.email)
    expect((await signingParties(deal.inspection.id))[0].signingEmail).toMatchObject({ state: 'SENT' })

    // The landlord signs: everyone gets the signed PDF, attached, and nothing links to it.
    asSigner(deal.landlord)
    await signOwnReport(deal.inspection.id, png)
    await deliverReportEmails(500)
    const copies = vi.mocked(sendSignedCopy).mock.calls
    expect(copies.map(([recipient]) => recipient).sort()).toEqual(
      [deal.landlord.email, deal.tenant.email, deal.agent.email].sort(),
    )
    expect(copies[0][2]).toMatchObject({ filename: 'Check-in report.pdf' })
    expect(copies[0][1].signatures.map((signature) => signature.role)).toEqual(['Tenant', 'Landlord'])
    expect((await emails(deal.inspection.id)).every((row) => row.sentAt)).toBe(true)
  })

  it('links a signed PDF too large to attach, to the signing page or the inspection, still once each', async () => {
    const deal = await readyToSend()
    await sent(deal)
    asAgent(deal.agent)
    await signInspection(deal.inspection.id, deal.tenant.id, png)
    asSigner(deal.landlord)
    await signOwnReport(deal.inspection.id, png)
    await db.reportEmail.updateMany({
      where: { OR: [{ inspectionId: { not: deal.inspection.id } }, { kind: 'SIGNATURE_REQUEST' }], sentAt: null },
      data: { retryAt: new Date('2100-01-01') },
    })

    // One byte past the limit. The report is fetched once for all three recipients.
    vi.mocked(downloadCapture).mockResolvedValueOnce(new Uint8Array(MAX_ATTACHMENT_BYTES + 1))
    await deliverReportEmails(500)
    const calls = vi.mocked(sendSignedCopy).mock.calls
    expect(calls).toHaveLength(3)
    const linkFor = (email: string | null) => {
      const pdf = calls.find(([to]) => to === email)![2]
      expect(pdf).not.toHaveProperty('content')
      return new URL((pdf as { link: string }).link)
    }
    for (const party of [deal.landlord, deal.tenant]) {
      const link = linkFor(party.email)
      expect(link.origin).toBe('https://kivilo.test')
      expect(link.pathname).toBe(`/sign/${deal.inspection.id}`)
      expect(link.searchParams.get('email')).toBe(party.email)
    }
    expect(linkFor(deal.agent.email).pathname).toBe(`/inspections/${deal.inspection.id}`)

    // Sent once each; completing again queues nothing new and a rerun sends nothing.
    await db.$transaction((tx) => queueSignedCopies(tx, deal.inspection.id))
    await deliverReportEmails(500)
    const copies = (await emails(deal.inspection.id)).filter((row) => row.kind === 'SIGNED_COPY')
    expect(copies).toHaveLength(3)
    expect(copies.every((row) => row.sentAt && row.error === null)).toBe(true)
    expect(vi.mocked(sendSignedCopy).mock.calls).toHaveLength(3)
  })

  it('hands the signed PDF from the signing page to the two parties only, once countersigned', async () => {
    const deal = await readyToSend()
    const outsider = await person('Stranger', 'pdf-stranger')
    const download = async (inspectionId: string, as: Stakeholder | null) => {
      vi.mocked(currentStakeholder).mockResolvedValueOnce(as)
      return signedPdf(new Request(`https://kivilo.test/sign/${inspectionId}/pdf`), {
        params: Promise.resolve({ inspectionId }),
      })
    }
    const refusal = async (response: Response) => [response.status, await response.text()]
    const missing = await refusal(await download('cmnope00000000000000000', deal.landlord))
    expect(missing).toEqual([404, 'Not found'])

    // Sent and half signed: nothing to download yet, even for a party.
    await sent(deal)
    asAgent(deal.agent)
    await signInspection(deal.inspection.id, deal.tenant.id, png)
    expect(await refusal(await download(deal.inspection.id, deal.tenant))).toEqual(missing)

    asSigner(deal.landlord)
    await signOwnReport(deal.inspection.id, png)
    for (const party of [deal.landlord, deal.tenant]) {
      const response = await download(deal.inspection.id, party)
      expect(response.status).toBe(303)
      expect(response.headers.get('location')).toMatch(
        new RegExp(`^https://storage\\.test/reports/${deal.inspection.id}/[0-9a-f]+\\.pdf$`),
      )
    }
    // The agent has their own way in; a stranger and the signed out are a missing report.
    for (const someone of [deal.agent, outsider, null]) {
      expect(await refusal(await download(deal.inspection.id, someone))).toEqual(missing)
    }
  })

  it.each(['before delivery', 'while downloading the PDF'])('withdraws a queued signed copy when its former conductor loses access %s', async (revokedAt) => {
    const deal = await readyToSend()
    const colleague = await person('Former collaborator', 'revoked-conductor')
    await db.tenancyCollaborator.create({ data: {
      tenancyId: deal.inspection.tenancyId, stakeholderId: colleague.id, grantedById: deal.agent.id,
    } })
    await db.inspection.update({ where: { id: deal.inspection.id }, data: {
      status: 'COMPLETED', conductedById: colleague.id,
    } })
    await db.$transaction((tx) => queueSignedCopies(tx, deal.inspection.id))
    expect((await emails(deal.inspection.id)).some((row) => row.recipientId === colleague.id)).toBe(true)
    const revoke = () => db.tenancyCollaborator.deleteMany({ where: {
      tenancyId: deal.inspection.tenancyId, stakeholderId: colleague.id,
    } })
    if (revokedAt === 'before delivery') await revoke()
    else vi.mocked(downloadCapture).mockImplementationOnce(async () => {
      await revoke()
      return new Uint8Array([37, 80, 68, 70])
    })
    // Make the colleague's copy the first to fetch this PDF, so revocation during
    // the download cannot pass merely because a party already primed the cache.
    await db.reportEmail.updateMany({
      where: { recipientId: { not: colleague.id }, sentAt: null },
      data: { retryAt: new Date('2100-01-01') },
    })
    const result = await deliverReportEmails(500)
    expect(result.withdrawn).toBe(1)
    expect(vi.mocked(sendSignedCopy).mock.calls.map(([to]) => to)).not.toContain(colleague.email)
    expect((await emails(deal.inspection.id)).some((row) => row.recipientId === colleague.id)).toBe(false)
    await db.$transaction((tx) => queueSignedCopies(tx, deal.inspection.id))
    expect((await emails(deal.inspection.id)).map((row) => row.recipientId)).toContain(deal.agent.id)
    expect((await emails(deal.inspection.id)).some((row) => row.recipientId === colleague.id)).toBe(false)
  })
})
