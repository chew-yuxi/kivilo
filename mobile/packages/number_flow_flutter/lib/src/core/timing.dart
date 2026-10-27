/// Animation timing. The easing points reproduce NumberFlow's CSS
/// `linear()` curve exactly — copied verbatim, do not re-derive.
library;

import 'package:flutter/animation.dart';

/// NumberFlow's CSS `linear()` easing: a smooth deceleration curve defined by
/// 90 evenly-spaced control points, interpolated piecewise-linearly.
class NumberFlowCurve extends Curve {
  const NumberFlowCurve();

  static const List<double> points = <double>[
    0, 0.005, 0.019, 0.039, 0.066, 0.096, 0.129, 0.165, 0.202, 0.24, 0.278, //
    0.316, 0.354, 0.39, 0.426, 0.461, 0.494, 0.526, 0.557, 0.586, 0.614, 0.64, //
    0.665, 0.689, 0.711, 0.731, 0.751, 0.769, 0.786, 0.802, 0.817, 0.831, //
    0.844, 0.856, 0.867, 0.877, 0.887, 0.896, 0.904, 0.912, 0.919, 0.925, //
    0.931, 0.937, 0.942, 0.947, 0.951, 0.955, 0.959, 0.962, 0.965, 0.968, //
    0.971, 0.973, 0.976, 0.978, 0.98, 0.981, 0.983, 0.984, 0.986, 0.987, //
    0.988, 0.989, 0.99, 0.991, 0.992, 0.992, 0.993, 0.994, 0.994, 0.995, //
    0.995, 0.996, 0.996, 0.9963, 0.9967, 0.9969, 0.9972, 0.9975, 0.9977, //
    0.9979, 0.9981, 0.9982, 0.9984, 0.9985, 0.9987, 0.9988, 0.9989, 1, //
  ];

  @override
  double transformInternal(double t) {
    final lastIndex = points.length - 1;
    if (t <= 0) return points[0];
    if (t >= 1) return points[lastIndex];

    final scaledT = t * lastIndex;
    final index = scaledT.floor();
    final fraction = scaledT - index;

    return points[index] + (points[index + 1] - points[index]) * fraction;
  }
}

/// Timing for an individual animation phase (roll, transform, or opacity).
class TimingConfig {
  const TimingConfig({required this.duration, required this.curve});

  final Duration duration;
  final Curve curve;
}

/// Physics-based spring for digit rolling, giving an iOS-like bouncy settle.
///
/// When a [NumberFlowSpring] is supplied (opt-in), the digit wheel drives its
/// scroll via a real [SpringSimulation] instead of a duration+[Curve] — the
/// motion overshoots slightly and settles, matching the native iOS feel.
class NumberFlowSpring {
  const NumberFlowSpring({this.mass = 1.0, this.stiffness = 170.0, this.damping = 22.0});

  /// Mass of the animated object.
  final double mass;

  /// Spring stiffness — higher = faster, snappier.
  final double stiffness;

  /// Damping — lower = more bounce/overshoot, higher = more settled.
  final double damping;

  SpringDescription get description => SpringDescription(mass: mass, stiffness: stiffness, damping: damping);

  /// A gentle, iOS-like spring: a little overshoot, quick settle.
  static const NumberFlowSpring ios = NumberFlowSpring(mass: 1, stiffness: 170, damping: 20);

  /// A bouncier spring for a more playful feel.
  static const NumberFlowSpring bouncy = NumberFlowSpring(mass: 1, stiffness: 200, damping: 14);
}

/// How long a digit spins before settling: the 900ms NumberFlow deceleration.
const TimingConfig kDefaultSpinTiming = TimingConfig(duration: Duration(milliseconds: 900), curve: NumberFlowCurve());

/// Default horizontal-reflow (transform) timing: slots sliding to new columns
/// when the number's width changes. Uses a smooth, symmetric ease over the same
/// duration as the opacity fade so a slot sliding away from a fading neighbour
/// (e.g. the removed "." in compact 1.2K→2K) reads as one coordinated motion
/// instead of a fast front-loaded snap over a slow fade.
const TimingConfig kDefaultTransformTiming = TimingConfig(
  duration: Duration(milliseconds: 450),
  curve: Curves.easeInOut,
);

/// Enter/exit opacity timing: 450ms ease-out.
const TimingConfig kDefaultOpacityTiming = TimingConfig(duration: Duration(milliseconds: 450), curve: Curves.easeOut);

/// No-op timing used when animations are disabled or reduce-motion is on.
const TimingConfig kZeroTiming = TimingConfig(duration: Duration.zero, curve: Curves.linear);
