import { afterAll, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'

/// A landlord or tenant is one person across every deal that names them. Sign-in links
/// a login to the one Stakeholder holding that verified address, so a second row for the
/// same person would be a deal they can never see. These tests pin that a new deal finds
/// the person already on file instead of making another.

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn() }
})

import { db } from '@/lib/db'
import { requireAgent, tenancyScope } from '@/lib/auth'
import { createInspection } from '@/lib/actions'

const postalCode = '993333'
const tag = randomUUID().slice(0, 8)
const created: string[] = []

async function agent(name: string) {
  // Comped onto Pro: some tests make several deals with one agent, past Free's limit,
  // which is not what these tests are about.
  const person = await db.stakeholder.create({
    data: {
      name: `${name} ${tag}`,
      subscription: { create: { plan: 'PRO', seats: 1, status: 'comped' } },
    },
  })
  created.push(person.id)
  return person
}

async function deal(by: { id: string }, parties: {
  landlordName?: string
  landlordEmail?: string | null
  tenantName?: string
  tenantEmail?: string | null
}) {
  vi.mocked(requireAgent).mockResolvedValueOnce(by as never)
  const id = await createInspection({
    line1: `Deal parties ${tag}`,
    unit: null,
    postalCode,
    propertyType: 'PRIVATE_NON_LANDED',
    landlordName: parties.landlordName ?? 'Landlord',
    landlordEmail: parties.landlordEmail ?? null,
    tenantName: parties.tenantName ?? 'Tenant',
    tenantEmail: parties.tenantEmail ?? null,
    startDate: '2026-01-01',
    endDate: '2027-01-01',
    monthlyRent: '3000',
    deposit: '6000',
  })
  const { tenancy } = await db.inspection.findUniqueOrThrow({ where: { id }, include: { tenancy: true } })
  created.push(tenancy.landlordId, tenancy.tenantId)
  return tenancy
}

describe('deal parties', () => {
  afterAll(async () => {
    await db.property.deleteMany({ where: { postalCode } })
    await db.stakeholder.deleteMany({ where: { id: { in: created } } })
    await db.$disconnect()
  })

  it('puts a landlord named on two deals onto both, whoever created them', async () => {
    const email = `landlord-${tag}@example.com`
    const first = await deal(await agent('Agent one'), { landlordEmail: email })
    const second = await deal(await agent('Agent two'), { landlordEmail: ` ${email.toUpperCase()} ` })

    expect(second.landlordId).toBe(first.landlordId)
    const theirs = await db.tenancy.findMany({ where: tenancyScope(first.landlordId), select: { id: true } })
    expect(theirs.map((t) => t.id).sort()).toEqual([first.id, second.id].sort())
  })

  it('puts someone who already signed in onto a new deal that names them', async () => {
    const person = await db.stakeholder.create({
      data: { name: `Signed in ${tag}`, email: `tenant-${tag}@example.com`, authUserId: randomUUID() },
    })
    created.push(person.id)

    const tenancy = await deal(await agent('Agent three'), { tenantEmail: person.email })

    expect(tenancy.tenantId).toBe(person.id)
  })

  it('refuses one email for both the landlord and the tenant', async () => {
    const email = `both-${tag}@example.com`
    await expect(
      deal(await agent('Agent four'), { landlordEmail: email, tenantEmail: email.toUpperCase() }),
    ).rejects.toThrow('The landlord and tenant need different email addresses')
  })

  it('keeps parties without an email as separate people, even with the same name', async () => {
    const by = await agent('Agent five')
    const first = await deal(by, { landlordName: 'Tan Wei Ming' })
    const second = await deal(by, { landlordName: 'Tan Wei Ming' })

    expect(second.landlordId).not.toBe(first.landlordId)
  })
})
