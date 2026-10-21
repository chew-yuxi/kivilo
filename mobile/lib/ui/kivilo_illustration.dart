import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../services/illustration_cache.dart';
export '../services/illustration_cache.dart' show KiviloScene;

/// Public decorative artwork; adjacent copy remains usable without a connection.
class KiviloIllustration extends StatefulWidget {
  const KiviloIllustration({
    super.key,
    required this.scene,
    this.width,
    this.height,
    this.cache,
  });

  final KiviloScene scene;
  final double? width;
  final double? height;
  final IllustrationCache? cache;

  @override
  State<KiviloIllustration> createState() => _KiviloIllustrationState();
}

class _KiviloIllustrationState extends State<KiviloIllustration>
    with WidgetsBindingObserver {
  static final _sharedCache = IllustrationCache();
  String? _filename;
  Future<File>? _future;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didUpdateWidget(KiviloIllustration oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_failed || widget.cache != oldWidget.cache) _filename = null;
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _failed) {
      setState(() => _filename = null);
    }
  }

  @override
  Widget build(BuildContext context) => IgnorePointer(
    child: LayoutBuilder(
      builder: (context, constraints) {
        final empty = SizedBox(width: widget.width, height: widget.height);
        final cache = widget.cache ?? _sharedCache;
        if (!cache.available) return empty;
        final source = widget.scene.large;
        final availableWidth =
            widget.width ??
            (constraints.hasBoundedWidth
                ? constraints.maxWidth
                : source.width.toDouble());
        final availableHeight =
            widget.height ??
            (constraints.hasBoundedHeight
                ? constraints.maxHeight
                : source.height.toDouble());
        final scale = math.min(
          availableWidth / source.width,
          availableHeight / source.height,
        );
        final physicalWidth =
            (source.width * scale * MediaQuery.devicePixelRatioOf(context))
                .ceil();
        final variant = physicalWidth <= widget.scene.small.width
            ? widget.scene.small
            : source;
        if (_filename != variant.filename) {
          _filename = variant.filename;
          _failed = false;
          _future = cache.load(variant);
        }
        return FutureBuilder<File>(
          key: ValueKey(_filename),
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) return empty;
            if (snapshot.hasError) {
              final error = snapshot.error!;
              if (error is! IllustrationUnavailable) {
                Error.throwWithStackTrace(error, snapshot.stackTrace!);
              }
              _failed = true;
              return empty;
            }
            if (!snapshot.hasData) return empty;
            _failed = false;
            return Image.file(
              snapshot.data!,
              width: widget.width,
              height: widget.height,
              cacheWidth: physicalWidth.clamp(1, variant.width),
              fit: BoxFit.contain,
              excludeFromSemantics: true,
              errorBuilder: (_, _, _) {
                _failed = true;
                return empty;
              },
            );
          },
        );
      },
    ),
  );
}
