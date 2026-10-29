import { authed } from '@/lib/api/route'
import { requestParticulars } from '@/lib/cdd/cases'

export const dynamic = 'force-dynamic'

/// Asks the client for their particulars and returns the link to send on WhatsApp too.
/// The link is not a credential: it opens a page the client must sign in to.
export const POST = authed(async (agent, { id }: { id: string }) => {
  const origin = process.env.KIVILO_APP_URL
  if (!origin) throw new Error('KIVILO_APP_URL must be set')
  const { path, emailed } = await requestParticulars(id, agent.id)
  return { url: new URL(path, origin).href, emailed }
})
