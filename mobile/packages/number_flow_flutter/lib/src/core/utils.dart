/// Pure digit-animation math. No Flutter imports; fully unit-testable.
library;

import 'constants.dart';
import 'types.dart';

/// Computes the signed modular offset for digit [n] relative to virtual
/// scroll position [c]. Returns a value in `[-half, half)`, where 0 means the
/// digit is centered in the viewport.
///
/// Equivalent to the CSS formulation:
///   offset-raw: mod(length + n - mod(c, length), length)
///   offset: offset-raw - length * round(down, offset-raw / (length/2), 1)
double signedDigitOffset(num n, num c, [int digitCount = kDigitCount]) {
  final num raw = ((n - c) % digitCount + digitCount) % digitCount;
  final half = digitCount / 2;
  return (raw >= half ? raw - digitCount : raw).toDouble();
}

/// Computes the roll delta for a digit transition, respecting [trend].
///
/// - trend > 0 (always up):   8→2 = +4 (through 9,0,1,2), not -6
/// - trend < 0 (always down): 2→8 = -6 (through 1,0,9,8), not +4
/// - trend = 0 (auto):        shortest path
int computeRollDelta(int prev, int next, int trend, [int digitCount = kDigitCount]) {
  if (prev == next) return 0;

  // Always roll up (positive delta).
  if (trend > 0) {
    return next >= prev ? next - prev : digitCount - prev + next;
  }

  // Always roll down (negative delta).
  if (trend < 0) {
    return next <= prev ? next - prev : -(digitCount - next + prev);
  }

  // Auto: shortest path.
  final half = digitCount / 2;
  final diff = next - prev;
  if (diff.abs() <= half) return diff;
  return diff > 0 ? diff - digitCount : diff + digitCount;
}

/// Resolves a trend prop (static [staticTrend] and/or [trendFn]) into a
/// concrete [Trend]. When both are null, auto-detects direction from the value
/// change.
///
/// Pass at most one of [staticTrend] / [trendFn]; if both are given,
/// [staticTrend] wins.
Trend resolveTrend({Trend? staticTrend, TrendFn? trendFn, num? prevValue, num? nextValue}) {
  final hasChange = prevValue != null && nextValue != null && prevValue != nextValue;

  // Static trend value: pass through.
  if (staticTrend != null) return staticTrend;

  // Function trend: call with prev/next when there's an actual change.
  if (trendFn != null) {
    return hasChange ? trendFn(prevValue, nextValue) : 0;
  }

  // Auto-detect from direction of change.
  if (!hasChange) return 0;
  final delta = nextValue - prevValue;
  return delta > 0
      ? 1
      : delta < 0
      ? -1
      : 0;
}

/// Extracts the significance position from a digit's keyed part key.
/// `"integer:2"` → 2 (hundreds); `"fraction:0"` → -1 (tenths).
/// Returns `null` for non-digit keys (symbols, decimals, exponents).
int? parseDigitPosition(String key) {
  // Exponent digits are a separate domain; excluded from continuous spin.
  if (key.startsWith('exponentInteger:')) return null;

  if (key.startsWith('integer:')) {
    return int.tryParse(key.substring(8));
  }

  if (key.startsWith('fraction:')) {
    final n = int.tryParse(key.substring(9));
    return n == null ? null : -(n + 1);
  }

  // Time digit keys, significance ordered.
  switch (key) {
    case 'c1':
      return -2;
    case 'c10':
      return -1;
    case 's1':
      return 0;
    case 's10':
      return 1;
    case 'm1':
      return 2;
    case 'm10':
      return 3;
    case 'h1':
      return 4;
    case 'h10':
      return 5;
    default:
      return null;
  }
}

/// Correct wheel size for each time digit position.
/// s10/m10 only go 0-5; h10 only goes 0-2.
const Map<String, int> kTimeDigitCounts = {
  'c1': 10,
  'c10': 10,
  's1': 10,
  's10': 6,
  'm1': 10,
  'm10': 6,
  'h1': 10,
  'h10': 3,
};

/// Resolves the wheel size for a digit at [key]. Uses [digits] for NumberFlow,
/// or [kTimeDigitCounts] for TimeFlow. Returns [kDigitCount] when no constraint
/// applies.
int getDigitCount(DigitsProp? digits, String key) {
  if (digits == null) return kDigitCount;

  final pos = parseDigitPosition(key);
  if (pos == null || pos < 0) return kDigitCount;

  final constraint = digits[pos];
  return constraint != null ? constraint.max + 1 : kDigitCount;
}
