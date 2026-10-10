import { describe, expect, it } from 'vitest'
import {
  assertMaintenanceTransition,
  createCaseInput,
  evidenceInput,
  repeatRepairThresholdReached,
} from '@/lib/maintenance'

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
})
