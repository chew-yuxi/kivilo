import { describe, expect, it } from 'vitest'
import { extractionSchema, diffSchema } from './schema'

/// These schemas are the contract at the AI boundary. If the model returns something
/// outside them, the pipeline must reject it rather than write garbage into a report
/// that two people are about to countersign.

const validItem = {
  name: 'Built-in wardrobe',
  category: 'FIXTURE',
  condition: 'GOOD',
  quantity: 1,
  notes: 'Minor scuff on the lower left door.',
  meterReading: null,
  sourceTimestampSec: 142,
  confidence: 0.9,
}

describe('extractionSchema', () => {
  it('accepts a well-formed room with one item', () => {
    const result = extractionSchema.safeParse({
      summary: 'Two-bedroom unit in good condition.',
      transcript: 'This is the master bedroom...',
      rooms: [{ name: 'Master bedroom', items: [validItem] }],
    })
    expect(result.success).toBe(true)
  })

  it('defaults quantity to 1 when the model omits it', () => {
    const withoutQuantity: Record<string, unknown> = { ...validItem }
    delete withoutQuantity.quantity
    const result = extractionSchema.parse({
      summary: '',
      transcript: '',
      rooms: [{ name: 'Kitchen', items: [withoutQuantity] }],
    })
    expect(result.rooms[0].items[0].quantity).toBe(1)
  })

  it('rejects a condition outside the fixed set', () => {
    const result = extractionSchema.safeParse({
      summary: '',
      transcript: '',
      rooms: [{ name: 'Kitchen', items: [{ ...validItem, condition: 'PRETTY_BAD' }] }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects a confidence outside 0–1', () => {
    const result = extractionSchema.safeParse({
      summary: '',
      transcript: '',
      rooms: [{ name: 'Kitchen', items: [{ ...validItem, confidence: 1.4 }] }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects a negative video timestamp', () => {
    const result = extractionSchema.safeParse({
      summary: '',
      transcript: '',
      rooms: [{ name: 'Kitchen', items: [{ ...validItem, sourceTimestampSec: -3 }] }],
    })
    expect(result.success).toBe(false)
  })

  it('accepts a meter reading as free text, since units vary', () => {
    const result = extractionSchema.parse({
      summary: '',
      transcript: '',
      rooms: [
        {
          name: 'Utility cupboard',
          items: [
            {
              ...validItem,
              name: 'Electricity meter',
              category: 'METER',
              meterReading: '04821.3 kWh',
            },
          ],
        },
      ],
    })
    expect(result.rooms[0].items[0].meterReading).toBe('04821.3 kWh')
  })
})

describe('diffSchema', () => {
  const validFinding = {
    baselineItemRef: 'itm_1',
    itemRef: 'itm_9',
    changeType: 'DAMAGE',
    verdict: 'TENANT_LIABLE',
    rationale: 'Cigarette burn on the sofa arm, absent at check-in.',
    estimatedCost: 240,
    confidence: 0.8,
  }

  it('accepts a finding that references both sides', () => {
    expect(diffSchema.safeParse({ summary: '', findings: [validFinding] }).success).toBe(true)
  })

  it('accepts a missing item, which has no check-out reference', () => {
    const result = diffSchema.safeParse({
      summary: '',
      findings: [{ ...validFinding, itemRef: null, changeType: 'MISSING' }],
    })
    expect(result.success).toBe(true)
  })

  it('accepts a newly present item, which has no baseline reference', () => {
    const result = diffSchema.safeParse({
      summary: '',
      findings: [{ ...validFinding, baselineItemRef: null, verdict: 'UNDECIDED' }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects a verdict outside the fixed set', () => {
    const result = diffSchema.safeParse({
      summary: '',
      findings: [{ ...validFinding, verdict: 'PROBABLY_FINE' }],
    })
    expect(result.success).toBe(false)
  })

  it('requires a rationale, because a verdict without one is not reviewable', () => {
    const withoutRationale: Record<string, unknown> = { ...validFinding }
    delete withoutRationale.rationale
    expect(diffSchema.safeParse({ summary: '', findings: [withoutRationale] }).success).toBe(
      false,
    )
  })
})
