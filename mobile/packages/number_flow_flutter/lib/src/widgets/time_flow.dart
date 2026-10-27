/// The [TimeFlow] widget — animated time display (clocks, countdowns,
/// stopwatches). Shares the rendering engine with NumberFlow via
/// [FlowRenderMixin]; only formatting (fixed time keys) and wheel sizes differ.
library;

import 'package:flutter/material.dart' hide kDefaultFontSize;

import '../core/constants.dart'
    show kDefaultMotionBlurVelocityScale, kDigitCount, kIosMotionBlur, kIosDigitSquish, kIosMotionBlurVelocityScale;
import '../core/timing.dart';
import '../core/types.dart';
import '../core/utils.dart' show kTimeDigitCounts, resolveTrend;
import '../intl/time_format.dart';
import 'flow_render.dart';

/// An animated clock/countdown/stopwatch. Prop-driven: the parent owns the
/// ticking (e.g. a [Timer] or [Ticker]) and pushes new values.
class TimeFlow extends StatefulWidget {
  const TimeFlow({
    super.key,
    required this.minutes,
    this.hours,
    this.seconds,
    this.centiseconds,
    this.is24Hour = true,
    this.padHours = true,
    this.style,
    this.textAlign = TextAlignValue.start,
    this.direction = Direction.auto,
    this.trend,
    this.trendFn,
    this.animated = true,
    this.respectMotionPreference = true,
    this.mask = true,
    this.continuous = false,
    this.tabularNums = false,
    this.spinTiming,
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
  });

  /// Builds from a [Duration] (countdown/stopwatch). Shows hours only when
  /// [showHours] (default: only if the duration has whole hours).
  factory TimeFlow.duration(
    Duration value, {
    Key? key,
    bool? showHours,
    bool showSeconds = true,
    bool showCentiseconds = false,
    bool is24Hour = true,
    bool padHours = true,
    TextStyle? style,
    TextAlignValue textAlign = TextAlignValue.start,
    Direction direction = Direction.auto,
    Trend? trend,
    TrendFn? trendFn,
    bool animated = true,
    bool respectMotionPreference = true,
    bool mask = true,
    bool continuous = false,
    bool tabularNums = false,
    TimingConfig? spinTiming,
    TimingConfig? opacityTiming,
    NumberFlowSpring? spring,
    double? motionBlur,
    double motionBlurThreshold = 0.5,
    double? motionBlurVelocityScale,
    double? digitSquish,
    Duration? stagger,
    double wheelSpacing = 1.2,
    VoidCallback? onAnimationsStart,
    VoidCallback? onAnimationsFinish,
  }) {
    final totalSeconds = value.inSeconds;
    final withHours = showHours ?? (value.inHours > 0);
    return TimeFlow(
      key: key,
      hours: withHours ? value.inHours : null,
      minutes: withHours ? (totalSeconds % 3600) ~/ 60 : totalSeconds ~/ 60,
      seconds: showSeconds ? totalSeconds % 60 : null,
      centiseconds: showCentiseconds ? (value.inMilliseconds % 1000) ~/ 10 : null,
      is24Hour: is24Hour,
      padHours: padHours,
      style: style,
      textAlign: textAlign,
      direction: direction,
      trend: trend,
      trendFn: trendFn,
      animated: animated,
      respectMotionPreference: respectMotionPreference,
      mask: mask,
      continuous: continuous,
      tabularNums: tabularNums,
      spinTiming: spinTiming,
      opacityTiming: opacityTiming,
      spring: spring,
      motionBlur: motionBlur,
      motionBlurThreshold: motionBlurThreshold,
      motionBlurVelocityScale: motionBlurVelocityScale,
      digitSquish: digitSquish,
      stagger: stagger,
      wheelSpacing: wheelSpacing,
      onAnimationsStart: onAnimationsStart,
      onAnimationsFinish: onAnimationsFinish,
    );
  }

  /// Builds a wall clock from a [DateTime].
  factory TimeFlow.dateTime(
    DateTime value, {
    Key? key,
    bool showSeconds = false,
    bool is24Hour = true,
    bool padHours = true,
    TextStyle? style,
    TextAlignValue textAlign = TextAlignValue.start,
    Direction direction = Direction.auto,
    bool animated = true,
    bool respectMotionPreference = true,
    bool mask = true,
    bool tabularNums = false,
    TimingConfig? spinTiming,
    TimingConfig? opacityTiming,
    NumberFlowSpring? spring,
    double? motionBlur,
    double motionBlurThreshold = 0.5,
    double? motionBlurVelocityScale,
    double? digitSquish,
    Duration? stagger,
    double wheelSpacing = 1.2,
  }) {
    return TimeFlow(
      key: key,
      hours: value.hour,
      minutes: value.minute,
      seconds: showSeconds ? value.second : null,
      is24Hour: is24Hour,
      padHours: padHours,
      style: style,
      textAlign: textAlign,
      direction: direction,
      animated: animated,
      respectMotionPreference: respectMotionPreference,
      mask: mask,
      tabularNums: tabularNums,
      spinTiming: spinTiming,
      opacityTiming: opacityTiming,
      spring: spring,
      motionBlur: motionBlur,
      motionBlurThreshold: motionBlurThreshold,
      motionBlurVelocityScale: motionBlurVelocityScale,
      digitSquish: digitSquish,
      stagger: stagger,
      wheelSpacing: wheelSpacing,
    );
  }

  /// Minutes (0-59). Required.
  final int minutes;

  /// Hours (0-23). Omit for countdown MM:SS mode.
  final int? hours;

  /// Seconds (0-59). Omit to hide.
  final int? seconds;

  /// Centiseconds (0-99). Requires [seconds]. Displayed as ".CC".
  final int? centiseconds;

  final bool is24Hour;
  final bool padHours;

  final TextStyle? style;
  final TextAlignValue textAlign;
  final Direction direction;

  final Trend? trend;
  final TrendFn? trendFn;

  final bool animated;
  final bool respectMotionPreference;
  final bool mask;
  final bool continuous;
  final bool tabularNums;

  final TimingConfig? spinTiming;
  final TimingConfig? opacityTiming;
  final NumberFlowSpring? spring;
  final double? motionBlur;

  /// Roll-speed gate below which no blur is applied. See
  /// [NumberFlow.motionBlurThreshold]. Default 0.5.
  final double motionBlurThreshold;

  /// Roll speed at which the blur reaches full sigma. See
  /// [NumberFlow.motionBlurVelocityScale]. null → iOS-preset default under the
  /// iOS spring, else 8.
  final double? motionBlurVelocityScale;

  /// Horizontal squish (0..1) applied to a digit while it rolls. See
  /// [NumberFlow.digitSquish]. null → iOS-preset default under the iOS spring,
  /// else off (0).
  final double? digitSquish;
  final Duration? stagger;
  final double wheelSpacing;

  final VoidCallback? onAnimationsStart;
  final VoidCallback? onAnimationsFinish;

  @override
  State<TimeFlow> createState() => _TimeFlowState();
}

class _TimeFlowState extends State<TimeFlow> with TickerProviderStateMixin<TimeFlow>, FlowRenderMixin<TimeFlow> {
  bool _built = false;

  bool get _isIosPreset => identical(widget.spring, NumberFlowSpring.ios);
  double get _motionBlur => widget.motionBlur ?? (_isIosPreset ? kIosMotionBlur : 0.0);
  double get _motionBlurVelocityScale =>
      widget.motionBlurVelocityScale ?? (_isIosPreset ? kIosMotionBlurVelocityScale : kDefaultMotionBlurVelocityScale);
  double get _digitSquish => widget.digitSquish ?? (_isIosPreset ? kIosDigitSquish : 0.0);
  Duration get _staggerVal => widget.stagger ?? (_isIosPreset ? const Duration(milliseconds: 35) : Duration.zero);

  /// A single monotonic number representing the whole time, so trend
  /// auto-detection behaves correctly across the seconds↔centiseconds boundary.
  num get _trendValue {
    final totalSeconds = (widget.hours ?? 0) * 3600 + widget.minutes * 60 + (widget.seconds ?? 0);
    return totalSeconds * 100 + (widget.centiseconds ?? 0);
  }

  @override
  Trend resolveFlowTrend(num? prev, num? next) =>
      resolveTrend(staticTrend: widget.trend, trendFn: widget.trendFn, prevValue: prev, nextValue: next);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _rebuild(initial: true);
  }

  @override
  void didUpdateWidget(TimeFlow old) {
    super.didUpdateWidget(old);
    _rebuild(initial: false, metricsDirty: old.style != widget.style || old.tabularNums != widget.tabularNums);
  }

  void _rebuild({required bool initial, bool metricsDirty = false}) {
    assert(widget.centiseconds == null || widget.seconds != null, 'TimeFlow: centiseconds requires seconds to be set.');

    final style = effectiveFlowStyle(widget.style, tabularNums: widget.tabularNums);
    final parts = formatTimeToKeyedParts(
      widget.hours,
      widget.minutes,
      widget.seconds,
      widget.is24Hour,
      widget.padHours,
      widget.centiseconds,
    );

    final firstBuild = !_built;
    _built = true;

    flowRebuild(
      FlowInputs(
        parts: parts,
        rawChars: const [], // TimeFlow does not bidi-reorder.
        trendKey: _trendValue,
        accessibilityLabel: timeStringFromParts(parts),
        style: style,
        locale: null,
        textAlign: widget.textAlign,
        direction: widget.direction,
        animated: widget.animated,
        respectMotionPreference: widget.respectMotionPreference,
        mask: widget.mask,
        continuous: widget.continuous,
        tabularNums: widget.tabularNums,
        spin: widget.spinTiming ?? kDefaultSpinTiming,
        transform: kDefaultTransformTiming,
        opacity: widget.opacityTiming ?? kDefaultOpacityTiming,
        spring: widget.spring,
        motionBlur: _motionBlur,
        motionBlurThreshold: widget.motionBlurThreshold,
        motionBlurVelocityScale: _motionBlurVelocityScale,
        digitSquish: _digitSquish,
        stagger: _staggerVal,
        wheelSpacing: widget.wheelSpacing,
        // Time wheels are smaller for tens positions (h10=3, m10/s10=6).
        digitCountForKey: (key) => kTimeDigitCounts[key] ?? kDigitCount,
        onAnimationsStart: widget.onAnimationsStart,
        onAnimationsFinish: widget.onAnimationsFinish,
      ),
      initial: initial || firstBuild,
      metricsDirty: metricsDirty,
    );
  }

  @override
  void dispose() {
    flowDispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => flowBuild();
}
