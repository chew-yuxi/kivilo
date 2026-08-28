'use client'

import { useRef, useState } from 'react'
import { MarkPaths } from '@/components/mark-overlay'
import { toUnit, type Mark } from '@/lib/annotations'

export type Tool = 'ring' | 'arrow'

/// A tap rather than a drag, in CSS pixels. Measured on the raw pointer coordinates,
/// not in viewBox units, because what matters is how far the finger moved.
const TAP_SLOP = 12

/// A tapped ring is this fraction of the photo's short edge, which is about the size of
/// a chip on a worktop at arm's length.
const TAP_RADIUS = 0.09

/// The drawing surface. Controlled: the Viewer owns the marks so it can undo, discard
/// and save them as one write, and this only reports finished ones.
///
/// Pointer input goes through `getScreenCTM().inverse()` rather than
/// `getBoundingClientRect()`, which is what `signature-pad.tsx` uses. The rect is the
/// element's box, but the picture inside it is letterboxed by `preserveAspectRatio`,
/// so the rect would put every mark in the wrong place on any photo whose aspect does
/// not match its container. The CTM is the browser's own answer to the same question.
export function MarkEditor({
  w,
  h,
  marks,
  tool,
  onAdd,
}: {
  w: number
  h: number
  marks: Mark[]
  tool: Tool
  onAdd: (mark: Mark) => void
}) {
  const svg = useRef<SVGSVGElement>(null)
  const start = useRef<{ vx: number; vy: number; cx: number; cy: number; id: number } | null>(null)
  const [preview, setPreview] = useState<Mark | null>(null)

  /// viewBox units. Page zoom, letterboxing and the element's position are all already
  /// in the matrix.
  function at(event: React.PointerEvent) {
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      svg.current!.getScreenCTM()!.inverse(),
    )
    return { vx: point.x, vy: point.y }
  }

  function shape(from: { vx: number; vy: number }, to: { vx: number; vy: number }): Mark {
    if (tool === 'arrow') {
      // Head at touch-down so the precise end lands on the defect first, tail under the
      // moving finger so the arrow forms out into space where it can be seen.
      return {
        shape: 'arrow',
        hx: toUnit(from.vx, w),
        hy: toUnit(from.vy, h),
        tx: toUnit(to.vx, w),
        ty: toUnit(to.vy, h),
      }
    }
    // Inscribed in the drag's bounding box and inflated, so the ring surrounds the chip
    // rather than crossing it. This is the mental model every screenshot tool trains.
    const rx = (Math.abs(to.vx - from.vx) / 2) * 1.15
    const ry = (Math.abs(to.vy - from.vy) / 2) * 1.15
    return {
      shape: 'ring',
      cx: toUnit((from.vx + to.vx) / 2, w),
      cy: toUnit((from.vy + to.vy) / 2, h),
      rx: toUnit(rx, w),
      ry: toUnit(ry, h),
    }
  }

  function down(event: React.PointerEvent<SVGSVGElement>) {
    // One gesture at a time. A palm is not a real scenario on a phone-sized screen and
    // the platform has no reliable discriminator, so ignoring non-primary pointers is
    // the whole multi-touch story.
    if (!event.isPrimary || start.current) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const { vx, vy } = at(event)
    start.current = { vx, vy, cx: event.clientX, cy: event.clientY, id: event.pointerId }
  }

  /// Every handler below is bound to the pointer that started the gesture. Capture is
  /// per pointer id, so a second finger still hit-tests to this same full-bleed surface;
  /// without this a second finger's release would commit a mark spanning finger one's
  /// touch-down to finger two's lift, which is not a gesture anyone made.
  function owns(event: React.PointerEvent<SVGSVGElement>) {
    return start.current !== null && start.current.id === event.pointerId
  }

  function move(event: React.PointerEvent<SVGSVGElement>) {
    if (!owns(event)) return
    setPreview(shape(start.current!, at(event)))
  }

  /// The gesture was interrupted rather than finished (an incoming call, the OS taking
  /// over). Nothing is committed: a mark the inspector did not finish drawing is not a
  /// mark they meant.
  function abandon(event: React.PointerEvent<SVGSVGElement>) {
    if (!owns(event)) return
    start.current = null
    setPreview(null)
  }

  function up(event: React.PointerEvent<SVGSVGElement>) {
    const from = start.current
    if (!owns(event) || !from) return
    start.current = null
    setPreview(null)

    const to = at(event)
    const moved = Math.hypot(event.clientX - from.cx, event.clientY - from.cy)

    if (moved < TAP_SLOP) {
      // A tap is "point at this" for free: no second tool, no mode switch, and the
      // fastest gesture available in a dim room. Stored with rx and ry normalized
      // against their own axes so it renders as a visual circle, not an ellipse.
      if (tool === 'arrow') return
      const radius = TAP_RADIUS * Math.min(w, h)
      onAdd({
        shape: 'ring',
        cx: toUnit(from.vx, w),
        cy: toUnit(from.vy, h),
        rx: toUnit(radius, w),
        ry: toUnit(radius, h),
      })
      return
    }
    onAdd(shape(from, to))
  }

  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={abandon}
      onPointerLeave={abandon}
      // Static, never toggled on pointerdown: a change to touch-action has no effect on
      // a gesture already in progress. React attaches touch listeners passively at the
      // root, so a preventDefault in an onTouchMove here would silently do nothing.
      className="absolute inset-0 h-full w-full touch-none"
    >
      <MarkPaths marks={preview ? [...marks, preview] : marks} w={w} h={h} />
    </svg>
  )
}
