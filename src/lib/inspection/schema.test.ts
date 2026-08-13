import { describe, expect, it } from 'vitest'
import { roomExtractionSchema, diffSchema } from './schema'

/// These schemas are the contract at the AI boundary. If the model returns something
/// outside them, the pipeline must reject it rather than write garbage into a report
/// that two people are about to countersign.

const validItem = {
  name: 'Built-in wardrobe',
  category: 'FIXTURE',
  condition: 'GOOD',
  quantity: 1,
  notes: 'Minor scuff on the lower left door.',
  identifier: null,
  meterReading: null,
  sourceCaptureRef: 'cap_1',
  sourceTimestampSec: 142,
  confidence: 0.9,
}

describe('roomExtractionSchema', () => {
  it('accepts a well-formed room with one item', () => {
    const result = roomExtractionSchema.safeParse({
      summary: 'Two-bedroom unit in good condition.',
      transcript: 'This is the master bedroom...',
      items: [validItem],
    })
    expect(result.success).toBe(true)
  })

  it('defaults quantity to 1 when the model omits it', () => {
    const withoutQuantity: Record<string, unknown> = { ...validItem }
    delete withoutQuantity.quantity
    const result = roomExtractionSchema.parse({
      summary: '',
      transcript: '',
      items: [withoutQuantity],
    })
    expect(result.items[0].quantity).toBe(1)
  })

  it('rejects a condition outside the fixed set', () => {
    const result = roomExtractionSchema.safeParse({
      summary: '',
      transcript: '',
      items: [{ ...validItem, condition: 'PRETTY_BAD' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects a confidence outside 0–1', () => {
    const result = roomExtractionSchema.safeParse({
      summary: '',
      transcript: '',
      items: [{ ...validItem, confidence: 1.4 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects a negative video timestamp', () => {
    const result = roomExtractionSchema.safeParse({
      summary: '',
      transcript: '',
      items: [{ ...validItem, sourceTimestampSec: -3 }],
    })
    expect(result.success).toBe(false)
  })

  it('carries an identifier through verbatim, including case and punctuation', () => {
    const result = roomExtractionSchema.parse({
      summary: '',
      transcript: '',
      items: [
        {
          ...validItem,
          name: 'Fridge',
          category: 'APPLIANCE',
          identifier: 'Samsung RF48A4000S9/SS · S/N 0KM74BDT200341N',
        },
      ],
    })
    expect(result.items[0].identifier).toBe('Samsung RF48A4000S9/SS · S/N 0KM74BDT200341N')
  })

  it('allows a null identifier, which is how an unreadable label is recorded', () => {
    const result = roomExtractionSchema.safeParse({
      summary: '',
      transcript: '',
      items: [{ ...validItem, identifier: null }],
    })
    expect(result.success).toBe(true)
  })

  it('allows a null timestamp, since a photo capture has no position in time', () => {
    const result = roomExtractionSchema.safeParse({
      summary: '',
      transcript: '',
      items: [{ ...validItem, sourceTimestampSec: null }],
    })
    expect(result.success).toBe(true)
  })

  it('requires a source capture ref, so every item points at its evidence', () => {
    const withoutRef: Record<string, unknown> = { ...validItem }
    delete withoutRef.sourceCaptureRef
    expect(
      roomExtractionSchema.safeParse({ summary: '', transcript: '', items: [withoutRef] })
        .success,
    ).toBe(false)
  })

  it('accepts a meter reading as free text, since units vary', () => {
    const result = roomExtractionSchema.parse({
      summary: '',
      transcript: '',
      items: [
        {
          ...validItem,
          name: 'Electricity meter',
          category: 'METER',
          meterReading: '04821.3 kWh',
        },
      ],
    })
    expect(result.items[0].meterReading).toBe('04821.3 kWh')
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
