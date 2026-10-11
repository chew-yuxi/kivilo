import { describe, expect, it } from 'vitest'
import { validateDiff } from './diff'
import type { Diff } from './schema'

const item = (ref: string, name: string, condition: string, identifier: string | null = null) => ({
  ref, room: 'Synthetic room', name, category: 'APPLIANCE', condition,
  quantity: 1, notes: null, identifier, meterReading: null,
})

const finding = (
  baselineItemRef: string,
  itemRef: string | null,
  changeType: Diff['findings'][number]['changeType'],
  verdict: Diff['findings'][number]['verdict'] = 'UNDECIDED',
): Diff['findings'][number] => ({
  baselineItemRef, itemRef, changeType, verdict, rationale: 'Synthetic comparison for review.',
  estimatedCost: null, confidence: 0.8,
})

describe('check-out draft validation', () => {
  const baseline = [
    item('b-fridge', 'Refrigerator', 'GOOD', 'FR-100'),
    item('b-lamp', 'Bedside lamp', 'GOOD', 'LAMP-001'),
    item('b-sink', 'Washbasin', 'GOOD'),
  ]
  const current = [
    item('c-fridge', 'Refrigerator', 'GOOD', 'FR-999'),
    item('c-sink', 'Washbasin', 'GOOD'),
  ]

  it('retains a changed serial and missing item while dropping an unchanged line', () => {
    const draft: Diff = { summary: 'Synthetic draft', findings: [
      finding('b-fridge', 'c-fridge', 'DAMAGE'),
      finding('b-lamp', null, 'MISSING'),
      finding('b-sink', 'c-sink', 'UNCHANGED'),
    ] }

    expect(validateDiff({ baseline, current }, draft).findings).toEqual(draft.findings.slice(0, 2))
  })

  it('rejects a changed serial labelled unchanged or blamed on the tenant', () => {
    for (const wrong of [
      finding('b-fridge', 'c-fridge', 'UNCHANGED'),
      finding('b-fridge', 'c-fridge', 'DAMAGE', 'TENANT_LIABLE'),
    ]) {
      expect(() => validateDiff({ baseline, current }, {
        summary: 'Synthetic draft', findings: [wrong, finding('b-lamp', null, 'MISSING')],
      })).toThrow('AI draft failed validation')
    }
  })

  it('rejects an omitted or liability-assigned missing item', () => {
    for (const findings of [
      [finding('b-fridge', 'c-fridge', 'DAMAGE')],
      [finding('b-fridge', 'c-fridge', 'DAMAGE'), finding('b-lamp', null, 'MISSING', 'TENANT_LIABLE')],
    ]) {
      expect(() => validateDiff({ baseline, current }, { summary: 'Synthetic draft', findings }))
        .toThrow('AI draft failed validation')
    }
  })

  it('rejects an omitted condition change on a unique item', () => {
    const before = [item('b-paint', 'Wall paint', 'GOOD')]
    const after = [item('c-paint', 'Wall paint', 'FAIR')]
    expect(() => validateDiff({ baseline: before, current: after }, {
      summary: 'Synthetic draft', findings: [],
    })).toThrow('AI draft failed validation')
  })
})
