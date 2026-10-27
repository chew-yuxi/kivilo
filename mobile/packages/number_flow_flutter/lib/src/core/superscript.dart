/// Superscript scaling helpers. Only the scale constant and pivot math are pure;
/// the actual TextStyle/transform application lives in the rendering layer.
library;

import 'constants.dart';

/// Returns the scaled font size for superscript rendering.
double superscriptFontSize(double fontSize) => fontSize * kSuperscriptScale;

/// Returns the pivot y used to scale a superscript around the text top so it
/// shrinks downward within the mask region. The pivot is the text top:
/// `textTop = baseY + ascent`.
double superscriptPivotY(double baseY, double ascent) => baseY + ascent;
