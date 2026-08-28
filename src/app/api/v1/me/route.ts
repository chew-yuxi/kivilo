import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

/// The native client calls this once after sign-in to confirm the token resolves to a
/// Stakeholder, which is also what creates one on a first-ever sign-in.
export const GET = authed(async (agent) => ({
  id: agent.id,
  name: agent.name,
  email: agent.email,
}))
