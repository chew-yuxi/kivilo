/// Character layout computation. Pure Dart.
library;

import 'bidi.dart';
import 'constants.dart';
import 'types.dart';

/// A positioned character ready for rendering.
class CharLayout {
  CharLayout({
    required this.key,
    required this.char,
    required this.isDigit,
    required this.digitValue,
    required this.x,
    required this.width,
    this.superscript = false,
  });

  final String key;
  final String char;
  final bool isDigit;
  final int digitValue;

  /// Assigned by [assignXPositions]; mutable during layout.
  double x;
  final double width;
  final bool superscript;
}

/// Assigns x positions to each entry based on [textAlign], mutating `x` in
/// place. When [precomputedContentWidth] is provided, skips the sum loop.
void assignXPositions(
  List<CharLayout> chars,
  double totalWidth,
  ResolvedTextAlign textAlign, [
  double? precomputedContentWidth,
]) {
  var contentWidth = precomputedContentWidth ?? 0;
  if (precomputedContentWidth == null) {
    for (final entry in chars) {
      contentWidth += entry.width;
    }
  }

  var startX = 0.0;
  if (textAlign == ResolvedTextAlign.right) {
    startX = totalWidth - contentWidth;
  } else if (textAlign == ResolvedTextAlign.center) {
    startX = (totalWidth - contentWidth) / 2;
  }

  var currentX = startX;
  for (final entry in chars) {
    entry.x = currentX;
    currentX += entry.width;
  }
}

/// Options for [computeKeyedLayout].
class KeyedLayoutOptions {
  const KeyedLayoutOptions({this.localeDigitStrings, this.rawCharsWithBidi, this.direction});

  final List<String>? localeDigitStrings;
  final List<String>? rawCharsWithBidi;

  /// "ltr" | "rtl".
  final String? direction;
}

/// Builds positioned [CharLayout]s from [parts] using [metrics], applying bidi
/// reordering and superscript scaling.
List<CharLayout> computeKeyedLayout(
  List<KeyedPart> parts,
  GlyphMetrics metrics,
  double totalWidth,
  ResolvedTextAlign textAlign, [
  KeyedLayoutOptions? options,
]) {
  final localeDigitStrings = options?.localeDigitStrings;
  final rawCharsWithBidi = options?.rawCharsWithBidi;
  final direction = options?.direction;

  // Apply bidi visual reordering for RTL content in RTL mode.
  final orderedParts = (rawCharsWithBidi != null && direction != null)
      ? reorderKeyedParts(parts, rawCharsWithBidi, direction)
      : parts;

  final chars = <CharLayout>[];

  for (final part in orderedParts) {
    final isSuperscript = part.key.startsWith('exponentInteger:') || part.key.startsWith('exponentSign:');
    final isDigit = part.type == KeyedPartType.digit;

    // For digit parts, use the locale digit character (what the wheel renders).
    var displayChar = part.char;
    if (isDigit && localeDigitStrings != null && part.digitValue >= 0) {
      displayChar = localeDigitStrings[part.digitValue];
    }

    // Rolling digit slots always occupy maxDigitWidth (the painter draws the
    // wheel at that width), keeping columns aligned as digits change. Symbols
    // use their own measured advance width.
    final rawWidth = isDigit ? metrics.maxDigitWidth : (metrics.charWidths[displayChar] ?? metrics.maxDigitWidth);
    final width = isSuperscript ? rawWidth * kSuperscriptScale : rawWidth;

    chars.add(
      CharLayout(
        key: part.key,
        char: part.char,
        isDigit: part.type == KeyedPartType.digit,
        digitValue: part.digitValue,
        x: 0,
        width: width,
        superscript: isSuperscript,
      ),
    );
  }

  assignXPositions(chars, totalWidth, textAlign);
  return chars;
}
