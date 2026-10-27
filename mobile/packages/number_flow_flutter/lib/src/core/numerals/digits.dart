/// Digit character helpers. Pure Dart.
library;

import 'tables.dart';

final Map<String, List<String>> _digitStringsCache = {};

/// Returns the numeric value (0-9) of a hanidec character code, or -1 if the
/// code is not a hanidec digit. Uses a switch with literal hex values so the
/// non-contiguous ideographs map correctly.
int hanidecDigitValue(int charCode) {
  switch (charCode) {
    case 0x3007:
      return 0; // 〇
    case 0x4e00:
      return 1; // 一
    case 0x4e8c:
      return 2; // 二
    case 0x4e09:
      return 3; // 三
    case 0x56db:
      return 4; // 四
    case 0x4e94:
      return 5; // 五
    case 0x516d:
      return 6; // 六
    case 0x4e03:
      return 7; // 七
    case 0x516b:
      return 8; // 八
    case 0x4e5d:
      return 9; // 九
    default:
      return -1;
  }
}

/// Returns the Unicode codepoint of digit zero for a numbering system.
/// Falls back to Latin (48) for unknown/supplementary-plane systems.
/// For hanidec, returns 0x3007 as a sentinel (digits are non-contiguous).
int getZeroCodePoint(String numberingSystem) {
  return kZeroCodepoints[numberingSystem] ?? kLatinZero;
}

/// Builds an array of 10 digit strings for a numbering system.
/// `[0]` = zero character, `[9]` = nine character. Cached by system name.
List<String> getDigitStrings(String numberingSystem) {
  final cached = _digitStringsCache[numberingSystem];
  if (cached != null) return cached;

  if (numberingSystem == 'hanidec') {
    _digitStringsCache['hanidec'] = kHanidecDigits;
    return kHanidecDigits;
  }

  final zeroCp = getZeroCodePoint(numberingSystem);
  final strings = List<String>.generate(10, (i) => String.fromCharCode(zeroCp + i));

  _digitStringsCache[numberingSystem] = strings;
  return strings;
}

/// Returns the numeric value (0-9) of a character code in the given system,
/// or -1 if the code is not a digit there. Handles hanidec via the sentinel
/// zeroCodePoint 0x3007.
int localeDigitValue(int charCode, int zeroCodePoint) {
  if (zeroCodePoint == 0x3007) return hanidecDigitValue(charCode);

  final value = charCode - zeroCodePoint;
  return value >= 0 && value <= 9 ? value : -1;
}

/// Whether a character code is a digit in the given numbering system.
bool isLocaleDigit(int charCode, int zeroCodePoint) => localeDigitValue(charCode, zeroCodePoint) >= 0;

/// Whether a single character is a digit in the given numbering system.
/// Convenience wrapper over [localeDigitValue] for string callers.
bool isDigitChar(String char, [int zeroCodePoint = 48]) => localeDigitValue(char.codeUnitAt(0), zeroCodePoint) >= 0;

/// Counts digit characters in [text] for a given numbering system.
int countDigits(String text, int zeroCodePoint) {
  var count = 0;
  for (var i = 0; i < text.length; i++) {
    if (localeDigitValue(text.codeUnitAt(i), zeroCodePoint) >= 0) count++;
  }
  return count;
}
