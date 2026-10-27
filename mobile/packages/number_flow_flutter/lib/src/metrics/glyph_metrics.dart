/// Glyph measurement via [TextPainter], producing the [GlyphMetrics] the pure
/// layout/mask logic consumes.
library;

import 'package:flutter/widgets.dart';

import '../core/constants.dart' as nf;
import '../core/types.dart';

/// Characters known to have no descender (bottom bound = baseline). Locale
/// digit glyphs are added dynamically by [measureGlyphMetrics].
const String _noDescenderChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ.:%+-~°!^*×\$€£¥₩';

final Map<String, GlyphMetrics> _cache = {};

String _cacheKey(TextStyle style, String extraChars, List<String>? localeDigits) {
  return [
    style.fontFamily,
    style.fontSize,
    style.fontWeight,
    style.fontStyle,
    style.letterSpacing,
    style.height,
    extraChars,
    localeDigits?.join(),
  ].join('|');
}

/// Measures advance widths and vertical metrics for the character set implied
/// by [style], [extraChars] (format/prefix/suffix chars) and [localeDigits].
/// Results are cached by a style+charset key.
GlyphMetrics measureGlyphMetrics(TextStyle style, {String extraChars = '', List<String>? localeDigits}) {
  final key = _cacheKey(style, extraChars, localeDigits);
  final cached = _cache[key];
  if (cached != null) return cached;

  final fontSize = style.fontSize ?? nf.kDefaultFontSize;
  final effectiveStyle = style.fontSize == null ? style.copyWith(fontSize: fontSize) : style;

  // Union of measurable chars + format-specific chars + locale digits.
  final charSet = <String>{
    ...nf.kMeasurableChars.split(''),
    ...extraChars.split(''),
    if (localeDigits != null) ...localeDigits,
  };

  final charWidths = <String, double>{};
  double maxDigitWidth = 0;

  // Line metrics come from a probe (digits are a good representative set).
  final probe = TextPainter(
    text: TextSpan(text: '0123456789', style: effectiveStyle),
    textDirection: TextDirection.ltr,
  )..layout();
  final lineMetrics = probe.computeLineMetrics();
  // ascent stored negative (above baseline).
  final double rawAscent = lineMetrics.isNotEmpty ? lineMetrics.first.ascent : fontSize * 0.8;
  final double rawDescent = lineMetrics.isNotEmpty ? lineMetrics.first.descent : fontSize * 0.2;
  final ascent = -rawAscent;
  final descent = rawDescent;
  final lineHeight = (rawAscent + rawDescent).ceilToDouble();
  probe.dispose();

  for (final char in charSet) {
    final tp = TextPainter(
      text: TextSpan(text: char, style: effectiveStyle),
      textDirection: TextDirection.ltr,
    )..layout();
    final w = tp.width;
    tp.dispose();
    charWidths[char] = w;

    final isLatinDigit = char.length == 1 && char.codeUnitAt(0) >= 0x30 && char.codeUnitAt(0) <= 0x39;
    if (isLatinDigit && w > maxDigitWidth) maxDigitWidth = w;
  }

  // If locale digits are wider than Latin, size the wheel to them.
  if (localeDigits != null) {
    for (final d in localeDigits) {
      final w = charWidths[d];
      if (w != null && w > maxDigitWidth) maxDigitWidth = w;
    }
  }
  if (maxDigitWidth == 0) maxDigitWidth = fontSize * 0.6;

  // Estimate tight vertical bounds: cap-height for the top, 0 or descent for
  // the bottom depending on whether the glyph descends.
  final capHeight = -ascent * 0.72;
  final noDescender = <String>{..._noDescenderChars.split(''), if (localeDigits != null) ...localeDigits};
  final charBounds = <String, CharBounds>{
    for (final char in charSet) char: CharBounds(top: -capHeight, bottom: noDescender.contains(char) ? 0 : descent),
  };

  final metrics = GlyphMetrics(
    charWidths: charWidths,
    maxDigitWidth: maxDigitWidth,
    lineHeight: lineHeight,
    ascent: ascent,
    descent: descent,
    charBounds: charBounds,
  );
  _cache[key] = metrics;
  return metrics;
}

/// Clears the metrics cache (test/debug helper).
void clearGlyphMetricsCache() => _cache.clear();
