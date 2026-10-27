/// Numbering-system detection.
///
/// This implements the pure, locale-driven path (explicit `-u-nu-` extension →
/// CLDR default table → "latn"). Any runtime-probe verification against the
/// actual formatter output is handled in the formatting layer; the pure logic
/// below is fully covered by the numerals test suite.
library;

import 'digits.dart';
import 'tables.dart';

final Map<String, String> _numberingSystemCache = {};

/// Looks up the CLDR-expected numbering system for a locale tag.
/// Checks explicit `-u-nu-`, then exact match (e.g. "ar-EG"), then language
/// subtag (e.g. "ar"). Returns null if the locale defaults to "latn".
String? _getExpectedNumberingSystem(String? locale) {
  if (locale == null || locale.isEmpty) return null;

  final tag = locale;

  // Explicit Unicode extension: "th-TH-u-nu-thai" → "thai".
  final nuMatch = RegExp(r'-u-nu-([a-z]+)').firstMatch(tag);
  if (nuMatch != null) {
    final sys = nuMatch.group(1)!;
    return sys == 'latn' ? null : sys;
  }

  final exact = kCldrDefaultNumbering[tag];
  if (exact != null) return exact;

  // Try language subtag only (strip region): "ar-EG" → "ar".
  final dashIdx = tag.indexOf('-');
  if (dashIdx > 0) {
    return kCldrDefaultNumbering[tag.substring(0, dashIdx)];
  }

  return null;
}

/// Scans a formatted number string and detects which numbering system's digits
/// are present. Returns the zero codepoint of the detected system, or
/// [kLatinZero] if only Latin digits (or none) are found. Handles hanidec
/// (non-contiguous ideographs) separately.
int detectOutputZeroCodePoint(String formattedStr) {
  for (var i = 0; i < formattedStr.length; i++) {
    final code = formattedStr.codeUnitAt(i);

    // Skip Latin digits; we want to detect non-Latin systems.
    if (code >= kLatinZero && code <= kLatinZero + 9) continue;

    // hanidec (non-contiguous codepoints).
    if (hanidecDigitValue(code) >= 0) return kHanidecZero;

    // All contiguous systems (skip latn and hanidec).
    for (final entry in kZeroCodepoints.entries) {
      if (entry.key == 'latn' || entry.key == 'hanidec') continue;
      final zeroCp = entry.value;
      if (code >= zeroCp && code <= zeroCp + 9) return zeroCp;
    }
  }

  return kLatinZero;
}

/// Detects the numbering system for a locale.
///
/// Strategy (pure, locale-driven): honor an explicit `-u-nu-` extension, else
/// fall back to the CLDR default table, else "latn". Results are cached by
/// locale tag.
String detectNumberingSystem(String? locale) {
  final key = locale ?? '';
  final cached = _numberingSystemCache[key];
  if (cached != null) return cached;

  final expected = _getExpectedNumberingSystem(locale);
  final result = expected ?? 'latn';
  _numberingSystemCache[key] = result;
  return result;
}
