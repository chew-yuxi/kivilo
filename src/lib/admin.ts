import { notFound } from 'next/navigation'
import { requireStakeholder } from '@/lib/auth'

export function isAdmin(email: string | null) {
  const allowed = (process.env.ADMIN_EMAILS ?? '').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean)
  return email !== null && allowed.includes(email.toLowerCase())
}

export async function requireAdmin() {
  const person = await requireStakeholder()
  if (!isAdmin(person.email)) notFound()
  return person
}
