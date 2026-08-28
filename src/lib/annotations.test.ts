import { describe, expect, it } from 'vitest'
import {
  MAX_MARKS,
  annotationInputSchema,
  markPath,
  strokeWidth,
  toAnnotations,
  toUnit,
  type StoredAnnotations,
} from './annotations'

const ring = { shape: 'ring' as const, cx: 0.5, cy: 0.5, rx: 0.1, ry: 0.1 }
const arrow = { shape: 'arrow' as const, tx: 0.1, ty: 0.1, hx: 0.4, hy: 0.4 }

const stored: StoredAnnotations = {
  v: 1,
  w: 1536,
  h: 2048,
  marks: [ring],
  by: 'agent_1',
  at: '2026-08-28T00:00:00.000Z',
}

/// Coordinate handling is the one part of this feature that fails invisibly: a mark
/// that lands two centimetres from the chip still looks like a mark. These are the
/// cheapest place to catch that.
describe('annotationInputSchema', () => {
  it('accepts a ring and an arrow', () => {
    expect(annotationInputSchema.safeParse({ w: 1536, h: 2048, marks: [ring, arrow] }).success).toBe(
      true,
    )
  })

  it('rejects coordinates outside the frame', () => {
    for (const cx of [-0.01, 1.01]) {
      expect(annotationInputSchema.safeParse({ w: 10, h: 10, marks: [{ ...ring, cx }] }).success).toBe(
        false,
      )
    }
  })

  it('rejects a payload with no marks or too many', () => {
    expect(annotationInputSchema.safeParse({ w: 10, h: 10, marks: [] }).success).toBe(false)
    expect(
      annotationInputSchema.safeParse({ w: 10, h: 10, marks: Array(MAX_MARKS).fill(ring) }).success,
    ).toBe(true)
    // The editor caps itself at the same number. If these drifted apart, a queued
    // capture carrying one mark too many would fail validation on every upload attempt
    // and never leave the phone.
    expect(
      annotationInputSchema.safeParse({ w: 10, h: 10, marks: Array(MAX_MARKS + 1).fill(ring) })
        .success,
    ).toBe(false)
  })

  it('rejects a non-integer or zero image size', () => {
    expect(annotationInputSchema.safeParse({ w: 0, h: 10, marks: [ring] }).success).toBe(false)
    expect(annotationInputSchema.safeParse({ w: 1536.5, h: 10, marks: [ring] }).success).toBe(false)
  })

  it('rejects an unknown shape', () => {
    expect(
      annotationInputSchema.safeParse({ w: 10, h: 10, marks: [{ shape: 'blob', cx: 0.5 }] }).success,
    ).toBe(false)
  })
})

describe('toAnnotations', () => {
  it('round-trips a stored record', () => {
    expect(toAnnotations(stored)).toEqual(stored)
  })

  /// A JSON column is unvalidated by Postgres, so anything can be in there. A report
  /// must render without marks rather than fail to render at all.
  it('is null for anything that is not a stored record', () => {
    for (const value of [null, undefined, {}, 'marks', 42, { ...stored, v: 0 }]) {
      expect(toAnnotations(value)).toBeNull()
    }
  })
})

describe('strokeWidth', () => {
  it('scales with the short edge', () => {
    expect(strokeWidth(1536, 2048)).toBeCloseTo(15.36, 5)
  })

  it('has a floor, so a small photo still gets a visible ring', () => {
    expect(strokeWidth(400, 300)).toBe(6)
  })
})

describe('toUnit', () => {
  /// The worked example from the spec: a chip at intrinsic pixel (1050, 700) of a
  /// 1536x2048 photo must come back to the same pixel when the mark is re-rendered.
  it('normalizes and denormalizes back to the same pixel', () => {
    const cx = toUnit(1050, 1536)
    const cy = toUnit(700, 2048)
    expect(cx).toBe(0.6836)
    expect(cy).toBe(0.3418)
    expect(cx * 1536).toBeCloseTo(1050, 1)
    expect(cy * 2048).toBeCloseTo(700, 1)
  })

  it('clamps a drag that ran off the edge of the frame', () => {
    expect(toUnit(-40, 1536)).toBe(0)
    expect(toUnit(2200, 2048)).toBe(1)
  })
})

describe('markPath', () => {
  it('draws a ring centred on its point, in viewBox units', () => {
    const d = markPath({ shape: 'ring', cx: 0.5, cy: 0.5, rx: 0.25, ry: 0.25 }, 1000, 800)
    // Starts at the left of the ellipse: cx - rx*w = 500 - 250 = 250, cy = 400.
    expect(d.startsWith('M 250 400')).toBe(true)
    expect(d).toContain('a 250 200')
  })

  it('draws an arrow from tail to head with a head at the defect end', () => {
    const d = markPath({ shape: 'arrow', tx: 0.1, ty: 0.1, hx: 0.5, hy: 0.5 }, 1000, 1000)
    expect(d.startsWith('M 100 100 L 500 500')).toBe(true)
    // Shaft, then a pen-up and a single two-segment barb drawn through the head, so
    // the head coordinate appears exactly twice and there are two subpaths.
    expect(d.split('L 500 500').length - 1).toBe(2)
    expect(d.split('M').length - 1).toBe(2)
  })

  it('gives a degenerate ring something to draw rather than nothing', () => {
    const d = markPath({ shape: 'ring', cx: 0.5, cy: 0.5, rx: 0, ry: 0 }, 1000, 800)
    expect(d).toContain('a 1 1')
  })
})
