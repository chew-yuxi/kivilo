/// Core data types. Pure Dart — no Flutter imports — so the logic layer
/// stays unit-testable in isolation.
library;

/// Digit spin direction.
/// - `1`: always spin upward
/// - `-1`: always spin downward
/// - `0`: each digit takes the shortest path
///
/// Represented as an `int` (`-1 | 0 | 1`) so the pure math in `utils.dart`
/// can operate on it directly.
typedef Trend = int;

/// Trend prop accepted by components: either a static [Trend] or a function
/// that receives `(prev, next)` and returns a [Trend].
///
/// Callers pass either a static trend or a trend function; [resolveTrend]
/// handles both.
typedef TrendFn = Trend Function(num prev, num next);

/// Whether a keyed part is a rolling digit or a static symbol.
enum KeyedPartType { digit, symbol }

/// A single character with a stable key used for animation reconciliation.
///
/// The [key] encodes semantic position (e.g. `"integer:0"` = ones,
/// `"fraction:0"` = tenths) so a digit animates to the same slot across value
/// changes.
class KeyedPart {
  const KeyedPart({required this.key, required this.type, required this.char, required this.digitValue});

  /// Constructs a rolling-digit part.
  factory KeyedPart.digit(String key, int value) =>
      KeyedPart(key: key, type: KeyedPartType.digit, char: '$value', digitValue: value);

  /// Constructs a static-symbol part.
  factory KeyedPart.symbol(String key, String char) =>
      KeyedPart(key: key, type: KeyedPartType.symbol, char: char, digitValue: -1);

  /// Stable key, e.g. `"integer:0"`, `"fraction:1"`, `"decimal"`, `"h10"`.
  final String key;

  /// Whether this is a rolling digit or a static symbol.
  final KeyedPartType type;

  /// The display character.
  final String char;

  /// 0-9 for digits, -1 for symbols.
  final int digitValue;

  bool get isDigit => type == KeyedPartType.digit;

  @override
  String toString() => 'KeyedPart($key, $type, "$char", $digitValue)';
}

/// Per-character tight vertical bounds relative to the baseline.
/// [top] is negative (above baseline); [bottom] is positive (below baseline).
class CharBounds {
  const CharBounds({required this.top, required this.bottom});

  final double top;
  final double bottom;
}

/// Font measurement data used by layout and masking.
///
/// These values come from `TextPainter`/`computeLineMetrics` in the metrics
/// layer; the pure logic here only consumes them.
class GlyphMetrics {
  const GlyphMetrics({
    required this.charWidths,
    required this.maxDigitWidth,
    required this.lineHeight,
    required this.ascent,
    required this.descent,
    required this.charBounds,
  });

  /// Advance width for each measurable character.
  final Map<String, double> charWidths;

  /// Maximum width among digits 0-9 (used for uniform digit slot sizing).
  final double maxDigitWidth;

  /// Line height computed from font metrics: `ceil(descent - ascent)`.
  final double lineHeight;

  /// Font ascent. Stored negative (distance above baseline).
  final double ascent;

  /// Font descent (positive value, distance below baseline).
  final double descent;

  /// Per-character tight vertical bounds relative to the baseline.
  final Map<String, CharBounds> charBounds;
}

/// Text alignment accepted by components. `start`/`end` resolve against the
/// resolved direction; `left`/`right`/`center` are physical.
enum TextAlignValue { left, right, center, start, end }

/// Concrete alignment after resolving `start`/`end` against direction.
enum ResolvedTextAlign { left, right, center }

/// Layout direction for RTL support.
/// - [ltr]: force left-to-right
/// - [rtl]: force right-to-left
/// - [auto]: read from the ambient [Directionality] (same as omitting).
enum Direction { ltr, rtl, auto }

/// Per-position digit constraint. [max] is the highest value the digit can
/// display (inclusive), creating a wheel of `max + 1` values.
class DigitConstraint {
  const DigitConstraint({required this.max});

  final int max;
}

/// Maps integer positions to their constraints. Position 0 = ones, 1 = tens,
/// etc. Positions not listed default to `{max: 9}` (standard 0-9 wheel).
typedef DigitsProp = Map<int, DigitConstraint>;
