/// Shared rendering engine for [NumberFlow] and TimeFlow. Owns the per-key
/// digit wheels, opacity (enter/exit) controllers, exiting slots, continuous
/// generations, and the single [NumberFlowPainter]. Widgets provide their
/// settings + keyed parts via [FlowInputs]; this mixin does the reconcile,
/// animation orchestration, and builds the CustomPaint.
library;

import 'dart:async';

import 'package:flutter/foundation.dart' show ValueListenable;
import 'package:flutter/material.dart' hide kDefaultFontSize;

import '../core/constants.dart';
import '../core/continuous_spin.dart';
import '../core/direction.dart' as dir;
import '../core/layout.dart';
import '../core/mask.dart';
import '../core/numerals/detection.dart';
import '../core/numerals/digits.dart';
import '../core/timing.dart';
import '../core/types.dart';
import '../intl/number_format.dart';
import '../metrics/glyph_metrics.dart';
import '../rendering/digit_wheel.dart';
import '../rendering/number_flow_painter.dart';

/// Everything a flow widget must supply each build for the shared engine.
class FlowInputs {
  const FlowInputs({
    required this.parts,
    required this.rawChars,
    required this.trendKey,
    required this.accessibilityLabel,
    required this.style,
    required this.locale,
    required this.textAlign,
    required this.direction,
    required this.animated,
    required this.respectMotionPreference,
    required this.mask,
    required this.continuous,
    required this.tabularNums,
    required this.spin,
    required this.transform,
    required this.opacity,
    required this.spring,
    required this.motionBlur,
    required this.motionBlurThreshold,
    required this.motionBlurVelocityScale,
    required this.digitSquish,
    required this.stagger,
    required this.wheelSpacing,
    required this.digitCountForKey,
    this.onAnimationsStart,
    this.onAnimationsFinish,
  });

  /// Keyed parts to render (already formatted; NOT yet bidi-reordered).
  final List<KeyedPart> parts;

  /// Raw formatted chars incl. bidi marks (for RTL reorder). Empty to skip.
  final List<String> rawChars;

  /// A numeric key representing the value, used for trend auto-detection.
  final num? trendKey;

  final String accessibilityLabel;
  final TextStyle style;
  final String? locale;
  final TextAlignValue textAlign;
  final Direction direction;
  final bool animated;
  final bool respectMotionPreference;
  final bool mask;
  final bool continuous;
  final bool tabularNums;
  final TimingConfig spin;

  /// Timing for horizontal reflow — slots sliding to new columns as the number's
  /// width changes (enter/exit). Kept separate from [spin] so the slide can use
  /// a smooth, non-front-loaded curve that reads well against the opacity fade.
  final TimingConfig transform;

  final TimingConfig opacity;
  final NumberFlowSpring? spring;
  final double motionBlur;
  final double motionBlurThreshold;
  final double motionBlurVelocityScale;
  final double digitSquish;
  final Duration stagger;
  final double wheelSpacing;

  /// Wheel size for a given digit key (10 for NumberFlow; time counts for
  /// TimeFlow). Also honors the digits constraint via the widget.
  final int Function(String key) digitCountForKey;

  final VoidCallback? onAnimationsStart;
  final VoidCallback? onAnimationsFinish;
}

/// Mixin that drives the shared flow rendering. Host State must call
/// [flowRebuild] with fresh [FlowInputs] from didChangeDependencies /
/// didUpdateWidget, and return [flowBuild] from build().
mixin FlowRenderMixin<T extends StatefulWidget> on State<T>, TickerProviderStateMixin<T> {
  final Map<String, DigitWheel> _wheels = {};
  final Map<String, AnimationController> _opacity = {};
  final Map<String, _SlotX> _xAnims = {};
  final Map<String, RenderSlot> _exiting = {};
  Map<String, int> _generations = {};
  final Map<String, int> _appliedGenerations = {};
  List<KeyedPart> _prevParts = const [];

  List<RenderSlot> _slots = [];
  Listenable _repaint = const AlwaysStoppedAnimation<double>(0);

  num? _prevTrendKey;
  GlyphMetrics? _metrics;
  List<String> _localeDigits = const [];
  double _contentWidth = 0;

  /// Animated content-box width. When the number's width changes, the box slides
  /// its size in lockstep with the digits' x-slides (same transform timing) so a
  /// centered/right-aligned number re-centers smoothly instead of the box (and
  /// its left edge, e.g. a currency "$") jumping when the width snaps.
  _SlotX? _widthAnim;

  Timer? _finishTimer;

  FlowInputs? _inputs;

  /// Structural signature of the last laid-out slots (ordered keys). Used by the
  /// scrub path to decide whether a tick needs a full [setState] (structure or
  /// width changed) or can just repaint via the wheels' listenable.
  String _structureSignature = '';
  double _prevContentWidth = 0;

  /// Live a11y label. Kept in a notifier so it updates on scrub ticks that skip
  /// [setState] (the Semantics widget rebuilds off this, not the painter).
  final ValueNotifier<String> _labelNotifier = ValueNotifier<String>('');

  /// Resolve the effective trend for this transition. Host provides trend props.
  Trend resolveFlowTrend(num? prev, num? next);

  /// Rebuilds slots/animations from [inputs]. Call from lifecycle callbacks.
  ///
  /// [scrub] marks a high-frequency scrub tick: entering digits appear at full
  /// opacity immediately (no enter fade) since they're being dragged into view
  /// continuously, not popped in by a discrete change.
  void flowRebuild(FlowInputs inputs, {required bool initial, bool metricsDirty = false, bool scrub = false}) {
    _inputs = inputs;
    _labelNotifier.value = inputs.accessibilityLabel;

    final system = detectNumberingSystem(inputs.locale);
    _localeDigits = getDigitStrings(system);

    if (_metrics == null || metricsDirty) {
      final extra = inputs.rawChars.isNotEmpty ? inputs.rawChars.join() : inputs.parts.map((p) => p.char).join();
      _metrics = measureGlyphMetrics(inputs.style, extraChars: extra, localeDigits: _localeDigits);
    }
    final metrics = _metrics!;

    final ambientRtl = Directionality.of(context) == TextDirection.rtl;
    final resolvedDir = dir.resolveDirection(inputs.direction, ambientIsRtl: ambientRtl);
    final align = dir.resolveTextAlign(resolvedDir, inputs.textAlign);

    final layout = computeKeyedLayout(
      inputs.parts,
      metrics,
      0,
      align,
      inputs.rawChars.isNotEmpty
          ? KeyedLayoutOptions(
              localeDigitStrings: _localeDigits,
              rawCharsWithBidi: inputs.rawChars,
              direction: resolvedDir,
            )
          : KeyedLayoutOptions(localeDigitStrings: _localeDigits),
    );

    _contentWidth = layout.fold(0.0, (s, c) => s + c.width);

    final animate = inputs.animated && !_reduceMotion && !initial;
    final trend = resolveFlowTrend(_prevTrendKey, inputs.trendKey);

    // A change arriving while the previous one is still animating (rapid button
    // presses, faster than the roll/slide settles) would restart every slot's
    // slide from scratch, so the slides crawl and digits pile up at their old
    // columns. In that case snap the layout (columns + box width) instead of
    // sliding — like scrub. The digit values still roll. A single, settled
    // change slides normally.
    //
    // We gate on the digit ROLLS still running (not the x-slides): a rapid
    // change may itself snap the slides, stopping their controllers, so keying
    // off the slides would miss the very next rapid change. Rolls run longer
    // (~spin duration) and are the reliable "a change is still in flight" signal.
    final rollInFlight = _wheels.values.any((w) => w.isAnimating);
    final snapLayout = scrub || rollInFlight;

    if (inputs.continuous && animate && trend != 0 && _prevParts.isNotEmpty) {
      _generations = computeContinuousGenerations(_prevParts, inputs.parts, _generations);
    }
    _prevParts = inputs.parts;

    _reconcile(layout, animate: animate, trend: trend, scrub: scrub, snapLayout: snapLayout);
    _prevTrendKey = inputs.trendKey;

    // Slide the content-box width in step with the digit x-slides. Snap on the
    // first build, when not animating, during a scrub, or on a rapid re-change
    // (see [snapLayout]) — an easing slide would restart and lag.
    _widthAnim ??= _SlotX(this, _contentWidth);
    if (animate && !snapLayout) {
      _widthAnim!.animateTo(_contentWidth, inputs.transform);
    } else {
      _widthAnim!.snapTo(_contentWidth);
    }

    _structureSignature = _signatureOf(_slots);
    _prevContentWidth = _contentWidth;

    if (animate) {
      inputs.onAnimationsStart?.call();
      final baseMs = inputs.spin.duration.inMilliseconds;
      final springPad = inputs.spring != null ? 800 : 0;
      final staggerPad = inputs.stagger.inMilliseconds * _slots.length;
      _finishTimer?.cancel();
      _finishTimer = Timer(Duration(milliseconds: baseMs + springPad + staggerPad), () {
        if (mounted) inputs.onAnimationsFinish?.call();
      });
    }
  }

  /// Ordered slot keys — the widget's visible structure. Two ticks with the same
  /// signature and same content width need no widget rebuild, only a repaint.
  static String _signatureOf(List<RenderSlot> slots) => slots.map((s) => s.key).join('|');

  /// High-frequency update path for scrub mode. Reconciles wheel targets from
  /// fresh [inputs] without a [setState] unless the visible structure (slot keys)
  /// or content width changed — the common case (only digit values change) is
  /// then as cheap as a repaint driven by the wheels' listenable.
  ///
  /// Unlike [flowRebuild] this is meant to be called outside the build lifecycle
  /// (from a notifier listener), so it owns its own [setState].
  void flowScrubTick(FlowInputs inputs) {
    if (_metrics == null) {
      // Not laid out yet — fall back to a full (initial-free) rebuild.
      flowRebuild(inputs, initial: false, scrub: true);
      if (mounted) setState(() {});
      return;
    }
    // Capture the pre-tick structure; flowRebuild overwrites the fields.
    final prevSignature = _structureSignature;
    final prevWidth = _prevContentWidth;
    flowRebuild(inputs, initial: false, scrub: true);
    final structureChanged = prevSignature != _structureSignature || prevWidth != _prevContentWidth;
    if (structureChanged && mounted) setState(() {});
  }

  bool get _reduceMotion => _inputs!.respectMotionPreference && MediaQuery.disableAnimationsOf(context);

  void _reconcile(
    List<CharLayout> layout, {
    required bool animate,
    required Trend trend,
    // High-frequency scrub tick: entering digits skip the enter fade (they're
    // dragged into view continuously, not popped by a discrete change).
    bool scrub = false,
    // Snap columns to their new positions instead of sliding (scrub, or a rapid
    // re-change while columns are still reflowing). Digit values still roll.
    bool snapLayout = false,
  }) {
    final i = _inputs!;
    final zeroCP = getZeroCodePoint(detectNumberingSystem(i.locale));
    final nextSlots = <RenderSlot>[];
    final seenKeys = <String>{};
    final stagger = i.stagger;
    var staggerIndex = 0;

    for (final c in layout) {
      seenKeys.add(c.key);

      // Revive a slot that was mid-exit (fast randomize/scrub can drop then
      // re-add the same key before its fade-out finishes). Its wheel was pulled
      // from _wheels by _startExit but is still alive on the exiting RenderSlot;
      // re-attach it so it's treated as an EXISTING (rolling) slot, not a brand
      // new one that would snap to its value. Fade opacity back up to 1.
      final revived = _exiting.remove(c.key);
      if (revived != null) {
        if (revived.wheel != null) _wheels[c.key] = revived.wheel!;
        final ctrl = _opacity[c.key];
        if (ctrl != null && animate && !scrub) {
          ctrl.animateTo(
            1,
            duration: _inputs!.opacity.duration * kEnterOpacityDurationFactor,
            curve: _inputs!.opacity.curve,
          );
        } else {
          ctrl?.value = 1;
        }
      }

      final isNewKey = !_wheels.containsKey(c.key) && !_opacity.containsKey(c.key);
      // During a scrub, digits are dragged into view continuously, so a new slot
      // appears at full opacity immediately (no enter fade) — otherwise a fast
      // forward drag leaves the new leading digits stuck near-invisible.
      final opacityCtrl = _opacityFor(c.key, enterAnimated: isNewKey && animate && !scrub);
      // Slide surviving slots to their new column; new slots materialize in
      // place. Snap instead of sliding when [snapLayout] (scrub, or a rapid
      // re-change while columns are still reflowing): those cases issue changes
      // faster than the slide's duration, so an easing slide would restart every
      // time and never progress, piling digits up at their old columns.
      final xAnim = _xFor(c.key, target: c.x, slide: animate && !isNewKey && !snapLayout);

      if (c.isDigit) {
        final digitCount = i.digitCountForKey(c.key);
        final targetDigit = c.digitValue >= 0 ? c.digitValue : digitValueForChar(c.char, zeroCP);
        var wheel = _wheels[c.key];
        if (wheel == null) {
          // Entering digit: it starts at 0 and rolls up to its value, so a
          // newly-appearing digit spins in rather than just fading at its final
          // value. On the initial mount (or reduce-motion) there's nothing to
          // animate from — seed directly at the target.
          final entering = isNewKey && animate && targetDigit > 0;
          wheel = DigitWheel(
            vsync: this,
            initialDigit: entering ? 0 : (targetDigit < 0 ? 0 : targetDigit),
            digitCount: digitCount,
            spin: i.spin,
          );
          _wheels[c.key] = wheel;
          if (entering) {
            final delay = stagger > Duration.zero ? stagger * staggerIndex : Duration.zero;
            wheel.rollTo(targetDigit, trend, i.spin, spring: i.spring, startDelay: delay);
            staggerIndex++;
          }
        } else if (targetDigit >= 0) {
          if (animate) {
            // Only roll digits that actually changed — an unchanged digit must
            // stay put. Continuous mode is the exception: an unchanged lower
            // digit spins a full extra cycle when a higher digit carries,
            // driven by extraSpins.
            final changed = wheel.currentDigit != targetDigit;
            final extraSpins = _consumeExtraSpins(c.key);
            if (changed || extraSpins > 0) {
              final delay = stagger > Duration.zero ? stagger * staggerIndex : Duration.zero;
              wheel.rollTo(targetDigit, trend, i.spin, spring: i.spring, startDelay: delay, extraSpins: extraSpins);
              staggerIndex++;
            }
          } else {
            wheel.snapTo(targetDigit);
          }
        }
        nextSlots.add(
          RenderSlot(
            key: c.key,
            x: c.x,
            width: c.width,
            isDigit: true,
            char: c.char,
            superscript: c.superscript,
            wheel: wheel,
            opacityListenable: opacityCtrl,
            xListenable: xAnim.listenable,
          ),
        );
      } else {
        nextSlots.add(
          RenderSlot(
            key: c.key,
            x: c.x,
            width: c.width,
            isDigit: false,
            char: c.char,
            superscript: c.superscript,
            opacityListenable: opacityCtrl,
            xListenable: xAnim.listenable,
          ),
        );
      }
    }

    final removed = [
      for (final k in {..._wheels.keys, ..._opacity.keys})
        if (!seenKeys.contains(k)) k,
    ];
    for (final k in removed) {
      _startExit(k, animate: animate);
    }
    nextSlots.addAll(_exiting.values);

    _slots = nextSlots;
    _rebuildRepaint();
  }

  /// Returns the x-animation for [key], sliding to [target] (curve) or snapping.
  _SlotX _xFor(String key, {required double target, required bool slide}) {
    final x = _xAnims[key] ??= _SlotX(this, target);
    if (slide) {
      x.animateTo(target, _inputs!.transform);
    } else {
      x.snapTo(target);
    }
    return x;
  }

  AnimationController _opacityFor(String key, {required bool enterAnimated}) {
    var ctrl = _opacity[key];
    if (ctrl == null) {
      // Entering slots fade IN quickly and from a partly-visible start so a new
      // digit reads immediately (even during rapid changes) while it rolls in,
      // rather than lingering near-invisible. The exit fade keeps the full
      // opacity timing. The controller's duration is the (longer) opacity
      // timing so exits use it as-is; the enter uses a shortened window.
      ctrl = AnimationController(
        vsync: this,
        duration: _inputs!.opacity.duration,
        value: enterAnimated ? kEnterOpacityStart : 1,
      );
      _opacity[key] = ctrl;
      if (enterAnimated) {
        ctrl.animateTo(
          1,
          duration: _inputs!.opacity.duration * kEnterOpacityDurationFactor,
          curve: _inputs!.opacity.curve,
        );
      }
    }
    return ctrl;
  }

  void _startExit(String key, {required bool animate}) {
    final previousExit = _exiting[key];
    // Rebuilds while a slot is fading must not restart its ticker or replace
    // the completion callback that owns its wheel. Reduced motion still ends
    // an existing exit immediately.
    if (previousExit != null && animate) return;
    final wheel = _wheels.remove(key) ?? previousExit?.wheel;
    final ctrl = _opacity[key];
    final last = _slots.where((s) => s.key == key);
    if (previousExit == null && last.isEmpty) {
      wheel?.dispose();
      ctrl?.dispose();
      _opacity.remove(key);
      _xAnims.remove(key)?.dispose();
      return;
    }
    final slot = previousExit ?? last.first;
    slot.opacity = ctrl?.value ?? 1;
    // Exiting slots freeze at their old x and only fade — we never call
    // animateTo on their _SlotX, so it holds the last position.
    _exiting[key] = slot;

    void finish() {
      // Cancellation also completes the ticker future. A revived slot, a
      // later exit for the same key, or teardown invalidates this ownership.
      if (!identical(_exiting[key], slot)) return;
      _exiting.remove(key);
      _slots.removeWhere((candidate) => identical(candidate, slot));
      wheel?.dispose();
      _opacity.remove(key)?.dispose();
      _xAnims.remove(key)?.dispose();
      if (mounted) setState(_rebuildRepaint);
    }

    if (ctrl == null || !animate) {
      finish();
      return;
    }
    ctrl.duration = _inputs!.opacity.duration;
    ctrl.reverse(from: ctrl.value).whenCompleteOrCancel(finish);
  }

  int _consumeExtraSpins(String key) {
    final target = _generations[key];
    if (target == null) return 0;
    final applied = _appliedGenerations[key] ?? 0;
    final delta = target - applied;
    if (delta <= 0) return 0;
    _appliedGenerations[key] = target;
    return delta;
  }

  int _flowBuildCount = 0;

  /// Number of times [flowBuild] has run — a proxy for full widget rebuilds.
  /// Scrub ticks that skip [setState] should not increment this. Test hook.
  @visibleForTesting
  int get flowBuildCount => _flowBuildCount;

  /// Keys of digit wheels that are currently animating (rolling). Test hook for
  /// asserting that unchanged digits stay put.
  @visibleForTesting
  Set<String> get animatingDigitKeys => {
    for (final e in _wheels.entries)
      if (e.value.isAnimating) e.key,
  };

  /// Current animated x-position for a slot key (its live sliding column). Test
  /// hook for asserting slots slide instead of teleporting on width change.
  @visibleForTesting
  double? animatedXFor(String key) => _xAnims[key]?.listenable.value;

  /// Keys currently in the exiting (fading-out) set. Test hook.
  @visibleForTesting
  Set<String> get exitingKeys => _exiting.keys.toSet();

  /// The last [FlowInputs] the engine reconciled from. Test hook for asserting
  /// resolved settings (e.g. iOS-preset motion-blur defaults).
  @visibleForTesting
  FlowInputs? get debugInputs => _inputs;

  /// Current opacity (0..1) of a slot key. Test hook for asserting entering
  /// digits start visible.
  @visibleForTesting
  double? opacityFor(String key) => _opacity[key]?.value;

  void _rebuildRepaint() {
    _repaint = Listenable.merge(
      [
        for (final s in _slots) s.wheel?.listenable,
        ..._opacity.values,
        for (final x in _xAnims.values) x.listenable,
      ].nonNulls.toList(),
    );
  }

  /// Builds the CustomPaint for the current slots. Returns an empty box until
  /// metrics are ready.
  Widget flowBuild() {
    _flowBuildCount++;
    final metrics = _metrics;
    final i = _inputs;
    if (metrics == null || i == null) return const SizedBox.shrink();

    final color = i.style.color ?? const Color(0xFF000000);
    final maskHeights = computeAdaptiveMaskHeights(
      [
        for (final s in _slots)
          CharLayout(
            key: s.key,
            char: s.char,
            isDigit: s.isDigit,
            digitValue: 0,
            x: s.x,
            width: s.width,
            superscript: s.superscript,
          ),
      ],
      const {},
      metrics,
    );

    final height = metrics.lineHeight + maskHeights.expansionTop + maskHeights.expansionBottom;

    // Minimum box width that must never be clipped, INDEPENDENT of the animated
    // width: exiting slots holding an old x (e.g. 100→5, fading out to the right)
    // must stay visible while they fade. This must NOT include the new content
    // width — the box animates TOWARD that, and flooring at it would make the box
    // jump to full size instantly on expand (breaking grow animation).
    var minWidth = 0.0;
    for (final s in _exiting.values) {
      final right = s.currentX + s.width;
      if (right > minWidth) minWidth = right;
    }
    // A superscript exponent's glyph ink can overhang its narrow column on the
    // right; carry a trailing pad on the (animated) box so it's never clipped.
    final hasSuperscript = _slots.any((s) => s.superscript);
    final trailingPad = hasSuperscript ? metrics.maxDigitWidth * kSuperscriptScale * 0.5 : 0.0;

    // RepaintBoundary isolates this widget's frequent digit-roll repaints into
    // its own layer, so an animating number never invalidates its siblings
    // (e.g. a grid/list of many NumberFlows, or a fast-ticking stopwatch).
    final content = RepaintBoundary(
      child: CustomPaint(
        willChange: true,
        isComplex: true,
        painter: NumberFlowPainter(
          slots: _slots,
          metrics: metrics,
          textStyle: i.style,
          color: color,
          localeDigits: _localeDigits,
          maskEnabled: i.mask,
          maskHeights: maskHeights,
          motionBlur: i.motionBlur,
          motionBlurThreshold: i.motionBlurThreshold,
          motionBlurVelocityScale: i.motionBlurVelocityScale,
          digitSquish: i.digitSquish,
          wheelSpacing: i.wheelSpacing,
          repaint: _repaint,
        ),
      ),
    );

    // The box width animates in lockstep with the digits sliding (so a
    // centered/right-aligned number re-centers smoothly). Only the SizedBox
    // rebuilds per frame via the width listenable — the painter subtree is
    // passed as a child and is not rebuilt.
    final widthListenable = _widthAnim?.listenable ?? const AlwaysStoppedAnimation<double>(0);
    final painted = ValueListenableBuilder<double>(
      valueListenable: widthListenable,
      child: content,
      builder: (context, animatedWidth, child) {
        final w = animatedWidth + trailingPad;
        return SizedBox(width: w > minWidth ? w : minWidth, height: height, child: child);
      },
    );

    // The label reads from a notifier so scrub ticks that skip setState still
    // refresh the a11y label without rebuilding the (heavier) painter subtree.
    return ValueListenableBuilder<String>(
      valueListenable: _labelNotifier,
      child: painted,
      builder: (context, label, child) => Semantics(label: label, readOnly: true, child: child),
    );
  }

  void flowDispose() {
    _finishTimer?.cancel();
    _labelNotifier.dispose();
    final wheels = {
      ..._wheels.values,
      for (final slot in _exiting.values)
        if (slot.wheel != null) slot.wheel!,
    };
    // Invalidate exit callbacks before disposing controllers, which cancels
    // their ticker futures. Exiting wheels are no longer in _wheels.
    _exiting.clear();
    _wheels.clear();
    _slots.clear();
    for (final w in wheels) {
      w.dispose();
    }
    for (final c in _opacity.values) {
      c.dispose();
    }
    _opacity.clear();
    for (final x in _xAnims.values) {
      x.dispose();
    }
    _xAnims.clear();
    _widthAnim?.dispose();
    _widthAnim = null;
  }

  /// Effective style helper shared by hosts (applies default font size +
  /// tabularNums font feature).
  TextStyle effectiveFlowStyle(TextStyle? style, {required bool tabularNums}) {
    var base = style ?? DefaultTextStyle.of(context).style;
    if (base.fontSize == null) base = base.copyWith(fontSize: kDefaultFontSize);
    if (tabularNums) {
      base = base.copyWith(fontFeatures: [...?base.fontFeatures, const FontFeature.tabularFigures()]);
    }
    return base;
  }

  /// Plain formatted value for a number (a11y label); TimeFlow builds its own.
  String numberLabel(num value, NumberFlowFormat? format, String? locale) => formatToString(value, format, locale);
}

/// Animates a slot's horizontal position as the number's width changes, so
/// surviving digits slide to their new column instead of teleporting. Driven by
/// the transform timing.
class _SlotX {
  _SlotX(TickerProvider vsync, double initial)
    : _controller = AnimationController.unbounded(vsync: vsync),
      _value = ValueNotifier<double>(initial) {
    _from = initial;
    _to = initial;
    _controller.addListener(_tick);
  }

  final AnimationController _controller;
  final ValueNotifier<double> _value;
  double _from = 0;
  double _to = 0;

  ValueListenable<double> get listenable => _value;
  double get target => _to;
  bool get isAnimating => _controller.isAnimating;

  void _tick() {
    _value.value = _from + (_to - _from) * _controller.value;
  }

  /// Snaps immediately (new slot, or reduce-motion).
  void snapTo(double x) {
    _controller.stop();
    _from = x;
    _to = x;
    _value.value = x;
  }

  /// Slides from the current position to [x] over [timing].
  void animateTo(double x, TimingConfig timing) {
    if ((_value.value - x).abs() < 0.01) {
      snapTo(x);
      return;
    }
    _from = _value.value;
    _to = x;
    _controller
      ..stop()
      ..value = 0
      ..animateTo(1, duration: timing.duration, curve: timing.curve);
  }

  void dispose() {
    _controller.removeListener(_tick);
    _controller.dispose();
    _value.dispose();
  }
}
