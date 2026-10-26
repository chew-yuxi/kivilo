import { notFound } from 'next/navigation'
import { requireStakeholder } from '@/lib/auth'
import { db } from '@/lib/db'
import { billingIncidentSchema } from '@/lib/billing-risk'

export function isAdmin(email: string | null) {
  const allowed = (process.env.ADMIN_EMAILS ?? '').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean)
  return email !== null && allowed.includes(email.toLowerCase())
}

export async function requireAdmin() {
  const person = await requireStakeholder()
  if (!isAdmin(person.email)) notFound()
  return person
}

export async function adminBillingIncidents() {
  await requireAdmin()
  const events = await db.errorEvent.findMany({
    where: { context: 'stripe_billing' },
    orderBy: { occurredAt: 'desc' },
    take: 50,
    select: { id: true, message: true, occurredAt: true },
  })
  return events.map((event) => {
    const details = billingIncidentSchema.parse(JSON.parse(event.message))
    return {
      id: event.id,
      occurredAt: event.occurredAt,
      ...details,
      dashboardUrl: `https://dashboard.stripe.com/${details.livemode ? '' : 'test/'}${
        details.type === 'charge.dispute.created' ? `disputes/${details.objectId}` : `payments/${details.paymentIntentId}`
      }`,
    }
  })
}
