/// Time formatting into stably-keyed parts.
///
/// Unlike NumberFlow (RTL integer keys), TimeFlow uses FIXED semantic keys
/// (h10/h1/sep/m10/m1/sep2/s10/s1/csep/c10/c1 + ampm) so showing/hiding a
/// segment animates as an enter/exit rather than shifting positions.
library;

import '../core/types.dart';

/// Converts 24h hours (0-23) to 12h display value (1-12).
/// 0 → 12 (12 AM), 1-12 → as-is, 13-23 → subtract 12.
int to12Hour(int h) {
  if (h == 0) return 12;
  if (h > 12) return h - 12;
  return h;
}

/// Builds a time display into stably-keyed character parts.
///
/// Each digit position gets a fixed semantic key regardless of value, so e.g.
/// 9→10 makes `h10` *enter* (fade in) rather than shifting existing positions.
/// [hours] omitted → countdown MM:SS mode. [centiseconds] requires [seconds].
List<KeyedPart> formatTimeToKeyedParts(
  int? hours,
  int minutes,
  int? seconds,
  bool is24Hour,
  bool padHours, [
  int? centiseconds,
]) {
  final parts = <KeyedPart>[];

  final hasHours = hours != null;
  final hasSeconds = seconds != null;
  final hasCentiseconds = centiseconds != null;

  if (hasHours) {
    final displayHours = is24Hour ? hours : to12Hour(hours);
    final h10 = displayHours ~/ 10;
    final h1 = displayHours % 10;

    // Hours tens digit: only shown if >= 10 or padding is on.
    if (h10 > 0 || padHours) {
      parts.add(KeyedPart.digit('h10', h10));
    }
    parts.add(KeyedPart.digit('h1', h1));
    parts.add(KeyedPart.symbol('sep', ':'));
  }

  parts.add(KeyedPart.digit('m10', minutes ~/ 10));
  parts.add(KeyedPart.digit('m1', minutes % 10));

  if (hasSeconds) {
    parts.add(KeyedPart.symbol('sep2', ':'));
    parts.add(KeyedPart.digit('s10', seconds ~/ 10));
    parts.add(KeyedPart.digit('s1', seconds % 10));
  }

  if (hasCentiseconds) {
    parts.add(KeyedPart.symbol('csep', '.'));
    parts.add(KeyedPart.digit('c10', centiseconds ~/ 10));
    parts.add(KeyedPart.digit('c1', centiseconds % 10));
  }

  // AM/PM: each char gets a value-dependent key so AM→PM crossfades.
  if (hasHours && !is24Hour) {
    final label = hours < 12 ? 'AM' : 'PM';
    parts.add(KeyedPart.symbol('ampm-sp', ' '));
    for (var i = 0; i < label.length; i++) {
      parts.add(KeyedPart.symbol('ampm:$label:$i', label[i]));
    }
  }

  return parts;
}

/// The plain time string (for the accessibility label), reconstructed from the
/// keyed parts so it matches exactly what's rendered.
String timeStringFromParts(List<KeyedPart> parts) => parts.map((p) => p.char).join();
