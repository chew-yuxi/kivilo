/// Direction & text-align resolution.
///
/// With `auto`, direction comes from the ambient `Directionality`. So
/// [resolveDirection] takes an [ambientIsRtl] flag that the widget layer
/// supplies from `Directionality.of(context)`; the logic itself stays pure.
library;

import 'types.dart';

/// Resolves a [Direction] to a concrete "ltr" or "rtl".
/// When [Direction.auto], uses [ambientIsRtl].
String resolveDirection(Direction? direction, {required bool ambientIsRtl}) {
  if (direction == Direction.ltr) return 'ltr';
  if (direction == Direction.rtl) return 'rtl';
  return ambientIsRtl ? 'rtl' : 'ltr';
}

/// Resolves semantic [TextAlignValue] values (`start`/`end`) to physical
/// values (`left`/`right`) based on [resolvedDirection] ("ltr" | "rtl").
/// `center`/`left`/`right` pass through; `start`/null default to start.
ResolvedTextAlign resolveTextAlign(String resolvedDirection, [TextAlignValue? textAlign]) {
  if (textAlign == TextAlignValue.center) return ResolvedTextAlign.center;
  if (textAlign == TextAlignValue.left) return ResolvedTextAlign.left;
  if (textAlign == TextAlignValue.right) return ResolvedTextAlign.right;

  final isRtl = resolvedDirection == 'rtl';

  if (textAlign == TextAlignValue.end) {
    return isRtl ? ResolvedTextAlign.left : ResolvedTextAlign.right;
  }

  // "start" or null default to start.
  return isRtl ? ResolvedTextAlign.right : ResolvedTextAlign.left;
}
