import { describe, expect, it } from 'vitest'
import {
  assertMaintenanceTransition,
  costShares,
  costStanding,
  createCaseInput,
  describeProposal,
  evidenceInput,
  proposalAnswerInput,
  proposalInput,
  repeatRepairThresholdReached,
} from '@/lib/maintenance'
import { Prisma } from '@/generated/prisma'

describe('maintenance rules', () => {
  it('requires the explicit workflow and a reason for no action', () => {
    expect(() => assertMaintenanceTransition('REPORTED', 'RESOLVED')).toThrow(
      'Invalid maintenance status transition',
    )
    expect(() => assertMaintenanceTransition('SCHEDULED', 'AWAITING_CONFIRMATION')).toThrow(
      'Invalid maintenance status transition',
    )
    expect(() => assertMaintenanceTransition('REPORTED', 'CLOSED_NO_ACTION')).toThrow(
      'requires a reason',
    )
    expect(() => assertMaintenanceTransition(
      'REPORTED',
      'CLOSED_NO_ACTION',
      'Building-wide shutdown',
    )).not.toThrow()
  })

  it('raises the repeat-repair signal at four completed visits', () => {
    expect(repeatRepairThresholdReached(3)).toBe(false)
    expect(repeatRepairThresholdReached(4)).toBe(true)
    expect(repeatRepairThresholdReached(9)).toBe(true)
  })

  it('validates idempotent cases and deterministic evidence registration', () => {
    expect(createCaseInput.parse({
      clientId: 'a18db5f2-05a4-4e14-a9bb-4756f8fef312',
      category: 'PLUMBING',
      title: 'Pipe leak',
      description: 'Water beneath the kitchen sink.',
    })).toMatchObject({ priority: 'ROUTINE', propertyAssetId: null })
    expect(() => evidenceInput.parse({
      clientId: 'not-a-uuid',
      purpose: 'BEFORE',
      storagePath: 'maintenance/case/file.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 10,
    })).toThrow()
  })

  it('states a proposal in one sentence both sides read the same way', () => {
    expect(describeProposal({ arrangedBy: 'LANDLORD', payer: 'SHARED', tenantCap: '150.00' }))
      .toBe('Tenant pays the first S$150.00, landlord pays the rest. Landlord arranges the repair.')
    expect(describeProposal({ arrangedBy: 'TENANT', payer: 'TENANT', tenantCap: null }))
      .toBe('Tenant pays. Tenant arranges the repair.')
  })

  it('splits the recorded cost without ever charging the tenant past the cap', () => {
    const total = (value: string) => new Prisma.Decimal(value)
    const shared = { payer: 'SHARED' as const, tenantCap: '150' }
    expect(costShares(shared, total('420'))).toEqual({ total: '420.00', tenant: '150.00', landlord: '270.00' })
    expect(costShares(shared, total('80.50'))).toEqual({ total: '80.50', tenant: '80.50', landlord: '0.00' })
    expect(costShares({ payer: 'LANDLORD', tenantCap: null }, total('420')))
      .toEqual({ total: '420.00', tenant: '0.00', landlord: '420.00' })
    expect(costShares({ payer: 'TENANT', tenantCap: null }, total('420')))
      .toEqual({ total: '420.00', tenant: '420.00', landlord: '0.00' })
  })

  it('requires a cap on a shared split only, and a reason to reject', () => {
    const base = { arrangedBy: 'LANDLORD', basis: 'MINOR_REPAIR_CLAUSE', reason: 'Clause 5(c)' }
    expect(() => proposalInput.parse({ ...base, payer: 'SHARED' })).toThrow('tenant pays')
    expect(() => proposalInput.parse({ ...base, payer: 'LANDLORD', tenantCap: '150' })).toThrow('tenant pays')
    expect(proposalInput.parse({ ...base, payer: 'SHARED', tenantCap: '150' }))
      .toMatchObject({ tenantCap: '150', clauseRef: null })
    expect(() => proposalAnswerInput.parse({ decision: 'REJECT' })).toThrow()
    expect(proposalAnswerInput.parse({ decision: 'ACCEPT' })).toEqual({ decision: 'ACCEPT', note: null })
  })

  it('flags every repair cost that check-out still has to settle', () => {
    expect(costStanding('CLOSED_NO_ACTION', [])).toBeNull()
    expect(costStanding('RESOLVED', [])).toBe('NOT_PROPOSED')
    expect(costStanding('RESOLVED', [{ status: 'WITHDRAWN' }])).toBe('NOT_PROPOSED')
    expect(costStanding('ACKNOWLEDGED', [{ status: 'REJECTED' }, { status: 'PENDING' }])).toBe('PENDING')
    expect(costStanding('RESOLVED', [{ status: 'PENDING' }, { status: 'REJECTED' }])).toBe('DISPUTED')
    expect(costStanding('RESOLVED', [{ status: 'ACCEPTED' }, { status: 'REJECTED' }])).toBe('AGREED')
  })
})
