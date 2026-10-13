import { cache } from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { db } from '@/lib/db'
import { supabaseServer } from '@/lib/supabase/server'
import { Prisma, type Stakeholder } from '@/generated/prisma'

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
  return resolveAgent(user)
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
  return resolveAgent(user)
}

/// Turns a verified Supabase user into the Stakeholder row the rest of the app scopes
/// by. Shared by both transports so a Flutter sign-in and a browser sign-in land on the
/// same person rather than creating two.
async function resolveAgent(user: { id: string; email?: string | null }): Promise<Stakeholder> {
  const linked = await db.stakeholder.findUnique({ where: { authUserId: user.id } })
  if (linked) return linked

  // First sign-in. Claim an existing stakeholder with this address if one is waiting,
  // so an agent already named on a deal keeps their identity and their tenancies
  // rather than becoming a duplicate. Supabase has verified the address by OTP, so
  // holding the mailbox is what proves the claim.
  if (user.email) {
    const unclaimed = await db.stakeholder.findFirst({
      where: { email: user.email, authUserId: null },
    })
    if (unclaimed) {
      return db.stakeholder.update({
        where: { id: unclaimed.id },
        data: { authUserId: user.id },
      })
    }
  }

  // The layout and the page both resolve the agent, in parallel, on the same first
  // request, so two of these can race to insert. Prisma's upsert is not atomic under
  // the driver adapter, so the loser is caught on the unique index and reads the
  // winner's row instead.
  try {
    return await db.stakeholder.create({
      data: {
        name: user.email?.split('@')[0] ?? 'Agent',
        email: user.email ?? null,
        authUserId: user.id,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return db.stakeholder.findUniqueOrThrow({ where: { authUserId: user.id } })
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

/// The agents who stand where `stakeholderId` does: themselves, and everyone on their
/// team. Small teams cover each other's handovers and check-outs, so a teammate acts on a
/// deal exactly as its own agent would. Every agent rule goes through this.
function actsAsAgent(stakeholderId: string): Prisma.TenancyWhereInput {
  return {
    OR: [
      { agentId: stakeholderId },
      { agent: { team: { members: { some: { id: stakeholderId } } } } },
    ],
  }
}

/// The tenancies someone works as an agent: while the tenancy runs, as with maintenance.
export function agentTenancies(stakeholderId: string, now = new Date()): Prisma.TenancyWhereInput {
  return { AND: [actsAsAgent(stakeholderId), { endDate: { gte: now } }] }
}

/// A landlord owns the durable property history, a tenant sees their own tenancy, and
/// an agent may manage maintenance only while the tenancy is active. The inspection
/// scope remains separate because completed reports have their own retention rules.
export function tenancyScope(stakeholderId: string, now = new Date()): Prisma.TenancyWhereInput {
  return {
    OR: [
      { landlordId: stakeholderId },
      { tenantId: stakeholderId },
      agentTenancies(stakeholderId, now),
    ],
  }
}

export async function authorizeTenancy(tenancyId: string, stakeholderId: string) {
  const tenancy = await db.tenancy.findFirst({
    where: { AND: [{ id: tenancyId }, tenancyScope(stakeholderId)] },
    include: { property: true, landlord: true, tenant: true, agent: true },
  })
  if (!tenancy) throw new Error('Tenancy not found')

  const role: TenancyRole = tenancy.landlordId === stakeholderId
    ? 'LANDLORD'
    : tenancy.tenantId === stakeholderId
      ? 'TENANT'
      : 'AGENT'
  return { tenancy, role }
}

/// The scope every inspection query is filtered by. An agent sees a deal they or a
/// teammate are the agent on, or an inspection they personally conducted. Nothing else.
export function inspectionScope(agentId: string): Prisma.InspectionWhereInput {
  return {
    OR: [{ tenancy: actsAsAgent(agentId) }, { conductedById: agentId }],
  }
}

/// Loads an inspection the agent is allowed to see, or throws. Use this instead of a
/// bare findUnique anywhere an id arrives from the client, which is everywhere.
export async function authorizeInspection(inspectionId: string, agentId: string) {
  const inspection = await db.inspection.findFirst({
    where: { AND: [{ id: inspectionId }, inspectionScope(agentId)] },
    select: { id: true, status: true, kind: true, tenancyId: true },
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
      tenancy: { OR: [{ landlordId: stakeholderId }, { tenantId: stakeholderId }] },
    },
    select: { id: true, tenancyId: true },
  })
  if (!inspection) throw new Error('Report not found')
  return inspection
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
