/// The [NumberFlow] widget — animated, digit-by-digit rolling numbers.
///
/// Formatting-specific glue on top of the shared [FlowRenderMixin]: it formats
/// the value into keyed parts, resolves per-position digit counts, and forwards
/// all animation settings.
library;

import 'package:flutter/foundation.dart' show ValueListenable;
import 'package:flutter/material.dart' hide kDefaultFontSize;

import '../core/constants.dart'
    show kDefaultMotionBlurVelocityScale, kIosDigitSquish, kIosMotionBlur, kIosMotionBlurVelocityScale;
import '../core/timing.dart';
import '../core/types.dart';
import '../core/utils.dart';
import '../intl/number_format.dart';
import '../intl/parts.dart';
import 'flow_render.dart';

/// A number that animates digit-by-digit when its [value] changes.
class NumberFlow extends StatefulWidget {
  const NumberFlow({
    super.key,
    required this.value,
    this.format,
    this.locale,
    this.style,
    this.textAlign = TextAlignValue.start,
    this.direction = Direction.auto,
    this.prefix,
    this.suffix,
    this.trend,
    this.trendFn,
    this.animated = true,
    this.respectMotionPreference = true,
    this.mask = true,
    this.continuous = false,
    this.digits,
    this.tabularNums = false,
    this.spinTiming,
    this.transformTiming,
    this.opacityTiming,
    this.spring,
    this.motionBlur,
    this.motionBlurThreshold = 0.5,
    this.motionBlurVelocityScale,
    this.digitSquish,
    this.stagger,
    this.wheelSpacing = 1.2,
    this.onAnimationsStart,
    this.onAnimationsFinish,
  }) : scrubValue = null;

  /// Scrub mode: drive the display from a [ValueListenable<num>] updated by a
  /// gesture (slider, chart scrubber) at high frequency. The widget re-formats
  /// each tick with the same [format]/[locale] and rolls only changed digits,
  /// repainting without a full rebuild unless the digit count changes. Velocity
  /// hand-off keeps overlapping rolls smooth during a fast drag.
  ///
  /// [value] is ignored in scrub mode (a sentinel 0 is used for the initial
  /// mount); the notifier's current value drives everything after.
  const NumberFlow.scrub({
    super.key,
    required ValueListenable<num> value,
    this.format,
    this.locale,
    this.style,
    this.textAlign = TextAlignValue.start,
    this.direction = Direction.auto,
    this.prefix,
    this.suffix,
    this.trend,
    this.trendFn,
    this.animated = true,
    this.respectMotionPreference = true,
    this.mask = true,
    this.continuous = false,
    this.digits,
    this.tabularNums = false,
    this.spinTiming,
    this.transformTiming,
    this.opacityTiming,
    this.spring,
    this.motionBlur,
    this.motionBlurThreshold = 0.5,
    this.motionBlurVelocityScale,
    this.digitSquish,
    this.stagger,
    this.wheelSpacing = 1.2,
    this.onAnimationsStart,
    this.onAnimationsFinish,
  }) : scrubValue = value,
       value = 0;

  final num value;

  /// Non-null in scrub mode: the live value source. See [NumberFlow.scrub].
  final ValueListenable<num>? scrubValue;
  final NumberFlowFormat? format;
  final String? locale;
  final TextStyle? style;
  final TextAlignValue textAlign;
  final Direction direction;
  final String? prefix;
  final String? suffix;

  /// Static trend (-1/0/1). If null and [trendFn] is null, auto-detects.
  final Trend? trend;
  final TrendFn? trendFn;

  final bool animated;
  final bool respectMotionPreference;
  final bool mask;

  /// When true, unchanged lower-significance digits spin a full extra cycle
  /// when a higher digit changes (odometer effect). Defaults to false.
  final bool continuous;

  /// Per-position digit constraints (position 0 = ones). Each sets a wheel of
  /// `max + 1` values instead of the standard 0-9.
  final DigitsProp? digits;

  /// Uniform (tabular) digit width so the number doesn't shift as digits change.
  final bool tabularNums;

  final TimingConfig? spinTiming;
  final TimingConfig? transformTiming;

  /// Enter/exit fade timing for slots that appear/disappear (e.g. 9→10).
  final TimingConfig? opacityTiming;

  /// Opt-in iOS-like spring for the digit roll (overshoot settle).
  final NumberFlowSpring? spring;

  /// Opt-in per-digit velocity motion blur — the max frosted-blur sigma (px) at
  /// peak roll speed. A soft blur ramps up while a digit rolls and fades to
  /// crisp as it settles. null → iOS-preset default when the iOS spring is used,
  /// else off. Set 0 to force off.
  final double? motionBlur;

  /// Roll speed (|digits/second|) below which no blur is applied. Default 0.5.
  final double motionBlurThreshold;

  /// Roll speed (|digits/second|) at which the blur reaches its full sigma.
  /// Lower = blur ramps in sooner / looks stronger at a given speed. null →
  /// iOS-preset default when the iOS spring is used, else 8.
  final double? motionBlurVelocityScale;

  /// Horizontal squish (0..1) applied to a digit while it rolls: at peak speed
  /// the digit compresses to `1 - digitSquish` horizontally and springs back as
  /// it settles, for a snappy motion-compressed feel. null → iOS-preset default
  /// when the iOS spring is used, else off (0).
  final double? digitSquish;

  /// Opt-in left-to-right stagger (higher digits lead). null → iOS-preset
  /// default when the iOS spring is used, else off.
  final Duration? stagger;

  /// Vertical spacing between wheel glyphs (× lineHeight). Default 1.2.
  final double wheelSpacing;

  final VoidCallback? onAnimationsStart;
  final VoidCallback? onAnimationsFinish;

  @override
  State<NumberFlow> createState() => _NumberFlowState();
}

class _NumberFlowState extends State<NumberFlow>
    with TickerProviderStateMixin<NumberFlow>, FlowRenderMixin<NumberFlow> {
  bool get _isIosPreset => identical(widget.spring, NumberFlowSpring.ios);
  double get _motionBlur => widget.motionBlur ?? (_isIosPreset ? kIosMotionBlur : 0.0);
  double get _motionBlurVelocityScale =>
      widget.motionBlurVelocityScale ?? (_isIosPreset ? kIosMotionBlurVelocityScale : kDefaultMotionBlurVelocityScale);
  double get _digitSquish => widget.digitSquish ?? (_isIosPreset ? kIosDigitSquish : 0.0);
  Duration get _staggerVal => widget.stagger ?? (_isIosPreset ? const Duration(milliseconds: 35) : Duration.zero);

  @override
  Trend resolveFlowTrend(num? prev, num? next) =>
      resolveTrend(staticTrend: widget.trend, trendFn: widget.trendFn, prevValue: prev, nextValue: next);

  /// The value currently driving the display: the scrub notifier in scrub mode,
  /// otherwise the static [NumberFlow.value].
  num get _effectiveValue => widget.scrubValue?.value ?? widget.value;

  @override
  void initState() {
    super.initState();
    widget.scrubValue?.addListener(_onScrubTick);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _rebuild(initial: true);
  }

  @override
  void didUpdateWidget(NumberFlow old) {
    super.didUpdateWidget(old);
    if (!identical(old.scrubValue, widget.scrubValue)) {
      old.scrubValue?.removeListener(_onScrubTick);
      widget.scrubValue?.addListener(_onScrubTick);
    }
    _rebuild(initial: false, metricsDirty: old.style != widget.style || old.tabularNums != widget.tabularNums);
  }

  /// Scrub notifier changed — reconcile targets without a full rebuild unless
  /// the digit count changed. Runs outside the build lifecycle.
  void _onScrubTick() {
    if (!mounted) return;
    flowScrubTick(_inputsFor());
  }

  void _rebuild({required bool initial, bool metricsDirty = false}) {
    flowRebuild(_inputsFor(), initial: initial || !_built, metricsDirty: metricsDirty);
    _built = true;
  }

  FlowInputs _inputsFor() {
    final style = effectiveFlowStyle(widget.style, tabularNums: widget.tabularNums);
    final value = _effectiveValue;
    final formatted = formatToKeyedParts(
      value,
      format: widget.format,
      locale: widget.locale,
      prefix: widget.prefix ?? '',
      suffix: widget.suffix ?? '',
    );

    return FlowInputs(
      parts: formatted.parts,
      rawChars: formatted.rawChars,
      trendKey: value,
      accessibilityLabel: numberLabel(value, widget.format, widget.locale),
      style: style,
      locale: widget.locale,
      textAlign: widget.textAlign,
      direction: widget.direction,
      animated: widget.animated,
      respectMotionPreference: widget.respectMotionPreference,
      mask: widget.mask,
      continuous: widget.continuous,
      tabularNums: widget.tabularNums,
      spin: widget.spinTiming ?? kDefaultSpinTiming,
      transform: widget.transformTiming ?? kDefaultTransformTiming,
      opacity: widget.opacityTiming ?? kDefaultOpacityTiming,
      spring: widget.spring,
      motionBlur: _motionBlur,
      motionBlurThreshold: widget.motionBlurThreshold,
      motionBlurVelocityScale: _motionBlurVelocityScale,
      digitSquish: _digitSquish,
      stagger: _staggerVal,
      wheelSpacing: widget.wheelSpacing,
      digitCountForKey: (key) => getDigitCount(widget.digits, key),
      onAnimationsStart: widget.onAnimationsStart,
      onAnimationsFinish: widget.onAnimationsFinish,
    );
  }

  bool _built = false;

  @override
  void dispose() {
    widget.scrubValue?.removeListener(_onScrubTick);
    flowDispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => flowBuild();
}
