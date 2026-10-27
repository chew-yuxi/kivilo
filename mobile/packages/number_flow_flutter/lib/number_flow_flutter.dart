/// number_flow_flutter — animated, digit-by-digit rolling numbers for Flutter.
///
/// Exposes the [NumberFlow] and [TimeFlow] widgets plus the pure core logic
/// (types, digit math, numerals, bidi, layout, masking, continuous spin,
/// timing/springs).
library;

export 'src/core/bidi.dart';
export 'src/core/constants.dart';
export 'src/core/continuous_spin.dart';
export 'src/core/direction.dart';
export 'src/core/layout.dart';
export 'src/core/mask.dart';
export 'src/core/numerals/numerals.dart';
export 'src/core/superscript.dart';
export 'src/core/timing.dart';
export 'src/core/types.dart';
export 'src/core/utils.dart';
export 'src/intl/number_format.dart';
export 'src/intl/parts.dart' show KeyedPartsResult, RawPart, formatToKeyedParts, rawPartsToKeyedParts;
export 'src/metrics/glyph_metrics.dart' show measureGlyphMetrics, clearGlyphMetricsCache;
export 'src/rendering/number_flow_painter.dart' show clearGlyphParagraphCache;
export 'src/intl/time_format.dart' show formatTimeToKeyedParts, to12Hour;
export 'src/widgets/number_flow.dart' show NumberFlow;
export 'src/widgets/time_flow.dart' show TimeFlow;
