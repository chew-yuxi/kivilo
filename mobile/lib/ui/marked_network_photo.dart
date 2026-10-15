import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../screens/photo_mark_screen.dart';
import 'kivilo_theme.dart';

/// Draws saved geometry over the untouched photo. A marked photo always uses contain
/// sizing so the image and painter share the exact same box and the marks cannot drift.
class MarkedNetworkPhoto extends StatelessWidget {
  const MarkedNetworkPhoto({
    super.key,
    required this.url,
    this.annotations,
    this.fit = BoxFit.cover,
    this.semanticLabel,
  });

  final String url;
  final Map<String, dynamic>? annotations;
  final BoxFit fit;
  final String? semanticLabel;

  List<Map<String, dynamic>> get _marks =>
      ((annotations?['marks'] as List<dynamic>?) ?? const [])
          .cast<Map<String, dynamic>>();

  Widget _image(BoxFit imageFit) => Image.network(
    url,
    fit: imageFit,
    gaplessPlayback: true,
    semanticLabel: semanticLabel,
    errorBuilder: (_, _, _) => const ColoredBox(
      color: KiviloColors.canvas,
      child: Icon(Icons.broken_image_outlined, color: KiviloColors.subtle),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final width = (annotations?['w'] as num?)?.toDouble();
    final height = (annotations?['h'] as num?)?.toDouble();
    if (_marks.isEmpty || width == null || height == null) return _image(fit);

    return LayoutBuilder(
      builder: (context, limits) {
        final maxWidth = limits.hasBoundedWidth ? limits.maxWidth : width;
        final maxHeight = limits.hasBoundedHeight ? limits.maxHeight : height;
        final scale = math.min(maxWidth / width, maxHeight / height);
        return Center(
          child: SizedBox(
            width: width * scale,
            height: height * scale,
            child: Stack(
              fit: StackFit.expand,
              children: [
                _image(BoxFit.fill),
                CustomPaint(painter: MarkPainter(_marks)),
              ],
            ),
          ),
        );
      },
    );
  }
}
