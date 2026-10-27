/// Continuous ("odometer") spin generations. The pure algorithm lives here;
/// the rendering layer drives it from widget state.
library;

import 'types.dart';
import 'utils.dart';

/// Given previous and current keyed parts, determines which unchanged
/// lower-significance digits should do a full-wheel continuous spin, returning
/// a new map with incremented generation counters for those digits.
///
/// The generation counter is what triggers the extra full-wheel spin in the
/// digit animation. When no digit changed, [prevGenerations] is returned
/// unchanged (same reference).
Map<String, int> computeContinuousGenerations(
  List<KeyedPart> prevParts,
  List<KeyedPart> currentParts,
  Map<String, int> prevGenerations,
) {
  // Lookup of previous digit values by key.
  final prevDigits = <String, int>{};
  for (final part in prevParts) {
    if (part.type == KeyedPartType.digit) {
      prevDigits[part.key] = part.digitValue;
    }
  }

  // Highest-significance position where the digit value changed.
  int? maxChangedPos;

  for (final part in currentParts) {
    if (part.type != KeyedPartType.digit) continue;

    final pos = parseDigitPosition(part.key);
    if (pos == null) continue;

    final prevValue = prevDigits[part.key];
    final changed = prevValue != null && prevValue != part.digitValue;

    if (changed && (maxChangedPos == null || pos > maxChangedPos)) {
      maxChangedPos = pos;
    }
  }

  // No digit changed → nothing to spin.
  if (maxChangedPos == null) return prevGenerations;

  // Increment the generation counter for each unchanged digit whose
  // significance is lower than the most-significant changed digit. Only digits
  // that existed previously qualify; entering digits have no previous value.
  final nextGenerations = Map<String, int>.from(prevGenerations);

  for (final part in currentParts) {
    if (part.type != KeyedPartType.digit) continue;

    final pos = parseDigitPosition(part.key);
    if (pos == null || pos >= maxChangedPos) continue;

    final prevValue = prevDigits[part.key];
    final unchanged = prevValue != null && prevValue == part.digitValue;

    if (unchanged) {
      nextGenerations[part.key] = (nextGenerations[part.key] ?? 0) + 1;
    }
  }

  return nextGenerations;
}
