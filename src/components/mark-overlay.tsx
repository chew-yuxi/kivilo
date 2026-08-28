import { markPath, strokeWidth, type AnnotationInput, type Mark } from '@/lib/annotations'

/// Draws marks over a photo. Deliberately not a client component: the report and the
/// review screen render it on the server, so the marks are in the HTML and survive with
/// JavaScript off and through a print.
///
/// The overlay must occupy exactly the same box as the <img> it sits over, and that
/// <img> must be `object-contain` or unconstrained. `xMidYMid meet` is definitionally
/// `object-fit: contain` with `object-position: center`, so the browser performs the
/// identical letterbox arithmetic for the picture and for the marks and drift is
/// structurally impossible rather than approximately correct.
export function MarkOverlay({
  annotations,
  className = '',
}: {
  /// Only the geometry is needed to draw. A stored record satisfies this too, so the
  /// same component renders marks the phone has not uploaded yet and marks the server
  /// already holds.
  annotations: AnnotationInput | null
  className?: string
}) {
  if (!annotations || annotations.marks.length === 0) return null
  const { w, h, marks } = annotations

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      // The marks repeat information the caption already carries, so they are decoration
      // to a screen reader rather than an unlabelled graphic.
      aria-hidden="true"
      data-marks={marks.length}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      <MarkPaths marks={marks} w={w} h={h} />
    </svg>
  )
}

/// Halo underneath every mark rather than per mark, so a later mark's halo cannot cut
/// through an earlier one.
export function MarkPaths({ marks, w, h }: { marks: Mark[]; w: number; h: number }) {
  const stroke = strokeWidth(w, h)
  const paths = marks.map((mark) => markPath(mark, w, h))

  return (
    <>
      <g
        fill="none"
        stroke="#ffffff"
        strokeWidth={stroke * 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths.map((d, index) => (
          <path key={index} d={d} />
        ))}
      </g>
      <g
        fill="none"
        stroke="#dc2626"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths.map((d, index) => (
          <path key={index} d={d} />
        ))}
      </g>
    </>
  )
}
