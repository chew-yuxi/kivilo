/// Bidirectional text handling. A simplified UAX#9 scoped to formatted-number
/// content. Pure Dart — no Flutter imports.
library;

import 'types.dart';

/// Whether [code] is an invisible, zero-width Unicode bidi control character.
/// These can appear in formatter output for RTL locales and would get wrong
/// fallback widths in layout computation.
bool isBidiControlChar(int code) {
  return code == 0x200e || // LRM
      code == 0x200f || // RLM
      code == 0x061c || // ALM
      (code >= 0x202a && code <= 0x202e) || // embeddings/overrides/pop
      (code >= 0x2066 && code <= 0x2069); // isolates/pop
}

// Simplified Unicode bidi types relevant to formatted number content (UAX#9).
const int _l = 0; // Left-to-Right
const int _r = 1; // Right-to-Left
const int _al = 2; // Arabic Letter
const int _en = 3; // European Number
const int _an = 4; // Arabic-Indic Number
const int _et = 5; // European Number Terminator
const int _es = 6; // European Number Separator
const int _cs = 7; // Common Number Separator
const int _ws = 8; // Whitespace
const int _on = 9; // Other Neutral

/// Classifies a Unicode codepoint into its bidi type.
int _classifyBidiType(int code) {
  // Bidi marks (before broad script ranges).
  if (code == 0x200e) return _l; // LRM
  if (code == 0x200f) return _r; // RLM
  // ALM (U+061C) falls into the Arabic range below → AL.

  // Latin digits.
  if (code >= 0x0030 && code <= 0x0039) return _en;

  // Arabic-Indic digits and separators (AN).
  if (code >= 0x0660 && code <= 0x0669) return _an;
  if (code == 0x066b || code == 0x066c) return _an;

  // Extended Arabic-Indic digits (Persian/Urdu).
  if (code >= 0x06f0 && code <= 0x06f9) return _en;

  // Arabic script (excluding digits/separators handled above).
  if ((code >= 0x0600 && code <= 0x065f) ||
      code == 0x066a ||
      (code >= 0x066d && code <= 0x06ef) ||
      (code >= 0x06fa && code <= 0x06ff)) {
    return _al;
  }
  if (code >= 0x0750 && code <= 0x077f) return _al;
  if (code >= 0xfb50 && code <= 0xfdff) return _al;
  if (code >= 0xfe70 && code <= 0xfeff) return _al;

  // Hebrew script.
  if (code >= 0x0590 && code <= 0x05ff) return _r;
  if (code >= 0xfb1d && code <= 0xfb4f) return _r;

  // European separators.
  if (code == 0x002b || code == 0x002d || code == 0x2212) return _es; // + - −

  // Common separators.
  if (code == 0x002e || code == 0x002c || code == 0x003a) return _cs; // . , :
  if (code == 0x00a0) return _cs; // NBSP

  // Whitespace.
  if (code == 0x0020 || code == 0x0009 || code == 0x000a || code == 0x000d) {
    return _ws;
  }

  // Currency symbols and number terminators.
  if (code >= 0x20a0 && code <= 0x20cf) return _et; // Currency block
  if (code == 0x0024 || code == 0x00a2 || code == 0x00a3 || code == 0x00a5) {
    return _et; // $ ¢ £ ¥
  }
  if (code == 0x0025 || code == 0x2030 || code == 0x2031) return _et; // % ‰ ‱

  return _l;
}

/// Computes the visual (left-to-right pixel) display order for [chars] given a
/// base direction. Simplified UAX#9. Returns indices into the original array.
List<int> computeVisualOrder(List<String> chars, String baseDir) {
  final len = chars.length;
  if (len == 0) return <int>[];

  if (baseDir == 'ltr') {
    return List<int>.generate(len, (i) => i);
  }

  // Step 1: classify.
  final types = List<int>.generate(len, (i) => _classifyBidiType(chars[i].codeUnitAt(0)));

  // Step 2: weak-type resolution (W rules).

  // W2: EN after AL → AN.
  var lastStrong = _r; // RTL base acts as initial strong R.
  for (var i = 0; i < len; i++) {
    if (types[i] == _al || types[i] == _r || types[i] == _l) {
      lastStrong = types[i];
    } else if (types[i] == _en && lastStrong == _al) {
      types[i] = _an;
    }
  }

  // W3: AL → R.
  for (var i = 0; i < len; i++) {
    if (types[i] == _al) types[i] = _r;
  }

  // W4: ES between EN+EN → EN; CS between EN+EN → EN; CS between AN+AN → AN.
  for (var i = 1; i < len - 1; i++) {
    if (types[i] == _es && types[i - 1] == _en && types[i + 1] == _en) {
      types[i] = _en;
    } else if (types[i] == _cs) {
      if (types[i - 1] == _en && types[i + 1] == _en) {
        types[i] = _en;
      } else if (types[i - 1] == _an && types[i + 1] == _an) {
        types[i] = _an;
      }
    }
  }

  // W5: ET adjacent to EN → EN (single forward pass over ET/EN runs).
  {
    var runStart = -1;
    var runHasEN = false;
    for (var i = 0; i <= len; i++) {
      final t = i < len ? types[i] : -1;
      final inRun = t == _et || t == _en;

      if (inRun && runStart < 0) {
        runStart = i;
        runHasEN = t == _en;
      } else if (inRun) {
        if (t == _en) runHasEN = true;
      } else if (runStart >= 0) {
        if (runHasEN) {
          for (var j = runStart; j < i; j++) {
            if (types[j] == _et) types[j] = _en;
          }
        }
        runStart = -1;
        runHasEN = false;
      }
    }
  }

  // W6: remaining ES, ET, CS → ON.
  for (var i = 0; i < len; i++) {
    if (types[i] == _es || types[i] == _et || types[i] == _cs) types[i] = _on;
  }

  // W7: EN preceded by L (strong context) → L.
  lastStrong = _r;
  for (var i = 0; i < len; i++) {
    if (types[i] == _l || types[i] == _r) {
      lastStrong = types[i];
    } else if (types[i] == _en && lastStrong == _l) {
      types[i] = _l;
    }
  }

  // Step 3: resolve neutrals (N1, N2), O(n) two-pass.
  int toStrongDir(int t) {
    if (t == _en) return _l;
    if (t == _an) return _r;
    return t;
  }

  final prevStrongArr = List<int>.filled(len, _r);
  {
    var last = _r;
    for (var i = 0; i < len; i++) {
      if (types[i] == _l || types[i] == _r || types[i] == _en || types[i] == _an) {
        last = toStrongDir(types[i]);
      }
      prevStrongArr[i] = last;
    }
  }

  final nextStrongArr = List<int>.filled(len, _r);
  {
    var last = _r;
    for (var i = len - 1; i >= 0; i--) {
      if (types[i] == _l || types[i] == _r || types[i] == _en || types[i] == _an) {
        last = toStrongDir(types[i]);
      }
      nextStrongArr[i] = last;
    }
  }

  for (var i = 0; i < len; i++) {
    if (types[i] != _on && types[i] != _ws) continue;
    types[i] = prevStrongArr[i] == nextStrongArr[i] ? prevStrongArr[i] : _r;
  }

  // Step 4: assign embedding levels (base RTL = level 1; I2: L/EN/AN → 2).
  final levels = List<int>.filled(len, 1);
  for (var i = 0; i < len; i++) {
    if (types[i] == _l || types[i] == _en || types[i] == _an) {
      levels[i] = 2;
    } else {
      levels[i] = 1;
    }
  }

  // Step 5: rule L2 — reverse from highest level down to lowest odd.
  var maxLevel = 1;
  for (var i = 0; i < len; i++) {
    if (levels[i] > maxLevel) maxLevel = levels[i];
  }

  final order = List<int>.generate(len, (i) => i);

  for (var level = maxLevel; level >= 1; level--) {
    var i = 0;
    while (i < len) {
      if (levels[order[i]] >= level) {
        var j = i + 1;
        while (j < len && levels[order[j]] >= level) {
          j++;
        }

        var lo = i;
        var hi = j - 1;
        while (lo < hi) {
          final tmp = order[lo];
          order[lo] = order[hi];
          order[hi] = tmp;
          lo++;
          hi--;
        }

        i = j;
      } else {
        i++;
      }
    }
  }

  return order;
}

/// Detects the content's base direction from the first bidi mark or strong
/// directional character in the raw format output.
String detectContentDirection(List<String> rawChars) {
  for (var i = 0; i < rawChars.length; i++) {
    final code = rawChars[i].codeUnitAt(0);

    // Explicit bidi marks are the strongest signal.
    if (code == 0x200e) return 'ltr'; // LRM
    if (code == 0x200f) return 'rtl'; // RLM
    if (code == 0x061c) return 'rtl'; // ALM

    // Fall back to first strong character.
    final type = _classifyBidiType(code);
    if (type == _l) return 'ltr';
    if (type == _r || type == _al) return 'rtl';
  }

  return 'ltr';
}

/// Reorders keyed parts from logical to visual order for RTL rendering.
///
/// Auto-detects the content's bidi direction from the raw format string
/// (including bidi control chars). Keys are preserved so animation
/// reconciliation continues to work.
List<KeyedPart> reorderKeyedParts(
  List<KeyedPart> keyedParts,
  List<String> rawCharsWithBidi,
  String componentDirection,
) {
  // Only reorder when the component is in RTL mode.
  if (componentDirection == 'ltr' || keyedParts.isEmpty) return keyedParts;

  // Persian formats start with LRM, signaling LTR content even in an RTL
  // context, so we skip reordering in that case.
  final contentDir = detectContentDirection(rawCharsWithBidi);
  if (contentDir == 'ltr') return keyedParts;

  // Visual order on the full array (including bidi marks).
  final visualOrder = computeVisualOrder(rawCharsWithBidi, 'rtl');

  // Map raw indices to stripped (non-control) indices.
  final rawToStripped = List<int>.filled(rawCharsWithBidi.length, -1);
  var strippedIdx = 0;
  for (var i = 0; i < rawCharsWithBidi.length; i++) {
    if (!isBidiControlChar(rawCharsWithBidi[i].codeUnitAt(0))) {
      rawToStripped[i] = strippedIdx++;
    }
  }

  // Reorder: follow visual order, skipping bidi char positions.
  final reordered = <KeyedPart>[];
  for (final rawIdx in visualOrder) {
    final stripped = rawToStripped[rawIdx];
    if (stripped >= 0) {
      reordered.add(keyedParts[stripped]);
    }
  }

  return reordered;
}
