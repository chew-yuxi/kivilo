/// The single CustomPainter renderer. Draws static symbols directly and rolling
/// digits as vertically-clipped wheels, with an adaptive gradient edge mask.
library;

import 'dart:ui' as ui;

import 'package:flutter/foundation.dart' show Listenable, ValueListenable;
import 'package:flutter/rendering.dart';

import '../core/constants.dart' as nf;
import '../core/mask.dart';
import '../core/numerals/digits.dart';
import '../core/types.dart';
import '../core/utils.dart';
import 'digit_wheel.dart';

/// A single positioned slot in the render tree: either a static symbol or a
/// rolling digit backed by a [DigitWheel].
class RenderSlot {
  RenderSlot({
    required this.key,
    required this.x,
    required this.width,
    required this.isDigit,
    required this.char,
    required this.superscript,
    this.wheel,
    this.opacity = 1.0,
    this.opacityListenable,
    this.xListenable,
  });

  final String key;
  double x;
  double width;
  final bool isDigit;

  /// For symbols: the glyph. For digits: the current display char (unused when
  /// drawing the wheel, which renders all 0..digitCount glyphs).
  String char;
  final bool superscript;

  /// Non-null for rolling digits.
  final DigitWheel? wheel;

  /// Snapshot enter/exit fade (fallback when [opacityListenable] is null).
  double opacity;

  /// Live enter/exit fade source, read per-frame by the painter.
  final ValueListenable<double>? opacityListenable;

  /// Live x-position source (slot slides to its new column as the number's width
  /// changes). Null → use the static [x]. Read per-frame by the painter.
  final ValueListenable<double>? xListenable;

  /// Current opacity, preferring the live listenable.
  double get currentOpacity => opacityListenable?.value ?? opacity;

  /// Current x, preferring the live animated position.
  double get currentX => xListenable?.value ?? x;
}

/// Paints a formatted number: rolling digit wheels + static symbols + mask.
class NumberFlowPainter extends CustomPainter {
  NumberFlowPainter({
    required this.slots,
    required this.metrics,
    required this.textStyle,
    required this.color,
    required this.localeDigits,
    required this.maskEnabled,
    required this.maskHeights,
    required this.motionBlur,
    required this.motionBlurThreshold,
    required this.motionBlurVelocityScale,
    required this.digitSquish,
    required this.wheelSpacing,
    required Listenable super.repaint,
  });

  final List<RenderSlot> slots;
  final GlyphMetrics metrics;
  final TextStyle textStyle;
  final Color color;
  final List<String> localeDigits;
  final bool maskEnabled;
  final MaskHeights maskHeights;

  /// Motion-blur intensity: max frosted-blur sigma (px) applied at peak roll
  /// speed. A soft isotropic gaussian blur ramps up while a digit rolls and
  /// fades to crisp as it settles. 0 disables motion blur.
  final double motionBlur;

  /// Roll speed (in |digits/second|) below which no blur is applied — the ramp
  /// gate. Default 0.5.
  final double motionBlurThreshold;

  /// Roll speed (|digits/second|) at which the blur reaches its full
  /// [motionBlur] sigma. Lower = blur ramps in sooner / looks stronger at a
  /// given speed. Default 8.0.
  final double motionBlurVelocityScale;

  /// Horizontal squish applied to a digit while it rolls, in 0..1. At peak roll
  /// speed the digit's horizontal scale drops to `1 - digitSquish` (e.g. 0.3 →
  /// scaleX 0.7) and springs back to 1 as it settles, giving a snappy
  /// motion-compressed feel. Driven by the same velocity ramp as the blur. 0
  /// (default) disables it.
  final double digitSquish;

  /// Vertical spacing between wheel glyphs, as a multiple of lineHeight. 1.0 =
  /// glyphs exactly one line apart; >1 pushes neighbours further out so they
  /// clear the clip window sooner (less peeking near the settle).
  final double wheelSpacing;

  // ── Per-frame allocation avoidance ──
  // Reused Paint instances (created once per painter, mutated per use) so
  // paint() never allocates per frame.
  final Paint _layerPaint = Paint();
  final Paint _blurPaint = Paint();
  final Paint _opacityPaint = Paint();
  final Paint _maskPaint = Paint()..blendMode = BlendMode.dstIn;

  /// Does any slot need a superscript pass? Computed once, not per frame.
  late final bool _hasSuperscript = slots.any((s) => s.superscript);

  /// Process-wide paragraph cache, keyed by full (style|glyph) signature. Digit
  /// and symbol glyphs are static per style, so a grid of many NumberFlows — or
  /// a rebuild — reuses the same laid-out [ui.Paragraph]s instead of rebuilding.
  static final Map<String, ui.Paragraph> _paraCache = {};

  /// Style signature, computed once per painter (not per glyph).
  late final String _styleKey =
      '${textStyle.fontFamily}|${textStyle.fontSize}|${textStyle.fontWeight}|'
      '${textStyle.fontStyle}|${color.toARGB32()}|${textStyle.fontFeatures?.map((f) => f.feature).join(",")}|';

  /// Per-painter hot-path cache: tiny keys ("5" / "^5"), no per-glyph signature
  /// concat on hits. Misses fall through to the shared [_paraCache] so glyphs
  /// are still shared across instances of the same style.
  final Map<String, ui.Paragraph> _localPara = {};

  ui.Paragraph _paragraph(String char, {required bool superscript}) {
    final localKey = superscript ? '^$char' : char;
    final hit = _localPara[localKey];
    if (hit != null) return hit;

    final sharedKey = '$_styleKey$localKey';
    final para = _paraCache[sharedKey] ??= _buildParagraph(char, superscript: superscript);
    _localPara[localKey] = para;
    return para;
  }

  ui.Paragraph _buildParagraph(String char, {required bool superscript}) {
    final fontSize = (textStyle.fontSize ?? nf.kDefaultFontSize) * (superscript ? nf.kSuperscriptScale : 1);
    final builder =
        ui.ParagraphBuilder(
            ui.ParagraphStyle(
              fontFamily: textStyle.fontFamily,
              fontSize: fontSize,
              fontWeight: textStyle.fontWeight,
              fontStyle: textStyle.fontStyle,
              textAlign: TextAlign.left,
            ),
          )
          ..pushStyle(ui.TextStyle(color: color, fontFeatures: textStyle.fontFeatures))
          ..addText(char);
    return builder.build()..layout(const ui.ParagraphConstraints(width: double.infinity));
  }

  @override
  void paint(Canvas canvas, Size size) {
    // Baseline: center the line box vertically, then draw glyphs from the top
    // of the line box (paragraphs draw from top-left).
    final lineHeight = metrics.lineHeight;
    final topY = (size.height - lineHeight) / 2;

    // Main content. The mask is applied via a dstIn gradient, which only works
    // inside its own layer — so we only pay for the (expensive) saveLayer when
    // the mask is actually enabled. Unmasked, we draw straight to the canvas.
    // Superscripts are drawn AFTER the mask so the edge fade never touches the
    // exponent (superscripts are excluded from the mask).
    final needsLayer = maskEnabled && (maskHeights.top > 0 || maskHeights.bottom > 0);
    if (needsLayer) canvas.saveLayer(Offset.zero & size, _layerPaint);
    for (final slot in slots) {
      if (slot.superscript) continue;
      if (slot.isDigit && slot.wheel != null) {
        _paintDigit(canvas, slot, topY, lineHeight);
      } else {
        _paintSymbol(canvas, slot, topY);
      }
    }
    if (needsLayer) {
      _paintMask(canvas, size, topY, lineHeight);
      canvas.restore();
    }

    // Superscripts on top (unmasked) — drawn directly, no layer needed.
    if (_hasSuperscript) {
      for (final slot in slots) {
        if (!slot.superscript) continue;
        if (slot.isDigit && slot.wheel != null) {
          _paintDigit(canvas, slot, topY, lineHeight);
        } else {
          _paintSymbol(canvas, slot, topY);
        }
      }
    }
  }

  void _paintSymbol(Canvas canvas, RenderSlot slot, double topY) {
    final para = _paragraph(slot.char, superscript: slot.superscript);
    final dx = slot.currentX + (slot.width - para.maxIntrinsicWidth) / 2;
    _withOpacity(canvas, slot.currentOpacity, () {
      canvas.drawParagraph(para, Offset(dx, topY));
    });
  }

  void _paintDigit(Canvas canvas, RenderSlot slot, double topY, double lineHeight) {
    final wheel = slot.wheel!;
    final c = wheel.scrollC;
    final slotX = slot.currentX;
    // A superscript digit wheel occupies a narrower column.
    final slotWidth = slot.superscript ? metrics.maxDigitWidth * nf.kSuperscriptScale : metrics.maxDigitWidth;

    // Clip rect includes the mask expansion so entering/exiting glyphs show.
    final clip = Rect.fromLTWH(
      slotX,
      topY - maskHeights.expansionTop,
      slotWidth,
      lineHeight + maskHeights.expansionTop + maskHeights.expansionBottom,
    );

    canvas.save();
    canvas.clipRect(clip);

    final v = wheel.velocity;
    // Velocity ramp shared by the blur and the squish: 0 at/under the threshold,
    // 1 at motionBlurVelocityScale digits/second.
    final ramp = v > motionBlurThreshold ? (v / motionBlurVelocityScale).clamp(0.0, 1.0) : 0.0;

    // Horizontal squish: compress the digit toward `1 - digitSquish` at peak
    // speed, about its column centre, springing back as it settles.
    if (digitSquish > 0 && ramp > 0) {
      final scaleX = 1 - digitSquish * ramp;
      final cx = slotX + slotWidth / 2;
      canvas.translate(cx, 0);
      canvas.scale(scaleX, 1);
      canvas.translate(-cx, 0);
    }

    final step = lineHeight * wheelSpacing;
    void drawGlyphs() {
      _withOpacity(canvas, slot.currentOpacity, () {
        for (var n = 0; n < wheel.digitCount; n++) {
          final offset = signedDigitOffset(n, c, wheel.digitCount);
          // Cull glyphs that can't be inside the clip window given the spacing.
          if ((offset * wheelSpacing).abs() > 1.5) continue;

          final glyph = n < localeDigits.length ? localeDigits[n] : '$n';
          final para = _paragraph(glyph, superscript: slot.superscript);
          final dx = slotX + (slotWidth - para.maxIntrinsicWidth) / 2;
          final dy = topY + offset * step;
          canvas.drawParagraph(para, Offset(dx, dy));
        }
      });
    }

    // Velocity-driven frosted blur: a soft gaussian blur over the whole digit
    // that ramps up while it rolls fast and fades to crisp as it settles. The
    // sigma is isotropic (a frost, not a directional smear), scaled by the
    // velocity ramp so a settled digit is perfectly sharp.
    final hasBlur = motionBlur > 0 && ramp > 0;
    if (hasBlur) {
      final sigma = ramp * motionBlur;
      _blurPaint.imageFilter = ui.ImageFilter.blur(sigmaX: sigma, sigmaY: sigma);
      canvas.saveLayer(clip, _blurPaint);
      drawGlyphs();
      canvas.restore();
    } else {
      drawGlyphs();
    }

    canvas.restore();
  }

  // Cached mask gradient shader — depends only on the vertical geometry (clip
  // top/height) and fade sizes, which are stable across animation frames. Only
  // rebuilt when those change (rare: font/mask-height changes), not per frame.
  ui.Shader? _maskShader;
  double _maskShaderTop = double.nan;
  double _maskShaderHeight = double.nan;
  double _maskShaderFadeTop = double.nan;
  double _maskShaderFadeBottom = double.nan;

  void _paintMask(Canvas canvas, Size size, double topY, double lineHeight) {
    final top = maskHeights.top;
    final bottom = maskHeights.bottom;
    if (top <= 0 && bottom <= 0) return;

    // Align the gradient to the digit clip rect (not the full widget height),
    // so the fade edges land exactly where neighbouring wheel glyphs enter.
    final clipTop = topY - maskHeights.expansionTop;
    final clipHeight = lineHeight + maskHeights.expansionTop + maskHeights.expansionBottom;

    if (_maskShader == null ||
        _maskShaderTop != clipTop ||
        _maskShaderHeight != clipHeight ||
        _maskShaderFadeTop != top ||
        _maskShaderFadeBottom != bottom) {
      _maskShader = ui.Gradient.linear(
        Offset(0, clipTop),
        Offset(0, clipTop + clipHeight),
        const [Color(0x00000000), Color(0xFF000000), Color(0xFF000000), Color(0x00000000)],
        [0.0, (top / clipHeight).clamp(0.0, 1.0), (1 - bottom / clipHeight).clamp(0.0, 1.0), 1.0],
      );
      _maskShaderTop = clipTop;
      _maskShaderHeight = clipHeight;
      _maskShaderFadeTop = top;
      _maskShaderFadeBottom = bottom;
    }

    _maskPaint.shader = _maskShader;
    canvas.drawRect(Rect.fromLTWH(0, clipTop, size.width, clipHeight), _maskPaint);
  }

  void _withOpacity(Canvas canvas, double opacity, VoidCallback draw) {
    if (opacity >= 1.0) {
      draw();
      return;
    }
    // saveLayer captures the paint's alpha at call time, so reusing one Paint is
    // safe (slot opacity layers don't nest within a single slot's draw).
    _opacityPaint.color = Color.fromRGBO(0, 0, 0, opacity);
    canvas.saveLayer(null, _opacityPaint);
    draw();
    canvas.restore();
  }

  @override
  bool shouldRepaint(NumberFlowPainter old) {
    return old.slots != slots ||
        old.metrics != metrics ||
        old.color != color ||
        old.maskEnabled != maskEnabled ||
        old.motionBlur != motionBlur ||
        old.motionBlurThreshold != motionBlurThreshold ||
        old.motionBlurVelocityScale != motionBlurVelocityScale ||
        old.digitSquish != digitSquish ||
        old.wheelSpacing != wheelSpacing ||
        old.maskHeights != maskHeights;
  }
}

/// Digit value for a locale digit char (used when seeding wheels from parts).
int digitValueForChar(String char, int zeroCodePoint) => localeDigitValue(char.codeUnitAt(0), zeroCodePoint);

/// Clears the process-wide glyph [ui.Paragraph] cache used by the painter,
/// disposing the cached paragraphs. Pair with [clearGlyphMetricsCache] if you
/// need to release rendering resources (e.g. on locale/theme teardown in tests).
void clearGlyphParagraphCache() {
  for (final p in NumberFlowPainter._paraCache.values) {
    p.dispose();
  }
  NumberFlowPainter._paraCache.clear();
}
