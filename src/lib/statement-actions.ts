'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { authorizeInspection, requireAgent, requireStakeholder } from '@/lib/auth'
import { db } from '@/lib/db'
import { assessmentSnapshotSchema, depositStatement } from '@/lib/assessment-schema'
import type { AcknowledgementMethod } from '@/generated/prisma'

/// Which version the party was shown, and their answer to it. Naming the version means
/// an answer given on a page opened before a revision cannot land on the revision.
const answerInput = z.discriminatedUnion('answer', [
  z.object({ version: z.number().int().positive(), answer: z.literal('AGREED') }),
  z.object({ version: z.number().int().positive(), answer: z.literal('DISPUTED'), reason: z.string().trim().min(1).max(2000) }),
])

/// The landlord or tenant answers the deposit statement as themselves. The party is the
/// signed-in person, never an id from the request, and an agent is not a party.
export async function answerDepositStatement(inspectionId: string, raw: unknown) {
  const party = await requireStakeholder()
  await recordAnswer(inspectionId, party.id, answerInput.parse(raw), 'OWN_ACCOUNT')
  revalidatePath(`/sign/${inspectionId}`)
  revalidatePath(`/inspections/${inspectionId}`)
}

/// A party answers on the agent's phone, as `signInspection` takes a signature, since a
/// check-out usually ends with everyone in the unit. The agent's session authorizes the
/// inspection; the party id comes from the request, so it is checked against the tenancy
/// under the lock, and anyone else reads like a missing statement.
export async function answerDepositStatementInPerson(inspectionId: string, stakeholderId: string, raw: unknown) {
  const agent = await requireAgent()
  await authorizeInspection(inspectionId, agent.id)
  await recordAnswer(inspectionId, z.string().min(1).parse(stakeholderId), answerInput.parse(raw), 'IN_PERSON')
  revalidatePath(`/sign/${inspectionId}`)
  revalidatePath(`/inspections/${inspectionId}`)
}

/// Both ways of answering end here. Only the latest version of a completed check-out's
/// assessment can be answered, only once per party, and only if it froze a deposit.
async function recordAnswer(
  inspectionId: string,
  stakeholderId: string,
  input: z.infer<typeof answerInput>,
  method: AcknowledgementMethod,
) {
  const ip = (await headers()).get('x-forwarded-for')
  await db.$transaction(async (tx) => {
    const latest = await tx.assessmentVersion.findFirst({
      where: {
        inspectionId,
        inspection: {
          kind: 'CHECK_OUT',
          status: 'COMPLETED',
          tenancy: { OR: [{ landlordId: stakeholderId }, { tenantId: stakeholderId }] },
        },
      },
      orderBy: { version: 'desc' },
      select: { id: true },
    })
    if (!latest) throw new Error('Statement not found')
    // Two answers from one party at once wait here, so the second is told it was
    // answered rather than hitting the unique index. An answer that crosses a revision
    // still lands on the version the party was shown, against that version's hash.
    await tx.$queryRaw`SELECT "id" FROM "AssessmentVersion" WHERE "id" = ${latest.id} FOR UPDATE`
    const version = await tx.assessmentVersion.findUniqueOrThrow({
      where: { id: latest.id },
      select: { id: true, version: true, snapshot: true, contentHash: true, responses: { select: { stakeholderId: true } } },
    })
    if (!depositStatement(assessmentSnapshotSchema.parse(version.snapshot))) throw new Error('Statement not found')
    if (version.version !== input.version) {
      throw new Error('A revised statement has been published since this page opened. Review it before answering.')
    }
    if (version.responses.some((response) => response.stakeholderId === stakeholderId)) {
      throw new Error('This statement has already been answered')
    }
    await tx.assessmentResponse.create({
      data: {
        assessmentVersionId: version.id,
        stakeholderId,
        answer: input.answer,
        reason: input.answer === 'DISPUTED' ? input.reason : null,
        method,
        contentHash: version.contentHash,
        ipAddress: ip,
      },
    })
  })
}
