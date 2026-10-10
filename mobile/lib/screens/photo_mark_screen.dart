import 'dart:async';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

class PhotoMarksResult {
  const PhotoMarksResult(this.annotations);
  final Map<String, dynamic>? annotations;
}

/// Marks are normalized beside the original photo. They are never painted into its
/// bytes; the same geometry renders in the shared report.
class PhotoMarkScreen extends StatefulWidget {
  const PhotoMarkScreen({super.key, required this.image, this.annotations});

  final ImageProvider image;
  final Map<String, dynamic>? annotations;

  @override
  State<PhotoMarkScreen> createState() => _PhotoMarkScreenState();
}

class _PhotoMarkScreenState extends State<PhotoMarkScreen> {
  Future<ui.Image>? _imageFuture;
  late final List<Map<String, dynamic>> _marks = [
    for (final mark
        in (widget.annotations?['marks'] as List<dynamic>? ?? const []))
      Map<String, dynamic>.from(mark as Map),
  ];
  String _shape = 'ring';
  bool _dirty = false;
  Offset? _start;
  Offset? _end;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _imageFuture ??= _resolveImage();
  }

  Future<ui.Image> _resolveImage() {
    final result = Completer<ui.Image>();
    final stream = widget.image.resolve(createLocalImageConfiguration(context));
    late ImageStreamListener listener;
    listener = ImageStreamListener(
      (info, _) {
        stream.removeListener(listener);
        if (!result.isCompleted) result.complete(info.image);
      },
      onError: (Object error, StackTrace? stack) {
        stream.removeListener(listener);
        if (!result.isCompleted) result.completeError(error, stack);
      },
    );
    stream.addListener(listener);
    return result.future;
  }

  double _unit(double value, double extent) =>
      (value / extent).clamp(0.0, 1.0).toDouble();

  void _finish(Size size) {
    final start = _start;
    final end = _end;
    if (start == null || end == null || _marks.length >= 12) return;
    final a = Offset(_unit(start.dx, size.width), _unit(start.dy, size.height));
    final b = Offset(_unit(end.dx, size.width), _unit(end.dy, size.height));
    final mark = _shape == 'ring'
        ? <String, dynamic>{
            'shape': 'ring',
            'cx': (a.dx + b.dx) / 2,
            'cy': (a.dy + b.dy) / 2,
            'rx': math.max((a.dx - b.dx).abs() / 2, 0.01),
            'ry': math.max((a.dy - b.dy).abs() / 2, 0.01),
          }
        : <String, dynamic>{
            'shape': 'arrow',
            'tx': a.dx,
            'ty': a.dy,
            'hx': b.dx,
            'hy': b.dy,
          };
    setState(() {
      _marks.add(mark);
      _dirty = true;
      _start = null;
      _end = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mark photo'),
        actions: [
          FutureBuilder<ui.Image>(
            future: _imageFuture,
            builder: (context, snapshot) {
              final photo = snapshot.data;
              return TextButton(
                onPressed: photo == null
                    ? null
                    : () {
                        Navigator.pop(
                          context,
                          PhotoMarksResult(
                            !_dirty
                                ? widget.annotations
                                : _marks.isEmpty
                                ? null
                                : {
                                    'w': photo.width,
                                    'h': photo.height,
                                    'marks': _marks,
                                  },
                          ),
                        );
                      },
                child: const Text('Save'),
              );
            },
          ),
        ],
      ),
      body: FutureBuilder<ui.Image>(
        future: _imageFuture,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(
              child: Text('Could not open photo: ${snapshot.error}'),
            );
          }
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final photo = snapshot.data!;
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(12),
                child: Text(
                  _shape == 'ring'
                      ? 'Drag around a defect to circle it.'
                      : 'Drag from open space toward a defect to point at it.',
                ),
              ),
              Expanded(
                child: Center(
                  child: LayoutBuilder(
                    builder: (context, limits) {
                      final aspect = photo.width / photo.height;
                      final width = math.min(
                        limits.maxWidth,
                        limits.maxHeight * aspect,
                      );
                      final height = width / aspect;
                      final size = Size(width, height);
                      return SizedBox(
                        width: width,
                        height: height,
                        child: GestureDetector(
                          onPanStart: (details) => setState(() {
                            _start = details.localPosition;
                            _end = details.localPosition;
                          }),
                          onPanUpdate: (details) =>
                              setState(() => _end = details.localPosition),
                          onPanEnd: (_) => _finish(size),
                          child: Stack(
                            fit: StackFit.expand,
                            children: [
                              Image(image: widget.image, fit: BoxFit.fill),
                              CustomPaint(
                                painter: _MarkPainter(
                                  _marks,
                                  preview: _start == null || _end == null
                                      ? null
                                      : (
                                          shape: _shape,
                                          start: _start!,
                                          end: _end!,
                                        ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    SegmentedButton<String>(
                      segments: const [
                        ButtonSegment(
                          value: 'ring',
                          icon: Icon(Icons.circle_outlined),
                          label: Text('Circle'),
                        ),
                        ButtonSegment(
                          value: 'arrow',
                          icon: Icon(Icons.arrow_outward),
                          label: Text('Arrow'),
                        ),
                      ],
                      selected: {_shape},
                      onSelectionChanged: (value) {
                        setState(() => _shape = value.first);
                      },
                    ),
                    const Spacer(),
                    IconButton(
                      onPressed: _marks.isEmpty
                          ? null
                          : () => setState(() {
                              _marks.removeLast();
                              _dirty = true;
                            }),
                      icon: const Icon(Icons.undo),
                      tooltip: 'Undo last mark',
                    ),
                  ],
                ),
              ),
              Text(
                '${_marks.length} of 12 marks',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 12),
            ],
          );
        },
      ),
    );
  }
}

class _MarkPainter extends CustomPainter {
  const _MarkPainter(this.marks, {this.preview});
  final List<Map<String, dynamic>> marks;
  final ({String shape, Offset start, Offset end})? preview;

  @override
  void paint(Canvas canvas, Size size) {
    for (final mark in marks) {
      _paintMark(canvas, size, mark);
    }
    if (preview != null) {
      final a = preview!.start;
      final b = preview!.end;
      if (preview!.shape == 'ring') {
        _paintRim(canvas, Path()..addOval(Rect.fromPoints(a, b)), size);
      } else {
        _paintRim(canvas, _arrow(a, b, size), size);
      }
    }
  }

  void _paintMark(Canvas canvas, Size size, Map<String, dynamic> mark) {
    double n(String key) => (mark[key] as num).toDouble();
    if (mark['shape'] == 'ring') {
      final center = Offset(n('cx') * size.width, n('cy') * size.height);
      final radiusX = n('rx') * size.width;
      final radiusY = n('ry') * size.height;
      _paintRim(
        canvas,
        Path()..addOval(
          Rect.fromCenter(
            center: center,
            width: radiusX * 2,
            height: radiusY * 2,
          ),
        ),
        size,
      );
    } else if (mark['shape'] == 'arrow') {
      final tail = Offset(n('tx') * size.width, n('ty') * size.height);
      final head = Offset(n('hx') * size.width, n('hy') * size.height);
      _paintRim(canvas, _arrow(tail, head, size), size);
    }
  }

  Path _arrow(Offset tail, Offset head, Size size) {
    final angle = math.atan2(head.dy - tail.dy, head.dx - tail.dx);
    final length = math.max(14.0, math.min(size.width, size.height) / 20);
    return Path()
      ..moveTo(tail.dx, tail.dy)
      ..lineTo(head.dx, head.dy)
      ..moveTo(
        head.dx - length * math.cos(angle - 0.45),
        head.dy - length * math.sin(angle - 0.45),
      )
      ..lineTo(head.dx, head.dy)
      ..lineTo(
        head.dx - length * math.cos(angle + 0.45),
        head.dy - length * math.sin(angle + 0.45),
      );
  }

  void _paintRim(Canvas canvas, Path path, Size size) {
    final width = math.max(2.0, math.min(size.width, size.height) / 100);
    canvas.drawPath(
      path,
      Paint()
        ..color = Colors.white
        ..style = PaintingStyle.stroke
        ..strokeWidth = width * 2.2
        ..strokeJoin = StrokeJoin.round,
    );
    canvas.drawPath(
      path,
      Paint()
        ..color = Colors.red
        ..style = PaintingStyle.stroke
        ..strokeWidth = width
        ..strokeJoin = StrokeJoin.round,
    );
  }

  @override
  bool shouldRepaint(covariant _MarkPainter oldDelegate) => true;
}
