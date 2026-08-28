import { z } from 'zod'

/// Marks the inspector draws over a photo: a ring around the chip, an arrow at the
/// crack. They are stored as geometry, never burned into the stored object, because the
/// capture is the evidence and a report whose photographs have been rewritten is worth
/// less than one whose photographs have not. The same numbers re-render on the phone,
/// on the review screen and in the landlord's report.

const unit = z.number().min(0).max(1)

export const markSchema = z.discriminatedUnion('shape', [
  z.object({ shape: z.literal('ring'), cx: unit, cy: unit, rx: unit, ry: unit }),
  /// Head is the end that touches the defect; tail is where the inspector's finger
  /// ended up, out in open space where the arrow can be seen.
  z.object({ shape: z.literal('arrow'), tx: unit, ty: unit, hx: unit, hy: unit }),
])

/// What the phone sends. `w` and `h` are the upright intrinsic pixels of the image the
/// marks were drawn against, which is what the normalized coordinates mean.
/// Shared with the editor. If the client could author more than the server accepts, a
/// queued capture carrying too many would fail validation on every upload attempt and
/// never leave the phone.
export const MAX_MARKS = 12

export const annotationInputSchema = z.object({
  w: z.number().int().positive(),
  h: z.number().int().positive(),
  marks: z.array(markSchema).min(1).max(MAX_MARKS),
})

/// Provenance is added by the server. A client never authors its own.
export const storedAnnotationsSchema = annotationInputSchema.extend({
  v: z.literal(1),
  by: z.string(),
  at: z.string(),
})

export type Mark = z.infer<typeof markSchema>
export type AnnotationInput = z.infer<typeof annotationInputSchema>
export type StoredAnnotations = z.infer<typeof storedAnnotationsSchema>

/// Postgres does not validate a JSON column, so every read parses. A row written by an
/// older shape reads as null rather than throwing, because the alternative is a
/// landlord's report failing to render over a mark.
export function toAnnotations(value: unknown): StoredAnnotations | null {
  return storedAnnotationsSchema.safeParse(value).data ?? null
}

/// In viewBox units, so a mark is the same fraction of the photo on a phone, in the
/// report and on paper. Deliberately not `vector-effect: non-scaling-stroke`, which
/// would make the ring hairline-thin on a large render and fat on a thumbnail.
export function strokeWidth(w: number, h: number) {
  return Math.max(6, Math.min(w, h) / 100)
}

/// Normalizes one axis of a point in viewBox units. Clamped on the client so a drag
/// that runs off the edge of the frame is trimmed rather than failing validation on the
/// server; rounded to four places, which is sub-pixel on a 2048px photo and halves the
/// stored JSON.
export function toUnit(value: number, extent: number) {
  return Math.min(1, Math.max(0, Math.round((value / extent) * 1e4) / 1e4))
}

/// One path per mark, in viewBox units, drawn twice by the renderers: once fat and
/// white as a halo, once thin and red on top. `fill="none"` throughout, so a ring reads
/// over a white worktop and over a dark cabinet alike and the halo is what carries the
/// mark through a greyscale print.
export function markPath(mark: Mark, w: number, h: number): string {
  const r = (n: number) => Math.round(n * 100) / 100

  if (mark.shape === 'ring') {
    const cx = mark.cx * w
    const cy = mark.cy * h
    // A degenerate ring would render as nothing at all; give it something to draw.
    const rx = Math.max(mark.rx * w, 1)
    const ry = Math.max(mark.ry * h, 1)
    return (
      `M ${r(cx - rx)} ${r(cy)}` +
      ` a ${r(rx)} ${r(ry)} 0 1 0 ${r(rx * 2)} 0` +
      ` a ${r(rx)} ${r(ry)} 0 1 0 ${r(-rx * 2)} 0`
    )
  }

  const tx = mark.tx * w
  const ty = mark.ty * h
  const hx = mark.hx * w
  const hy = mark.hy * h
  const angle = Math.atan2(hy - ty, hx - tx)
  const head = strokeWidth(w, h) * 4
  const spread = 0.45
  return (
    `M ${r(tx)} ${r(ty)} L ${r(hx)} ${r(hy)}` +
    ` M ${r(hx - head * Math.cos(angle - spread))} ${r(hy - head * Math.sin(angle - spread))}` +
    ` L ${r(hx)} ${r(hy)}` +
    ` L ${r(hx - head * Math.cos(angle + spread))} ${r(hy - head * Math.sin(angle + spread))}`
  )
}
