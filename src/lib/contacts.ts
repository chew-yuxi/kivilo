import { db } from '@/lib/db'
import { actsAsAgent } from '@/lib/auth'

/// Landlords and tenants this account already works with, for New check-in's people
/// fields: the parties on tenancies it acts on as an agent, the same people and emails
/// its property pages already show it. Never a search of every person in Kivilo, and
/// never through an old report grant. Choosing one fills the form; the verified-email
/// rule in `createInspection` decides who the person is, and a name typed by another
/// agent never renames anyone.
export const CONTACT_LIMIT = 300

export async function contactSuggestions(actorId: string) {
  const tenancies = await db.tenancy.findMany({
    where: actsAsAgent(actorId),
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    select: {
      landlord: { select: { id: true, name: true, email: true } },
      tenant: { select: { id: true, name: true, email: true } },
    },
  })
  const contacts = new Map<string, { name: string; email: string | null; roles: Set<'LANDLORD' | 'TENANT'> }>()
  for (const tenancy of tenancies) {
    for (const [role, person] of [['LANDLORD', tenancy.landlord], ['TENANT', tenancy.tenant]] as const) {
      const contact = contacts.get(person.id) ?? { name: person.name, email: person.email, roles: new Set() }
      contact.roles.add(role)
      contacts.set(person.id, contact)
    }
  }
  // Most recent tenancy first, so the people in current work lead the list.
  return [...contacts.values()].slice(0, CONTACT_LIMIT).map((contact) => ({
    name: contact.name,
    email: contact.email,
    roles: [...contact.roles],
  }))
}
