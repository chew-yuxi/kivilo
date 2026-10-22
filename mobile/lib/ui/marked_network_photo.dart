import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../screens/photo_mark_screen.dart';
import 'kivilo_theme.dart';

class MarkedNetworkPhoto extends StatelessWidget {
  const MarkedNetworkPhoto({
    super.key,
    required this.url,
    this.annotations,
    this.fit = BoxFit.cover,
    this.semanticLabel,
    this.cacheWidth,
  });

  final String url;
  final Map<String, dynamic>? annotations;
  final BoxFit fit;
  final String? semanticLabel;
  final int? cacheWidth;

  @override
  Widget build(BuildContext context) => MarkedPhoto(
    image: NetworkImage(url),
    annotations: annotations,
    fit: fit,
    semanticLabel: semanticLabel,
    cacheWidth: cacheWidth,
    errorIcon: Icons.broken_image_outlined,
  );
}

/// Keeps a decoded photo visible while its local source hands over to storage.
/// Callers key each photo by its identity so another photo never inherits its frame.
/// Marks share the image's contained box and never alter the original bytes.
class MarkedPhoto extends StatelessWidget {
  const MarkedPhoto({
    super.key,
    required this.image,
    this.annotations,
    this.fit = BoxFit.cover,
    this.semanticLabel,
    this.cacheWidth,
    this.errorIcon = Icons.broken_image,
  });

  final ImageProvider image;
  final Map<String, dynamic>? annotations;
  final BoxFit fit;
  final String? semanticLabel;
  final int? cacheWidth;
  final IconData errorIcon;

  List<Map<String, dynamic>> get _marks =>
      ((annotations?['marks'] as List<dynamic>?) ?? const [])
          .cast<Map<String, dynamic>>();

  Widget _image(BoxFit imageFit) => Image(
    image: ResizeImage.resizeIfNeeded(cacheWidth, null, image),
    fit: imageFit,
    gaplessPlayback: true,
    semanticLabel: semanticLabel,
    errorBuilder: (_, _, _) => ColoredBox(
      color: KiviloColors.canvas,
      child: Icon(errorIcon, color: KiviloColors.subtle),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final width = (annotations?['w'] as num?)?.toDouble();
    final height = (annotations?['h'] as num?)?.toDouble();
    final marks = _marks;
    final marked = marks.isNotEmpty && width != null && height != null;

    return LayoutBuilder(
      builder: (context, limits) {
        double? photoWidth = limits.hasTightWidth ? limits.maxWidth : null;
        double? photoHeight = limits.hasTightHeight ? limits.maxHeight : null;
        if (marked) {
          final maxWidth = limits.hasBoundedWidth ? limits.maxWidth : width;
          final maxHeight = limits.hasBoundedHeight ? limits.maxHeight : height;
          final scale = math.min(maxWidth / width, maxHeight / height);
          photoWidth = width * scale;
          photoHeight = height * scale;
        }
        return Center(
          widthFactor: 1,
          heightFactor: 1,
          child: SizedBox(
            width: photoWidth,
            height: photoHeight,
            child: Stack(
              fit: marked ? StackFit.expand : StackFit.passthrough,
              children: [
                _image(marked ? BoxFit.fill : fit),
                if (marked)
                  Positioned.fill(
                    child: CustomPaint(painter: MarkPainter(marks)),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}
