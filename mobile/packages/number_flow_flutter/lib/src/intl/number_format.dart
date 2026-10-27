/// Number formatting options plus a cached factory over `package:intl`'s
/// [NumberFormat].
///
/// Covers decimal, grouping, currency, percent, min/max fraction, sign display,
/// and notation: compact (1.2K), scientific (1.2×10³), and engineering
/// (exponent a multiple of 3). Units are not supported.
library;

import 'dart:math' as math;

import 'package:intl/intl.dart';

/// How the sign is shown.
enum SignDisplay { auto, always, exceptZero, negative, never }

/// Currency symbol vs code. (narrowSymbol/name are out of scope for v1.)
enum CurrencyDisplay { symbol, code }

/// Number formatting options. Use the named constructors; the parts parser
/// runs on the produced [NumberFormat]'s string output.
sealed class NumberFlowFormat {
  const NumberFlowFormat({this.sign = SignDisplay.auto});

  /// Plain decimal with optional grouping and fraction bounds.
  const factory NumberFlowFormat.decimal({
    int? minFraction,
    int? maxFraction,
    int? minIntegerDigits,
    bool grouping,
    SignDisplay sign,
  }) = DecimalFormat;

  /// Currency, e.g. `NumberFlowFormat.currency(currencyCode: 'USD')`.
  const factory NumberFlowFormat.currency({
    required String currencyCode,
    String? symbol,
    CurrencyDisplay display,
    int? minFraction,
    int? maxFraction,
    SignDisplay sign,
  }) = CurrencyFormat;

  /// Percent; the value is a ratio (0.856 → "86%").
  const factory NumberFlowFormat.percent({int? maxFraction, int? minFraction, SignDisplay sign}) = PercentFormat;

  /// Compact notation, e.g. `1200 → "1.2K"`, `3_000_000 → "3M"`.
  const factory NumberFlowFormat.compact({int? minFraction, int? maxFraction, SignDisplay sign}) = CompactFormat;

  /// Scientific notation, rendered `1.2×10³` (the "E" separator is rewritten to
  /// `×10` with the exponent floated as superscript).
  const factory NumberFlowFormat.scientific({int? minFraction, int? maxFraction, SignDisplay sign}) = ScientificFormat;

  /// Engineering notation: exponent is always a multiple of 3 (`12000 → 12×10³`).
  /// Dart `intl` has no engineering formatter, so the string is computed
  /// manually (see [formatOverride]).
  const factory NumberFlowFormat.engineering({int? minFraction, int? maxFraction, SignDisplay sign}) =
      EngineeringFormat;

  final SignDisplay sign;

  /// Builds the underlying [NumberFormat] for [locale].
  NumberFormat _build(String? locale);

  /// Optional override that produces the formatted string directly instead of
  /// delegating to [NumberFormat.format]. Used by engineering notation, which
  /// `intl` cannot produce. Returns null to use the built formatter normally.
  String? formatOverride(num value, NumberFormat base) => null;
}

class DecimalFormat extends NumberFlowFormat {
  const DecimalFormat({this.minFraction, this.maxFraction, this.minIntegerDigits, this.grouping = true, super.sign});

  final int? minFraction;
  final int? maxFraction;
  final int? minIntegerDigits;
  final bool grouping;

  @override
  NumberFormat _build(String? locale) {
    // decimalPattern enables grouping by default; only turn it off when asked.
    final f = NumberFormat.decimalPattern(locale);
    _applyFraction(f, minFraction, maxFraction);
    if (minIntegerDigits != null) f.minimumIntegerDigits = minIntegerDigits!;
    if (!grouping) f.turnOffGrouping();
    return f;
  }
}

class CurrencyFormat extends NumberFlowFormat {
  const CurrencyFormat({
    required this.currencyCode,
    this.symbol,
    this.display = CurrencyDisplay.symbol,
    this.minFraction,
    this.maxFraction,
    super.sign,
  });

  final String currencyCode;
  final String? symbol;
  final CurrencyDisplay display;
  final int? minFraction;
  final int? maxFraction;

  @override
  NumberFormat _build(String? locale) {
    final f = NumberFormat.currency(
      locale: locale,
      name: currencyCode,
      symbol: display == CurrencyDisplay.code ? currencyCode : symbol,
    );
    _applyFraction(f, minFraction, maxFraction);
    return f;
  }
}

class PercentFormat extends NumberFlowFormat {
  const PercentFormat({this.maxFraction, this.minFraction, super.sign});

  final int? maxFraction;
  final int? minFraction;

  @override
  NumberFormat _build(String? locale) {
    final f = NumberFormat.percentPattern(locale);
    _applyFraction(f, minFraction, maxFraction);
    return f;
  }
}

class CompactFormat extends NumberFlowFormat {
  const CompactFormat({this.minFraction, this.maxFraction, super.sign});

  final int? minFraction;
  final int? maxFraction;

  @override
  NumberFormat _build(String? locale) {
    final f = NumberFormat.compact(locale: locale);
    _applyFraction(f, minFraction, maxFraction);
    return f;
  }
}

class ScientificFormat extends NumberFlowFormat {
  const ScientificFormat({this.minFraction, this.maxFraction, super.sign});

  final int? minFraction;
  final int? maxFraction;

  @override
  NumberFormat _build(String? locale) {
    final f = NumberFormat.scientificPattern(locale);
    // scientificPattern defaults to no fraction control; honor the mantissa
    // bounds when given (intl's scientific is coarse).
    _applyFraction(f, minFraction, maxFraction);
    return f;
  }
}

class EngineeringFormat extends NumberFlowFormat {
  const EngineeringFormat({this.minFraction, this.maxFraction, super.sign});

  final int? minFraction;
  final int? maxFraction;

  @override
  NumberFormat _build(String? locale) {
    // A base formatter only for locale symbols (decimal/exp/minus). The actual
    // string is produced by [formatOverride] since intl has no engineering mode.
    return NumberFormat.scientificPattern(locale);
  }

  /// Engineering notation: exponent always a multiple of 3, mantissa 1-3 integer
  /// digits.
  @override
  String? formatOverride(num value, NumberFormat base) {
    final exp = base.symbols.EXP_SYMBOL;
    final dec = base.symbols.DECIMAL_SEP;
    if (value == 0) return '0${exp}0';

    final negative = value < 0;
    final abs = value.abs().toDouble();
    final logFloor = (math.log(abs) / math.ln10).floor();
    final e = 3 * (logFloor / 3).floor();
    final mantissa = abs / math.pow(10, e);

    final maxFrac = maxFraction ?? 0;
    final minFrac = minFraction ?? 0;

    var mantissaStr = mantissa.toStringAsFixed(maxFrac);

    // Trim trailing zeros beyond minFrac (mantissaStr uses '.' from toStringAsFixed).
    final dotIdx = mantissaStr.indexOf('.');
    if (dotIdx >= 0) {
      var end = mantissaStr.length;
      final minEnd = dotIdx + 1 + minFrac;
      while (end > minEnd && mantissaStr[end - 1] == '0') {
        end--;
      }
      if (end <= dotIdx + 1 && minFrac == 0) end = dotIdx;
      mantissaStr = mantissaStr.substring(0, end);
    }
    // Localize the decimal separator produced by toStringAsFixed.
    if (dec != '.') mantissaStr = mantissaStr.replaceAll('.', dec);

    final sign = negative ? base.symbols.MINUS_SIGN : '';
    return '$sign$mantissaStr$exp$e';
  }
}

void _applyFraction(NumberFormat f, int? minFraction, int? maxFraction) {
  if (maxFraction != null) f.maximumFractionDigits = maxFraction;
  if (minFraction != null) f.minimumFractionDigits = minFraction;
}

// ─── Caching + formatting ───

final Map<String, NumberFormat> _formatterCache = {};

/// Returns a cached [NumberFormat] for [format]/[locale]. Defaults to plain
/// decimal when [format] is null.
NumberFormat getOrCreateFormatter(NumberFlowFormat? format, String? locale) {
  final key = '${locale ?? ''}|${format?.runtimeType}|${_formatKey(format)}';
  return _formatterCache.putIfAbsent(key, () => (format ?? const NumberFlowFormat.decimal())._build(locale));
}

String _formatKey(NumberFlowFormat? f) {
  return switch (f) {
    null => 'null',
    DecimalFormat() => 'dec:${f.minFraction},${f.maxFraction},${f.minIntegerDigits},${f.grouping},${f.sign}',
    CurrencyFormat() => 'cur:${f.currencyCode},${f.symbol},${f.display},${f.minFraction},${f.maxFraction},${f.sign}',
    PercentFormat() => 'pct:${f.minFraction},${f.maxFraction},${f.sign}',
    CompactFormat() => 'cmp:${f.minFraction},${f.maxFraction},${f.sign}',
    ScientificFormat() => 'sci:${f.minFraction},${f.maxFraction},${f.sign}',
    EngineeringFormat() => 'eng:${f.minFraction},${f.maxFraction},${f.sign}',
  };
}

/// Applies [SignDisplay] rules that `intl` doesn't handle directly by adjusting
/// the produced string. `intl` always shows a minus for negatives already, so
/// we only inject a leading plus (or strip signs) as needed.
String _applySign(String formatted, num value, SignDisplay sign, String plusSign) {
  switch (sign) {
    case SignDisplay.auto:
    case SignDisplay.negative:
      return formatted;
    case SignDisplay.never:
      return formatted.replaceAll('-', '').replaceAll('−', '');
    case SignDisplay.always:
      if (value > 0) return '$plusSign$formatted';
      if (value == 0) return '$plusSign$formatted';
      return formatted;
    case SignDisplay.exceptZero:
      if (value > 0) return '$plusSign$formatted';
      return formatted;
  }
}

/// Formats [value] to a plain string (used for a11y labels and as the source
/// for the parts parser).
String formatToString(num value, NumberFlowFormat? format, String? locale) {
  final f = getOrCreateFormatter(format, locale);
  // Engineering notation is computed manually (intl has no engineering mode).
  final base = format?.formatOverride(value, f) ?? f.format(value);
  final sign = format?.sign ?? SignDisplay.auto;
  return _applySign(base, value, sign, f.symbols.PLUS_SIGN);
}
