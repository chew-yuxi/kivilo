/// Parse a formatted number string into typed parts, then apply stable
/// animation keys.
///
/// Dart `intl` has no `formatToParts`, so we always parse the formatted string
/// output and read the decimal separator from `NumberFormat.symbols`.
library;

import '../core/bidi.dart';
import '../core/numerals/detection.dart';
import '../core/numerals/digits.dart';
import '../core/types.dart';
import 'number_format.dart';

/// Intermediate typed segment of a formatted number string.
class RawPart {
  const RawPart(this.type, this.value);
  final String type;
  final String value;
}

/// Parses the mantissa portion of a formatted string into typed [RawPart]s.
/// Handles integer/fraction digits, decimal separator, signs, and grouping.
void _parseMantissa(String mantissa, String decimalSep, List<RawPart> parts, int zeroCodePoint) {
  // Search from the right: some locales use the decimal char as a group
  // separator too, so the leftmost match could be wrong.
  var decimalPos = -1;
  for (var i = mantissa.length - 1; i >= 0; i--) {
    if (mantissa[i] == decimalSep) {
      var hasDigitAfter = false;
      for (var j = i + 1; j < mantissa.length; j++) {
        if (isLocaleDigit(mantissa.codeUnitAt(j), zeroCodePoint)) {
          hasDigitAfter = true;
          break;
        }
      }
      if (hasDigitAfter) {
        decimalPos = i;
        break;
      }
    }
  }

  var buf = '';
  var inFraction = false;

  void flush() {
    if (buf.isNotEmpty) {
      parts.add(RawPart(inFraction ? 'fraction' : 'integer', buf));
      buf = '';
    }
  }

  for (var i = 0; i < mantissa.length; i++) {
    final ch = mantissa[i];
    final code = ch.codeUnitAt(0);
    if (isBidiControlChar(code)) continue;

    if (i == decimalPos) {
      flush();
      parts.add(RawPart('decimal', ch));
      inFraction = true;
      continue;
    }

    if (isLocaleDigit(code, zeroCodePoint)) {
      buf += ch;
    } else if (ch == '-' || ch == '−') {
      flush();
      parts.add(RawPart('minusSign', ch));
    } else if (ch == '+') {
      flush();
      parts.add(RawPart('plusSign', ch));
    } else if (!inFraction) {
      flush();
      final prevDigit = i > 0 && isLocaleDigit(mantissa.codeUnitAt(i - 1), zeroCodePoint);
      final nextDigit = i < mantissa.length - 1 && isLocaleDigit(mantissa.codeUnitAt(i + 1), zeroCodePoint);
      parts.add(RawPart(prevDigit && nextDigit ? 'group' : 'literal', ch));
    } else {
      flush();
      parts.add(RawPart('literal', ch));
    }
  }

  flush();
}

/// Parses a formatted number string into typed [RawPart]s, splitting off any
/// exponent (scientific/engineering notation) at the exponent separator.
/// Emits `exponentSeparator` / `exponentMinusSign` / `exponentPlusSign` /
/// `exponentInteger` parts.
List<RawPart> parseNumberString(String formatted, String decimalSep, int zeroCodePoint, {String expSymbol = 'E'}) {
  // Detect the exponent separator (the locale's EXP_SYMBOL, or a bare 'e'/'E').
  var exponentPos = -1;
  for (var i = 0; i < formatted.length; i++) {
    final ch = formatted[i];
    if (ch == expSymbol || ch == 'E' || ch == 'e') {
      exponentPos = i;
      break;
    }
  }

  final mantissa = exponentPos >= 0 ? formatted.substring(0, exponentPos) : formatted;
  final parts = <RawPart>[];
  _parseMantissa(mantissa, decimalSep, parts, zeroCodePoint);

  if (exponentPos >= 0) {
    parts.add(RawPart('exponentSeparator', formatted[exponentPos]));

    var expBuf = '';
    for (var i = exponentPos + 1; i < formatted.length; i++) {
      final ch = formatted[i];
      if (ch == '-' || ch == '−') {
        parts.add(RawPart('exponentMinusSign', ch));
      } else if (ch == '+') {
        parts.add(RawPart('exponentPlusSign', ch));
      } else if (isLocaleDigit(ch.codeUnitAt(0), zeroCodePoint)) {
        expBuf += ch;
      }
    }
    if (expBuf.isNotEmpty) parts.add(RawPart('exponentInteger', expBuf));
  }

  return parts;
}

/// Applies stable keying to [rawParts]. Integer digits are keyed right-to-left
/// (ones = `integer:0`), fraction digits left-to-right (tenths = `fraction:0`),
/// with signs/decimal/group/prefix/suffix keyed in place.
List<KeyedPart> rawPartsToKeyedParts(List<RawPart> rawParts, {String prefix = '', String suffix = ''}) {
  // Detect the zero codepoint from the actual output (authoritative).
  final rawString = rawParts.map((p) => p.value).join();
  final zeroCP = detectOutputZeroCodePoint(rawString);

  // Step 1: flatten to single chars tagged with their source type.
  final flatTypes = <String>[];
  final flatChars = <String>[];

  void push(String type, String char) {
    flatTypes.add(type);
    flatChars.add(char);
  }

  for (final ch in prefix.split('')) {
    if (isBidiControlChar(ch.codeUnitAt(0))) continue;
    push('prefix', ch);
  }

  for (final part in rawParts) {
    // Merge signs into unified types.
    final t = part.type;
    final type = (t == 'minusSign' || t == 'plusSign')
        ? 'sign'
        : (t == 'exponentMinusSign' || t == 'exponentPlusSign')
        ? 'exponentSign'
        : t;

    // Replace the exponent separator ("E") with a "×10" display; the exponent
    // digits then float as superscript, rendering e.g. 1.2×10³.
    if (type == 'exponentSeparator') {
      push('exponentSeparator', '×'); // ×
      push('exponentSeparator', '1');
      push('exponentSeparator', '0');
      continue;
    }

    for (final ch in part.value.split('')) {
      if (isBidiControlChar(ch.codeUnitAt(0))) continue;
      push(type, ch);
    }
  }

  for (final ch in suffix.split('')) {
    if (isBidiControlChar(ch.codeUnitAt(0))) continue;
    push('suffix', ch);
  }

  // Step 2: key characters (integers + groups RTL, everything else LTR).
  final result = List<KeyedPart?>.filled(flatChars.length, null);
  final counts = <String, int>{};

  String nextKey(String type) {
    final n = (counts[type] ?? -1) + 1;
    counts[type] = n;
    return '$type:$n';
  }

  // Integer + group form one contiguous block keyed RTL.
  final integerGroupIndices = <int>[];
  for (var i = 0; i < flatTypes.length; i++) {
    if (flatTypes[i] == 'integer' || flatTypes[i] == 'group') integerGroupIndices.add(i);
  }
  for (var i = integerGroupIndices.length - 1; i >= 0; i--) {
    final idx = integerGroupIndices[i];
    final isDigit = flatTypes[idx] == 'integer';
    result[idx] = KeyedPart(
      key: nextKey(flatTypes[idx]),
      type: isDigit ? KeyedPartType.digit : KeyedPartType.symbol,
      char: flatChars[idx],
      digitValue: isDigit ? localeDigitValue(flatChars[idx].codeUnitAt(0), zeroCP) : -1,
    );
  }

  // Exponent integers keyed RTL too (harmless if none present).
  final exponentIntegerIndices = <int>[];
  for (var i = 0; i < flatTypes.length; i++) {
    if (flatTypes[i] == 'exponentInteger') exponentIntegerIndices.add(i);
  }
  for (var i = exponentIntegerIndices.length - 1; i >= 0; i--) {
    final idx = exponentIntegerIndices[i];
    result[idx] = KeyedPart(
      key: nextKey('exponentInteger'),
      type: KeyedPartType.digit,
      char: flatChars[idx],
      digitValue: localeDigitValue(flatChars[idx].codeUnitAt(0), zeroCP),
    );
  }

  // Everything else keyed LTR.
  for (var i = 0; i < flatChars.length; i++) {
    if (result[i] != null) continue;
    final isDigit = flatTypes[i] == 'fraction';
    result[i] = KeyedPart(
      key: nextKey(flatTypes[i]),
      type: isDigit ? KeyedPartType.digit : KeyedPartType.symbol,
      char: flatChars[i],
      digitValue: isDigit ? localeDigitValue(flatChars[i].codeUnitAt(0), zeroCP) : -1,
    );
  }

  return result.cast<KeyedPart>();
}

/// Result of formatting: keyed parts plus the raw characters (with bidi marks)
/// needed for visual reordering.
class KeyedPartsResult {
  const KeyedPartsResult(this.parts, this.rawChars);
  final List<KeyedPart> parts;
  final List<String> rawChars;
}

/// Formats [value] into stably-keyed single-character parts.
///
/// Uses [format]/[locale] to produce the string, parses it into typed parts,
/// and applies keying. The result's `rawChars` is the raw formatted string
/// (plus prefix/suffix) for bidi reordering.
KeyedPartsResult formatToKeyedParts(
  num value, {
  NumberFlowFormat? format,
  String? locale,
  String prefix = '',
  String suffix = '',
}) {
  final formatter = getOrCreateFormatter(format, locale);
  final formatted = formatToString(value, format, locale);

  final decimalSep = formatter.symbols.DECIMAL_SEP;
  final zeroCP = detectOutputZeroCodePoint(formatted);
  final rawParts = parseNumberString(formatted, decimalSep, zeroCP, expSymbol: formatter.symbols.EXP_SYMBOL);

  final rawString = prefix + formatted + suffix;
  final rawChars = rawString.split('');

  return KeyedPartsResult(rawPartsToKeyedParts(rawParts, prefix: prefix, suffix: suffix), rawChars);
}
