import { cache } from 'react'
import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { createClient, type User } from '@supabase/supabase-js'
import { db } from '@/lib/db'
import { supabaseServer } from '@/lib/supabase/server'
import { Prisma, type Stakeholder } from '@/generated/prisma'
import { acquisitionForVerifiedUser } from '@/lib/acquisition'
import { ACQUISITION_COOKIE } from '@/lib/acquisition-keys'

/// This module is the authorization boundary. The proxy does an optimistic redirect so
/// signed-out visitors are not shown a loading shell, but it is not a security control:
/// every read and write goes through `requireStakeholder` and a scope filter here.

/// The signed-in agent, or null. Uses `getUser`, which verifies the JWT with the auth
/// server, rather than `getSession`, which trusts whatever is in the cookie.
/// The one place the signed-in agent is resolved, whatever the client. A browser sends
/// a session cookie; a native client sends its access token in an Authorization header.
/// Both are verified against the auth server and both land on the same Stakeholder, so
/// every server action works unchanged from either, and there is one boundary rather
/// than a second one bolted on for the app.
///
/// A header cannot be used to escalate: presenting a valid token for a user is what
/// being that user means, and an invalid one resolves to nobody.
///
/// Memoized per request, because a page render resolves the agent in the layout and
/// again in the page, and each resolution is a round trip to the auth server.
export const currentStakeholder = cache(async (): Promise<Stakeholder | null> => {
  const bearer = (await headers()).get('authorization')
  if (bearer) return agentFromBearer(bearer)

  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  return resolveAgent(user, 'WEB')
})

/// The same boundary reached by a different transport. A native client holds an access
/// token rather than a cookie, and `getUser(jwt)` verifies it with a request to the auth
/// server exactly as the cookie path does, so this is not a weaker check. Everything
/// below it, `inspectionScope` and the `authorize*` helpers, is shared, which is what
/// stops a second client becoming a second authorization boundary.
export async function agentFromBearer(authorization: string | null): Promise<Stakeholder | null> {
  const token = authorization?.match(/^Bearer (.+)$/i)?.[1]
  if (!token) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return resolveAgent(user, 'NATIVE')
}

/// Turns a verified Supabase user into the Stakeholder row the rest of the app scopes
/// by. Shared by both transports so a Flutter sign-in and a browser sign-in land on the
/// same person rather than creating two.
async function resolveAgent(user: User, entryPoint: 'WEB' | 'NATIVE'): Promise<Stakeholder> {
  const linked = await db.stakeholder.findUnique({ where: { authUserId: user.id } })
  if (linked) return linked

  const email = user.email?.trim().toLowerCase() ?? null
  const attribution = entryPoint === 'WEB' ? (await cookies()).get(ACQUISITION_COOKIE)?.value : undefined
  const acquisition = acquisitionForVerifiedUser(user, entryPoint, attribution)

  // Linking and its signup record commit together. A conditional claim prevents a
  // concurrent request from relinking a person, and every retry keeps first-touch
  // attribution unchanged. The verified Auth timestamp, not this mapping time or
  // Stakeholder.createdAt, determines the signup cohort.
  try {
    return await db.$transaction(async (tx) => {
      const winner = await tx.stakeholder.findUnique({ where: { authUserId: user.id } })
      if (winner) return winner

      if (email) {
        const claimed = await tx.stakeholder.updateMany({
          where: { email, authUserId: null },
          data: { authUserId: user.id },
        })
        if (claimed.count) {
          const person = await tx.stakeholder.findUniqueOrThrow({ where: { authUserId: user.id } })
          if (acquisition) await tx.accountAcquisition.create({ data: { stakeholderId: person.id, ...acquisition } })
          return person
        }
      }

      return tx.stakeholder.create({
        data: {
          name: email?.split('@')[0] ?? 'Agent',
          email,
          authUserId: user.id,
          ...(acquisition ? { acquisition: { create: acquisition } } : {}),
        },
      })
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const winner = await db.stakeholder.findUnique({ where: { authUserId: user.id } })
      if (winner) return winner
    }
    throw error
  }
}

export async function requireStakeholder(): Promise<Stakeholder> {
  const stakeholder = await currentStakeholder()
  if (!stakeholder) redirect('/login')
  return stakeholder
}

// Compatibility names for the inspection module. New cross-role modules use the
// stakeholder-neutral names above; removing these would turn M5 into an unrelated
// rewrite of the proven check-in path.
export const currentAgent = currentStakeholder
export const requireAgent = requireStakeholder

export type TenancyRole = 'LANDLORD' | 'TENANT' | 'AGENT'

/// The lead, invited collaborators and active agency managers work a tenancy. Billing
/// Team membership grants nothing; conducting an inspection is attribution only.
/// Every full tenancy permission goes through this. Migrated inspection-only grants
/// preserve their narrower scope separately in inspectionScope.
export function actsAsAgent(stakeholderId: string): Prisma.TenancyWhereInput {
  return {
    property: { trashedAt: null },
    OR: [
      managedTenancies(stakeholderId),
      { collaborators: { some: { stakeholderId } } },
    ],
  }
}

/// Management scope deliberately includes trash so restore can check the same owner.
/// Billing Team membership is never an authorization rule.
export function managedTenancies(stakeholderId: string): Prisma.TenancyWhereInput {
  return { OR: [
    { agentId: stakeholderId },
    { agency: { members: { some: { stakeholderId, status: 'ACTIVE', role: { in: ['OWNER', 'MANAGER'] } } } } },
  ] }
}

/// The responsible lead and an agency's managers may share and renew its records.
export function leadTenancies(stakeholderId: string): Prisma.TenancyWhereInput {
  return { AND: [managedTenancies(stakeholderId), { property: { trashedAt: null } }] }
}

/// Accept a transaction so ownership is rechecked while holding the tenancy row lock.
export async function authorizeLeadTenancy(
  tenancyId: string,
  stakeholderId: string,
  client: Prisma.TransactionClient = db,
) {
  const tenancy = await client.tenancy.findFirst({ where: { AND: [{ id: tenancyId }, leadTenancies(stakeholderId)] } })
  if (!tenancy) throw new Error('Tenancy not found')
  return tenancy
}

/// The tenancies someone works as an agent: while the tenancy runs, as with maintenance.
export function agentTenancies(stakeholderId: string, now = new Date()): Prisma.TenancyWhereInput {
  return { AND: [actsAsAgent(stakeholderId), { endDate: { gte: now } }] }
}

/// Renewal changes are for the tenancy's lead or collaborators. Being its landlord
/// or tenant alone never grants access to the agent's reminder or the next deal.
export async function authorizeAgentTenancy(tenancyId: string, stakeholderId: string) {
  const tenancy = await db.tenancy.findFirst({
    where: { AND: [{ id: tenancyId }, agentTenancies(stakeholderId)] },
    include: {
      property: true, landlord: true, tenant: true,
      renewedAs: { include: { inspections: { select: { id: true }, take: 1 } } },
      inspections: { where: { kind: 'CHECK_IN' }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })
  if (!tenancy) throw new Error('Tenancy not found')
  return tenancy
}

/// A landlord owns the durable property history, a tenant sees their own tenancy, and
/// an agent may manage maintenance only while the tenancy is active. The inspection
/// scope remains separate because completed reports have their own retention rules.
export function tenancyScope(stakeholderId: string, now = new Date()): Prisma.TenancyWhereInput {
  return {
    property: { trashedAt: null },
    OR: [
      { landlordId: stakeholderId },
      { tenantId: stakeholderId },
      agentTenancies(stakeholderId, now),
    ],
  }
}

/// Private supporting paperwork stays with the tenancy, including ended terms.
/// An old inspection grant grants no access to these separately submitted files.
export function supportingDocumentTenancies(stakeholderId: string): Prisma.TenancyWhereInput {
  return { property: { trashedAt: null }, OR: [
    { landlordId: stakeholderId }, { tenantId: stakeholderId }, actsAsAgent(stakeholderId),
  ] }
}

export async function authorizeTenancy(tenancyId: string, stakeholderId: string) {
  const tenancy = await db.tenancy.findFirst({
    where: { AND: [{ id: tenancyId }, tenancyScope(stakeholderId)] },
    include: { property: true, landlord: true, tenant: true, agent: true, collaborators: { select: { stakeholderId: true } } },
  })
  if (!tenancy) throw new Error('Tenancy not found')

  const role: TenancyRole = tenancy.landlordId === stakeholderId
    ? 'LANDLORD'
    : tenancy.tenantId === stakeholderId
      ? 'TENANT'
      : 'AGENT'
  return { tenancy, role }
}

/// Full tenancy access or an exact historical inspection grant. Attribution alone
/// grants nothing, and the lead can revoke either kind through Manage access.
export function inspectionScope(agentId: string): Prisma.InspectionWhereInput {
  return { tenancy: { property: { trashedAt: null } }, OR: [{ tenancy: actsAsAgent(agentId) }, { accessGrants: { some: { stakeholderId: agentId } } }] }
}

/// Access details accompany the inspection someone may open, including ended terms
/// and old inspection-only access. This is never authorization to work on the tenancy.
export function tenancyAccessScope(stakeholderId: string): Prisma.TenancyWhereInput {
  return { property: { trashedAt: null }, OR: [actsAsAgent(stakeholderId), { inspections: { some: { accessGrants: { some: { stakeholderId } } } } }] }
}

/// A queued message never outlives its recipient's current access. Exact historical
/// inspection grants do not admit tenancy repair messages or new sharing invitations.
export function notificationScope(stakeholderId: string): Prisma.NotificationWhereInput {
  return {
    recipientId: stakeholderId,
    recipient: { deletionRequests: { none: { status: { in: ['PROCESSING', 'COMPLETED'] } } } },
    AND: [{ OR: [{ tenancyId: null }, { tenancy: { property: { trashedAt: null } } }] }],
    OR: [
      { tenancyId: null, kind: { not: 'AGENCY_INVITATION' } },
      { kind: 'AGENCY_INVITATION', agencyMembership: { stakeholderId, status: 'INVITED', expiresAt: { gt: new Date() } } },
      { kind: 'PROPERTY_SHARED', tenancy: actsAsAgent(stakeholderId) },
      { kind: 'RENEWAL_DUE', tenancy: leadTenancies(stakeholderId) },
      { kind: { in: ['SUPPORTING_DOCUMENT_REQUESTED', 'SUPPORTING_DOCUMENT_UPLOADED'] }, tenancy: supportingDocumentTenancies(stakeholderId) },
      { kind: 'REPORT_UPDATED', tenancy: { OR: [
        { landlordId: stakeholderId }, { tenantId: stakeholderId }, actsAsAgent(stakeholderId),
      ] } },
      { kind: { notIn: ['PROPERTY_SHARED', 'RENEWAL_DUE', 'REPORT_UPDATED', 'SUPPORTING_DOCUMENT_REQUESTED', 'SUPPORTING_DOCUMENT_UPLOADED'] }, tenancy: tenancyScope(stakeholderId) },
    ],
  }
}

/// Loads an inspection the agent is allowed to see, or throws. Use this instead of a
/// bare findUnique anywhere an id arrives from the client, which is everywhere.
export async function authorizeInspection(
  inspectionId: string,
  agentId: string,
  options: { fullTenancyOnly?: boolean; client?: Prisma.TransactionClient } = {},
) {
  const inspection = await (options.client ?? db).inspection.findFirst({
    where: { AND: [{ id: inspectionId }, options.fullTenancyOnly ? { tenancy: actsAsAgent(agentId) } : inspectionScope(agentId)] },
    select: { id: true, status: true, kind: true, tenancyId: true, fullyFurnished: true, furnishingLevel: true },
  })
  if (!inspection) {
    // Same error whether it does not exist or belongs to someone else, so the API
    // cannot be used to discover which inspection ids are real.
    throw new Error('Inspection not found')
  }
  return inspection
}

/// The report is what the landlord and tenant agree to, so they read it from the moment
/// it is sent for signature, when `assertOpen` freezes it, alongside anyone
/// `inspectionScope` admits. Nothing earlier: the working inspection, with its drafts,
/// stays the agent's. Read-only: no mutation may authorize through this.
export async function authorizeReport(inspectionId: string, stakeholderId: string) {
  const inspection = await db.inspection.findFirst({
    where: {
      AND: [
        { id: inspectionId },
        { tenancy: { property: { trashedAt: null } } },
        {
          OR: [
            inspectionScope(stakeholderId),
            {
              status: { in: ['AWAITING_SIGNATURE', 'COMPLETED'] },
              tenancy: { OR: [{ landlordId: stakeholderId }, { tenantId: stakeholderId }] },
            },
          ],
        },
      ],
    },
    select: { id: true },
  })
  if (!inspection) throw new Error('Report not found')
  return inspection
}

/// A landlord or tenant signs their own tenancy's report, as themselves, while it awaits
/// signature. Usually the landlord, who is rarely at the handover. The signer is the
/// signed-in person, never an id from the request.
export async function authorizeOwnSignature(inspectionId: string, stakeholderId: string) {
  const inspection = await db.inspection.findFirst({
    where: {
      id: inspectionId,
      status: 'AWAITING_SIGNATURE',
      tenancy: { property: { trashedAt: null }, OR: [{ landlordId: stakeholderId }, { tenantId: stakeholderId }] },
    },
    select: { id: true, tenancyId: true },
  })
  if (!inspection) throw new Error('Report not found')
  return inspection
}

/// The role someone signs a report as on the signing page (`/sign/[inspectionId]`): the
/// landlord or tenant of its tenancy, from Send onwards, so they can sign it and then see
/// where it stands. Null for anyone else, the agent included, and for an id that does not
/// exist, which the page shows identically. The signature itself still goes through
/// `authorizeOwnSignature`.
export async function signingRole(inspectionId: string, stakeholderId: string) {
  const inspection = await db.inspection.findFirst({
    where: {
      id: inspectionId,
      status: { in: ['AWAITING_SIGNATURE', 'COMPLETED'] },
      tenancy: { property: { trashedAt: null }, OR: [{ landlordId: stakeholderId }, { tenantId: stakeholderId }] },
    },
    select: { tenancy: { select: { landlordId: true } } },
  })
  if (!inspection) return null
  return inspection.tenancy.landlordId === stakeholderId ? 'LANDLORD' as const : 'TENANT' as const
}

/// An addendum the agent may write and publish: one on an inspection `inspectionScope`
/// admits, including exact migrated grants. Never a landlord or tenant alone.
export async function authorizeAddendum(addendumId: string, agentId: string) {
  const addendum = await db.reportAddendum.findFirst({
    where: { id: addendumId, inspection: inspectionScope(agentId) },
    select: { id: true, inspectionId: true, publishedAt: true },
  })
  if (!addendum) throw new Error('Addendum not found')
  return addendum
}

/// A published addendum, read by anyone who may read its report once it is signed: the
/// agents `inspectionScope` admits, and the tenancy's landlord and tenant. A draft is
/// the agent's working copy and is outside this scope for everyone.
export function addendumReadScope(stakeholderId: string): Prisma.ReportAddendumWhereInput {
  return {
    publishedAt: { not: null },
    inspection: {
      tenancy: { property: { trashedAt: null } },
      OR: [
        inspectionScope(stakeholderId),
        { tenancy: { OR: [{ landlordId: stakeholderId }, { tenantId: stakeholderId }] } },
      ],
    },
  }
}

/// The landlord or tenant acknowledges a published addendum to their own tenancy's
/// report, as themselves. Like `authorizeOwnSignature`, the party is the signed-in
/// person, never an id from the request, and an agent is not a party.
export async function authorizeOwnAcknowledgement(addendumId: string, stakeholderId: string) {
  const addendum = await db.reportAddendum.findFirst({
    where: {
      id: addendumId,
      publishedAt: { not: null },
      disputedAt: null,
      inspection: { tenancy: { property: { trashedAt: null }, OR: [{ landlordId: stakeholderId }, { tenantId: stakeholderId }] } },
    },
    select: { id: true, inspectionId: true },
  })
  if (!addendum) throw new Error('Addendum not found')
  return addendum
}

/// Resolves a room to its inspection and authorizes that, so a room id from the client
/// cannot reach across into another agent's deal.
export async function authorizeRoom(roomId: string, agentId: string) {
  const room = await db.room.findUnique({
    where: { id: roomId },
    select: { id: true, inspectionId: true },
  })
  if (!room) throw new Error('Room not found')
  // Returned, not discarded: callers gate on the inspection's status and would
  // otherwise read it a second time on every capture.
  const inspection = await authorizeInspection(room.inspectionId, agentId)
  return { ...room, inspection }
}
