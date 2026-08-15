import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { supabaseServer } from '@/lib/supabase/server'
import type { Prisma, Stakeholder } from '@/generated/prisma'

/// This module is the authorization boundary. The proxy does an optimistic redirect so
/// signed-out visitors are not shown a loading shell, but it is not a security control:
/// every read and write goes through `requireAgent` and a scope filter here.

/// The signed-in agent, or null. Uses `getUser`, which verifies the JWT with the auth
/// server, rather than `getSession`, which trusts whatever is in the cookie.
export async function currentAgent(): Promise<Stakeholder | null> {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

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

  return db.stakeholder.create({
    data: {
      name: user.email?.split('@')[0] ?? 'Agent',
      email: user.email ?? null,
      authUserId: user.id,
    },
  })
}

export async function requireAgent(): Promise<Stakeholder> {
  const agent = await currentAgent()
  if (!agent) redirect('/login')
  return agent
}

/// The scope every inspection query is filtered by. An agent sees a deal they are the
/// agent on, or an inspection they personally conducted. Nothing else.
export function inspectionScope(agentId: string): Prisma.InspectionWhereInput {
  return {
    OR: [{ tenancy: { agentId } }, { conductedById: agentId }],
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

/// Resolves a room to its inspection and authorizes that, so a room id from the client
/// cannot reach across into another agent's deal.
export async function authorizeRoom(roomId: string, agentId: string) {
  const room = await db.room.findUnique({
    where: { id: roomId },
    select: { id: true, inspectionId: true },
  })
  if (!room) throw new Error('Room not found')
  await authorizeInspection(room.inspectionId, agentId)
  return room
}
