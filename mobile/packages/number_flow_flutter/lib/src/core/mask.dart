/// Adaptive edge-mask computation. Pure math.
library;

import 'dart:math' as math;

import 'layout.dart';
import 'types.dart';

/// Target gradient size as a ratio of lineHeight. The gradient is at least
/// this tall, expanding the container if needed.
const double _targetGradientRatio = 0.2;

/// Small inset so the gradient doesn't start right at the glyph boundary.
const double _paddingPx = 2;

/// Vertical mask heights for the top and bottom edges of a slot.
class MaskHeights {
  const MaskHeights({
    required this.top,
    required this.bottom,
    required this.expansionTop,
    required this.expansionBottom,
  });

  /// Total gradient height at the top edge.
  final double top;

  /// Total gradient height at the bottom edge.
  final double bottom;

  /// How much the container must expand beyond lineHeight at the top.
  final double expansionTop;

  /// How much the container must expand beyond lineHeight at the bottom.
  final double expansionBottom;
}

/// Computes adaptive vertical mask heights based on the characters currently
/// displayed (plus any [exitingEntries]).
///
/// The gradient starts at the edge of the visible glyph content and extends
/// outward. If the "dead zone" inside lineHeight is smaller than the target
/// gradient size, the container expands beyond lineHeight.
MaskHeights computeAdaptiveMaskHeights(
  List<CharLayout> layout,
  Map<String, CharLayout> exitingEntries,
  GlyphMetrics metrics,
) {
  var tightestTop = 0.0;
  var tightestBottom = 0.0;

  void processChar(String char) {
    final bounds = metrics.charBounds[char];
    if (bounds == null) return;
    if (bounds.top < tightestTop) tightestTop = bounds.top;
    if (bounds.bottom > tightestBottom) tightestBottom = bounds.bottom;
  }

  for (final entry in layout) {
    if (entry.superscript) continue;
    processChar(entry.char);
  }

  for (final entry in exitingEntries.values) {
    if (entry.superscript) continue;
    processChar(entry.char);
  }

  final targetGradient = _targetGradientRatio * metrics.lineHeight;

  // Dead zone: space within lineHeight not occupied by glyph content.
  final deadZoneTop = math.max(0.0, -metrics.ascent - -tightestTop - _paddingPx);
  final deadZoneBottom = math.max(0.0, metrics.descent - tightestBottom - _paddingPx);

  // If the dead zone is smaller than the target, expand the container.
  final expansionTop = math.max(0.0, targetGradient - deadZoneTop);
  final expansionBottom = math.max(0.0, targetGradient - deadZoneBottom);

  return MaskHeights(
    top: deadZoneTop + expansionTop,
    bottom: deadZoneBottom + expansionBottom,
    expansionTop: expansionTop,
    expansionBottom: expansionBottom,
  );
}
