/// Per-digit rolling animation state. One [DigitWheel] per rolling slot.
///
/// Uses an `animDelta`-decays-to-0 model: the effective scroll position is
/// `currentDigit - animDelta`, and each visible glyph `n` sits at
/// `signedDigitOffset(n, c) * lineHeight`. `animDelta` animates from its
/// starting value down to 0, so overlapping rolls stack by re-seeding the
/// start with the live value.
///
/// Both drive modes run through `controller.animateWith(simulation)` on an
/// UNBOUNDED controller, so `controller.value` *is* `animDelta` at every frame:
/// - curve mode (default): a [_CurveSimulation] interpolating start→0 over a
///   fixed duration with an eased curve.
/// - spring mode (opt-in via [NumberFlowSpring]): a real [SpringSimulation],
///   giving an iOS-like bouncy settle (slight overshoot past the target).
library;

import 'dart:async';

import 'package:flutter/animation.dart';
import 'package:flutter/foundation.dart' show Listenable;
import 'package:flutter/physics.dart' show Simulation, SpringSimulation, Tolerance;

import '../core/constants.dart';
import '../core/timing.dart';
import '../core/types.dart';
import '../core/utils.dart';

/// A [Simulation] that drives a value from [start] to 0 over [duration],
/// shaped by [curve]. Lets the curve path share `animateWith` with springs so
/// `controller.value` is always the live `animDelta`.
class _CurveSimulation extends Simulation {
  _CurveSimulation({required this.start, required this.duration, required this.curve});

  final double start;
  final Duration duration;
  final Curve curve;

  double get _seconds => duration.inMicroseconds / Duration.microsecondsPerSecond;

  @override
  double x(double time) {
    if (_seconds <= 0) return 0;
    final t = (time / _seconds).clamp(0.0, 1.0);
    return start * (1 - curve.transform(t));
  }

  @override
  double dx(double time) {
    // Coarse finite-difference velocity; only used for isDone smoothing.
    const h = 1 / 1000;
    return (x(time + h) - x(time)) / h;
  }

  @override
  bool isDone(double time) => time >= _seconds;
}

/// Drives one digit column's spin. Not a widget — the painter reads [scrollC]
/// each frame; repaint is driven by [listenable] ticking.
class DigitWheel {
  DigitWheel({
    required TickerProvider vsync,
    required int initialDigit,
    required this.digitCount,
    required TimingConfig spin,
  }) : _currentDigit = initialDigit.toDouble(),
       // Unbounded so a spring can overshoot past its target without clamping,
       // and so controller.value can carry animDelta directly.
       _controller = AnimationController.unbounded(vsync: vsync, duration: spin.duration) {
    _controller.addListener(_trackVelocity);
  }

  final int digitCount;
  final AnimationController _controller;

  double _currentDigit;

  // Frame-to-frame value tracking, for velocity readout (motion blur) and
  // spring hand-off on interrupt.
  double _lastValue = 0;
  Duration? _lastElapsed;
  double _velocity = 0; // |animDelta units/second| (magnitude, for blur)
  double _signedVelocity = 0; // d(controller.value)/dt, for spring hand-off

  // Pending stagger start (delays the roll a few ms per slot).
  Timer? _delayTimer;

  /// The controller whose ticks should trigger repaint.
  Listenable get listenable => _controller;

  /// Live animation delta (controller value IS the delta in both modes).
  /// Also non-zero while a stagger delay holds the digit at its start position.
  double get _animDelta => (_controller.isAnimating || (_delayTimer?.isActive ?? false)) ? _controller.value : 0.0;

  /// Effective virtual scroll position for [signedDigitOffset].
  double get scrollC => _currentDigit - _animDelta;

  /// The digit this wheel is currently targeting (its settled value). Used to
  /// skip rolls for digits that didn't change (only animate when the digit
  /// value actually changes).
  int get currentDigit => _currentDigit.round();

  bool get isAnimating => _controller.isAnimating || (_delayTimer?.isActive ?? false);

  /// Instantaneous roll speed in |digits/second|, used to scale motion blur.
  /// 0 when settled or waiting on a stagger delay.
  double get velocity => _controller.isAnimating ? _velocity : 0;

  void _trackVelocity() {
    final elapsed = _controller.lastElapsedDuration;
    if (elapsed != null && _lastElapsed != null) {
      final dt = (elapsed - _lastElapsed!).inMicroseconds / Duration.microsecondsPerSecond;
      if (dt > 0) {
        _signedVelocity = (_controller.value - _lastValue) / dt;
        _velocity = _signedVelocity.abs();
      }
    }
    _lastElapsed = elapsed;
    _lastValue = _controller.value;
  }

  /// Rolls to [next] honoring [trend], accumulating any in-flight delta so
  /// overlapping animations stack. [extraSpins] adds full-wheel rotations
  /// (continuous / odometer mode). When [spring] is non-null the roll uses a
  /// [SpringSimulation] for an iOS-like settle; otherwise a curve simulation.
  /// [startDelay] staggers the roll's start (used for the left-to-right wave).
  void rollTo(
    int next,
    Trend trend,
    TimingConfig spin, {
    int extraSpins = 0,
    NumberFlowSpring? spring,
    Duration startDelay = Duration.zero,
  }) {
    _delayTimer?.cancel();

    // `start` is the new animDelta so that scrollC stays continuous across
    // interrupts: scrollC == next - start must equal the current visual
    // position, so start = next - visualPos. We then shift start by whole
    // wheels so the roll travels in the intended direction (and takes the
    // shortest path for trend 0), plus any extra odometer cycles.
    final dir = trend == 0 ? 0 : trend.sign;
    final visualPos = scrollC; // where the digit is right now
    var start = next - visualPos;
    final half = digitCount / 2;
    if (dir > 0) {
      // Roll up: scrollC must increase → start must be > 0.
      while (start <= 0) {
        start += digitCount;
      }
      while (start > digitCount) {
        start -= digitCount;
      }
    } else if (dir < 0) {
      // Roll down: scrollC must decrease → start must be < 0.
      while (start >= 0) {
        start -= digitCount;
      }
      while (start < -digitCount) {
        start += digitCount;
      }
    } else {
      // Shortest path.
      while (start > half) {
        start -= digitCount;
      }
      while (start < -half) {
        start += digitCount;
      }
    }
    start += extraSpins * digitCount * (dir == 0 ? 1 : dir);

    _currentDigit = next.toDouble();

    if (startDelay > Duration.zero) {
      _controller.stop();
      if (start != 0) _controller.value = start; // hold at start until timer fires
      _delayTimer = Timer(startDelay, () => _startRoll(start, spin, spring));
      return;
    }

    _startRoll(start, spin, spring);
  }

  void _startRoll(double start, TimingConfig spin, NumberFlowSpring? spring) {
    // Carry the current velocity into the new spring so an interrupting roll
    // (e.g. during scrubbing) keeps its momentum and bounce instead of
    // restarting from rest. Only meaningful in spring mode.
    final handoffVelocity = _controller.isAnimating ? _signedVelocity : 0.0;

    _controller.stop();
    // Keep _velocity/_signedVelocity as-is so the readout (motion blur) is
    // continuous across the interrupt; reset only the elapsed baseline since
    // animateWith restarts the controller clock at 0.
    _lastElapsed = null;

    if (start == 0 && handoffVelocity == 0) {
      _velocity = 0;
      _signedVelocity = 0;
      _controller.value = 0;
      return;
    }

    // Seed the readout with the hand-off velocity so motion blur is immediate
    // (the frame-diff readout otherwise needs two frames to recover it).
    _signedVelocity = handoffVelocity;
    _velocity = handoffVelocity.abs();

    final Simulation sim = spring != null
        ? SpringSimulation(
            spring.description,
            start,
            0,
            handoffVelocity,
            tolerance: const Tolerance(distance: 0.01, velocity: 0.01),
          )
        : _CurveSimulation(start: start, duration: spin.duration, curve: spin.curve);

    _lastValue = start;
    _controller.animateWith(sim);
  }

  /// Sets the digit with no animation (reduce-motion / animated: false).
  void snapTo(int next) {
    _delayTimer?.cancel();
    _controller.stop();
    _controller.value = 0;
    _velocity = 0;
    _currentDigit = next.toDouble();
  }

  void dispose() {
    _delayTimer?.cancel();
    _controller.removeListener(_trackVelocity);
    _controller.dispose();
  }
}

/// Convenience wheel factory using the default digit count.
DigitWheel createWheel({
  required TickerProvider vsync,
  required int initialDigit,
  int digitCount = kDigitCount,
  TimingConfig spin = kDefaultSpinTiming,
}) => DigitWheel(vsync: vsync, initialDigit: initialDigit, digitCount: digitCount, spin: spin);
