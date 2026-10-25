import 'dart:async';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api_failure.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';

/// A photo-level action shown beside Save, such as a note or retake.
class PhotoMarkAction {
  const PhotoMarkAction({
    required this.icon,
    required this.label,
    required this.onPressed,
  });

  final IconData icon;
  final String label;

  /// Runs after pending marks are written. Returns true to close the editor.
  final Future<bool> Function() onPressed;
}

class PhotoMarksResult {
  const PhotoMarksResult(this.annotations);
  final Map<String, dynamic>? annotations;
}

enum _MarkEditAction { done, redraw, delete }

typedef _MarkEditResult = ({_MarkEditAction action, String note});

/// Marks are normalized beside the original photo. They are never painted into its
/// bytes; the same geometry renders in the shared report.
class PhotoMarkScreen extends StatefulWidget {
  const PhotoMarkScreen({
    super.key,
    required this.image,
    this.annotations,
    this.onChanged,
    this.saveLabel = 'Save',
    this.actions = const [],
  });

  final ImageProvider image;
  final Map<String, dynamic>? annotations;

  /// New captures persist each completed mark locally before upload is released.
  final Future<void> Function(Map<String, dynamic>?)? onChanged;
  final String saveLabel;
  final List<PhotoMarkAction> actions;

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
  int? _selectedIndex;
  int? _redrawIndex;
  final List<Offset> _gesture = [];
  final List<List<Map<String, dynamic>>> _undoHistory = [];
  final List<List<Map<String, dynamic>>> _redoHistory = [];
  Future<void> _writes = Future.value();
  bool _saving = false;
  bool _acting = false;
  bool _canClose = false;
  bool _imageFailed = false;
  String? _saveError;

  Map<String, dynamic>? _annotations(ui.Image photo) => !_dirty
      ? widget.annotations
      : _marks.isEmpty
      ? null
      : {'w': photo.width, 'h': photo.height, 'marks': _snapshotMarks()};

  void _persistDraft() {
    final persist = widget.onChanged;
    if (persist == null) return;
    // Snapshot before another gesture or note changes the same maps.
    final marks = _snapshotMarks();
    _writes = _writes.then((_) async {
      try {
        final photo = await _imageFuture!;
        await persist(
          marks.isEmpty
              ? null
              : {'w': photo.width, 'h': photo.height, 'marks': marks},
        );
        if (mounted) setState(() => _saveError = null);
      } catch (error) {
        if (mounted) setState(() => _saveError = plainError(error));
      }
    });
  }

  Future<void> _saveAndClose() async {
    if (_saving) return;
    setState(() => _saving = true);
    try {
      final photo = await _imageFuture!;
      await _writes;
      final annotations = _annotations(photo);
      await widget.onChanged?.call(annotations);
      if (!mounted) return;
      setState(() => _canClose = true);
      // PopScope must rebuild before Android's back action can complete.
      await WidgetsBinding.instance.endOfFrame;
      if (mounted) Navigator.pop(context, PhotoMarksResult(annotations));
    } catch (error) {
      if (mounted) setState(() => _saveError = plainError(error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  List<Map<String, dynamic>> _snapshotMarks() => [
    for (final mark in _marks) Map<String, dynamic>.from(mark),
  ];

  void _recordChange() {
    _undoHistory.add(_snapshotMarks());
    _redoHistory.clear();
  }

  void _restoreMarks(List<Map<String, dynamic>> marks) {
    _marks
      ..clear()
      ..addAll([for (final mark in marks) Map<String, dynamic>.from(mark)]);
    _gesture.clear();
    _selectedIndex = null;
    _redrawIndex = null;
    _dirty = true;
  }

  void _undo() {
    if (_undoHistory.isEmpty) return;
    setState(() {
      _redoHistory.add(_snapshotMarks());
      _restoreMarks(_undoHistory.removeLast());
    });
    _persistDraft();
  }

  void _redo() {
    if (_redoHistory.isEmpty) return;
    setState(() {
      _undoHistory.add(_snapshotMarks());
      _restoreMarks(_redoHistory.removeLast());
    });
    _persistDraft();
  }

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
        if (mounted) setState(() => _imageFailed = true);
        if (!result.isCompleted) result.completeError(error, stack);
      },
    );
    stream.addListener(listener);
    return result.future;
  }

  double _unit(double value, double extent) =>
      (value / extent).clamp(0.0, 1.0).toDouble();

  void _startGesture(Offset point) {
    if (_marks.length >= 12 && _redrawIndex == null) return;
    setState(() {
      _selectedIndex = null;
      _gesture
        ..clear()
        ..add(point);
    });
  }

  void _updateGesture(Offset point) {
    if (_gesture.isEmpty) return;
    setState(() => _gesture.add(point));
  }

  Future<void> _finishGesture(Size size) async {
    final bounds = _gesture.isEmpty
        ? Rect.zero
        : _gesture
              .skip(1)
              .fold(
                Rect.fromCircle(center: _gesture.first, radius: 0),
                (rect, point) => rect.expandToInclude(
                  Rect.fromCircle(center: point, radius: 0),
                ),
              );
    final tooSmall = _shape == 'ring'
        ? math.max(bounds.width, bounds.height) < 10
        : _gesture.length < 2 || (_gesture.last - _gesture.first).distance < 10;
    if (_gesture.length < 2 || tooSmall) {
      setState(() => _gesture.clear());
      return;
    }

    final existingNote = _redrawIndex == null
        ? null
        : _marks[_redrawIndex!]['note'] as String?;
    final mark = switch (_shape) {
      'ring' => _ringFromGesture(size, note: existingNote),
      'arrow' => _arrowFromGesture(size, note: existingNote),
      _ => _freehandFromGesture(size, note: existingNote),
    };
    final index = _redrawIndex ?? _marks.length;
    setState(() {
      _recordChange();
      if (_redrawIndex == null) {
        _marks.add(mark);
      } else {
        _marks[_redrawIndex!] = mark;
      }
      _gesture.clear();
      _redrawIndex = null;
      _selectedIndex = index;
      _dirty = true;
    });
    _persistDraft();
    await _editMark(index, newMark: existingNote == null);
  }

  Map<String, dynamic> _ringFromGesture(Size size, {String? note}) {
    var left = _gesture.first.dx;
    var right = left;
    var top = _gesture.first.dy;
    var bottom = top;
    for (final point in _gesture.skip(1)) {
      left = math.min(left, point.dx);
      right = math.max(right, point.dx);
      top = math.min(top, point.dy);
      bottom = math.max(bottom, point.dy);
    }
    final width = math.max(right - left, 18.0);
    final height = math.max(bottom - top, 18.0);
    return <String, dynamic>{
      'shape': 'ring',
      'cx': _unit((left + right) / 2, size.width),
      'cy': _unit((top + bottom) / 2, size.height),
      'rx': _unit(width / 2, size.width),
      'ry': _unit(height / 2, size.height),
      if (note != null && note.isNotEmpty) 'note': note,
    };
  }

  Map<String, dynamic> _arrowFromGesture(Size size, {String? note}) =>
      <String, dynamic>{
        'shape': 'arrow',
        'tx': _unit(_gesture.first.dx, size.width),
        'ty': _unit(_gesture.first.dy, size.height),
        'hx': _unit(_gesture.last.dx, size.width),
        'hy': _unit(_gesture.last.dy, size.height),
        if (note != null && note.isNotEmpty) 'note': note,
      };

  Map<String, dynamic> _freehandFromGesture(Size size, {String? note}) {
    final spaced = <Offset>[_gesture.first];
    for (final point in _gesture.skip(1)) {
      if ((point - spaced.last).distance >= 2) spaced.add(point);
    }
    if (spaced.last != _gesture.last) spaced.add(_gesture.last);
    final points = spaced.length <= 256
        ? spaced
        : [
            for (var index = 0; index < 256; index++)
              spaced[(index * (spaced.length - 1) / 255).round()],
          ];
    return <String, dynamic>{
      'shape': 'freehand',
      'points': [
        for (final point in points)
          {'x': _unit(point.dx, size.width), 'y': _unit(point.dy, size.height)},
      ],
      if (note != null && note.isNotEmpty) 'note': note,
    };
  }

  void _selectMark(Offset point, Size size) {
    final index = _hitTest(point, size);
    setState(() => _selectedIndex = index);
    if (index != null) unawaited(_editMark(index));
  }

  int? _hitTest(Offset point, Size size) {
    for (var index = _marks.length - 1; index >= 0; index--) {
      final mark = _marks[index];
      double n(String key) => (mark[key] as num).toDouble();
      if (mark['shape'] == 'ring') {
        final center = Offset(n('cx') * size.width, n('cy') * size.height);
        final rx = math.max(n('rx') * size.width, 1);
        final ry = math.max(n('ry') * size.height, 1);
        final normalized = math.sqrt(
          math.pow((point.dx - center.dx) / rx, 2) +
              math.pow((point.dy - center.dy) / ry, 2),
        );
        final tolerance = 24 / math.max(rx, ry);
        if ((normalized - 1).abs() <= tolerance || normalized < 1) {
          return index;
        }
      } else if (mark['shape'] == 'arrow') {
        final tail = Offset(n('tx') * size.width, n('ty') * size.height);
        final head = Offset(n('hx') * size.width, n('hy') * size.height);
        if (_distanceToSegment(point, tail, head) <= 28) return index;
      } else {
        final points = (mark['points'] as List<dynamic>)
            .map((value) => value as Map<dynamic, dynamic>)
            .map(
              (value) => Offset(
                (value['x'] as num).toDouble() * size.width,
                (value['y'] as num).toDouble() * size.height,
              ),
            )
            .toList();
        for (var pointIndex = 1; pointIndex < points.length; pointIndex++) {
          if (_distanceToSegment(
                point,
                points[pointIndex - 1],
                points[pointIndex],
              ) <=
              28) {
            return index;
          }
        }
      }
    }
    return null;
  }

  double _distanceToSegment(Offset point, Offset a, Offset b) {
    final segment = b - a;
    final lengthSquared = segment.dx * segment.dx + segment.dy * segment.dy;
    if (lengthSquared == 0) return (point - a).distance;
    final t =
        (((point - a).dx * segment.dx + (point - a).dy * segment.dy) /
                lengthSquared)
            .clamp(0.0, 1.0);
    return (point - (a + segment * t)).distance;
  }

  Future<void> _editMark(int index, {bool newMark = false}) async {
    if (!mounted || index >= _marks.length) return;
    final result = await showKiviloDrawer<_MarkEditResult>(
      context: context,
      builder: (context) => _MarkEditorDrawer(
        index: index,
        newMark: newMark,
        initialNote: _marks[index]['note'] as String? ?? '',
      ),
    );
    if (!mounted || index >= _marks.length) return;
    if (result?.action == _MarkEditAction.delete) {
      setState(() {
        _recordChange();
        _marks.removeAt(index);
        _selectedIndex = null;
        _dirty = true;
      });
      _persistDraft();
      return;
    }
    if (result?.action == _MarkEditAction.redraw) {
      setState(() {
        _shape = _marks[index]['shape'] as String;
        _selectedIndex = index;
        _redrawIndex = index;
      });
      return;
    }
    if (result?.action == _MarkEditAction.done) {
      final note = result!.note.trim();
      final previousNote = _marks[index]['note'] as String? ?? '';
      if (note == previousNote) return;
      setState(() {
        if (!newMark) _recordChange();
        if (note.isEmpty) {
          _marks[index].remove('note');
        } else {
          _marks[index]['note'] = note;
        }
        _selectedIndex = index;
        _dirty = true;
      });
      _persistDraft();
    }
  }

  Future<void> _runAction(PhotoMarkAction action) async {
    if (_saving || _acting) return;
    _acting = true;
    final bool close;
    try {
      await _writes;
      close = await action.onPressed();
    } finally {
      _acting = false;
    }
    if (!close || !mounted) return;
    setState(() => _canClose = true);
    await WidgetsBinding.instance.endOfFrame;
    if (mounted) Navigator.pop(context);
  }

  String get _hint => _redrawIndex != null
      ? 'Redraw mark ${_redrawIndex! + 1}'
      : _marks.length >= 12
      ? 'This photo has the most marks it can hold, 12'
      : _marks.isNotEmpty
      ? 'Tap a mark to add a note or change it'
      : switch (_shape) {
          'ring' => 'Draw around the issue',
          'arrow' => 'Draw from open space toward the issue',
          _ => 'Draw over the detail',
        };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return PopScope(
      canPop:
          _canClose || (!_saving && (widget.onChanged == null || _imageFailed)),
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) unawaited(_saveAndClose());
      },
      child: AbsorbPointer(
        absorbing: _saving,
        child: Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.black,
            foregroundColor: Colors.white,
            surfaceTintColor: Colors.transparent,
            systemOverlayStyle: SystemUiOverlayStyle.light,
            titleTextStyle: theme.appBarTheme.titleTextStyle?.copyWith(
              color: Colors.white,
            ),
            // Labelled photo actions need the room a title would take.
            title: widget.actions.isEmpty ? const Text('Mark photo') : null,
            toolbarHeight: widget.actions.isEmpty ? null : 64,
            actions: [
              for (final action in widget.actions)
                SizedBox(
                  width: 64,
                  child: _Tool(
                    icon: action.icon,
                    label: action.label,
                    onPressed: _saving ? null : () => _runAction(action),
                  ),
                ),
              Padding(
                padding: const EdgeInsets.only(left: 4, right: 12),
                child: FutureBuilder<ui.Image>(
                  future: _imageFuture,
                  builder: (context, snapshot) {
                    final photo = snapshot.data;
                    return FilledButton(
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(0, 40),
                      ),
                      onPressed: photo == null || _saving
                          ? null
                          : _saveAndClose,
                      child: Text(_saving ? 'Saving…' : widget.saveLabel),
                    );
                  },
                ),
              ),
            ],
          ),
          body: FutureBuilder<ui.Image>(
            future: _imageFuture,
            builder: (context, snapshot) {
              if (snapshot.hasError) {
                return Center(
                  child: Padding(
                    padding: kiviloScreenPadding,
                    child: Text(
                      'Could not open this photo. ${plainError(snapshot.error!)}',
                      style: const TextStyle(color: Colors.white),
                    ),
                  ),
                );
              }
              if (!snapshot.hasData) {
                return const Center(
                  child: CircularProgressIndicator(color: Colors.white),
                );
              }
              final photo = snapshot.data!;
              return SafeArea(
                top: false,
                child: Column(
                  children: [
                    if (_saveError != null)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                        child: Text(
                          'Could not save marks. $_saveError',
                          style: const TextStyle(color: KiviloColors.redBorder),
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
                                behavior: HitTestBehavior.opaque,
                                onTapUp: (details) =>
                                    _selectMark(details.localPosition, size),
                                onPanStart: (details) =>
                                    _startGesture(details.localPosition),
                                onPanUpdate: (details) =>
                                    _updateGesture(details.localPosition),
                                onPanEnd: (_) =>
                                    unawaited(_finishGesture(size)),
                                child: Stack(
                                  fit: StackFit.expand,
                                  children: [
                                    Image(
                                      image: widget.image,
                                      fit: BoxFit.fill,
                                    ),
                                    CustomPaint(
                                      painter: MarkPainter(
                                        _marks,
                                        selectedIndex: _selectedIndex,
                                        previewShape: _shape,
                                        previewPoints: _gesture,
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
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                      child: Text(
                        _hint,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.white70),
                      ),
                    ),
                    if (_marks.isNotEmpty)
                      SizedBox(
                        height: 56,
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                          scrollDirection: Axis.horizontal,
                          itemCount: _marks.length,
                          separatorBuilder: (_, _) => const SizedBox(width: 8),
                          itemBuilder: (context, index) {
                            final note = _marks[index]['note'] as String?;
                            final selected = _selectedIndex == index;
                            return Material(
                              color: selected
                                  ? KiviloColors.pink
                                  : Colors.white12,
                              borderRadius: BorderRadius.circular(12),
                              child: InkWell(
                                onTap: () => unawaited(_editMark(index)),
                                borderRadius: BorderRadius.circular(12),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(
                                        switch (_marks[index]['shape']) {
                                          'ring' => Icons.circle_outlined,
                                          'arrow' => Icons.arrow_outward,
                                          _ => Icons.gesture,
                                        },
                                        size: 18,
                                        color: Colors.white,
                                      ),
                                      const SizedBox(width: 8),
                                      ConstrainedBox(
                                        constraints: const BoxConstraints(
                                          maxWidth: 240,
                                        ),
                                        child: Text(
                                          note == null || note.isEmpty
                                              ? 'Mark ${index + 1}'
                                              : '${index + 1}. $note',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                      child: Row(
                        children: [
                          for (final (shape, icon, label) in const [
                            ('ring', Icons.circle_outlined, 'Circle'),
                            ('arrow', Icons.arrow_outward, 'Arrow'),
                            ('freehand', Icons.gesture, 'Freehand'),
                          ])
                            Expanded(
                              child: _Tool(
                                icon: icon,
                                label: label,
                                selected: _shape == shape,
                                onPressed: _redrawIndex == null
                                    ? () => setState(() => _shape = shape)
                                    : null,
                              ),
                            ),
                          const SizedBox(
                            height: 32,
                            child: VerticalDivider(color: Colors.white24),
                          ),
                          Expanded(
                            child: _Tool(
                              icon: Icons.undo,
                              label: 'Undo',
                              onPressed: _undoHistory.isEmpty ? null : _undo,
                            ),
                          ),
                          Expanded(
                            child: _Tool(
                              icon: Icons.redo,
                              label: 'Redo',
                              onPressed: _redoHistory.isEmpty ? null : _redo,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

/// A white icon and label for the black photo screens, where the pink-filled
/// buttons of the rest of the app would read as a form instead of a tool.
class _Tool extends StatelessWidget {
  const _Tool({
    required this.icon,
    required this.label,
    required this.onPressed,
    this.selected = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onPressed;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final color = onPressed == null
        ? Colors.white38
        : selected
        ? KiviloColors.pink
        : Colors.white;
    return Semantics(
      button: true,
      selected: selected,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(12),
        child: Ink(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: selected ? Colors.white12 : null,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: color, size: 24),
              const SizedBox(height: 4),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: color,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MarkEditorDrawer extends StatefulWidget {
  const _MarkEditorDrawer({
    required this.index,
    required this.newMark,
    required this.initialNote,
  });

  final int index;
  final bool newMark;
  final String initialNote;

  @override
  State<_MarkEditorDrawer> createState() => _MarkEditorDrawerState();
}

class _MarkEditorDrawerState extends State<_MarkEditorDrawer> {
  late final TextEditingController _controller = TextEditingController(
    text: widget.initialNote,
  );

  void _close(_MarkEditAction action) {
    Navigator.pop(context, (action: action, note: _controller.text));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return KiviloDrawer(
      title: Text(
        widget.newMark
            ? 'Add a note to mark ${widget.index + 1}'
            : 'Edit mark ${widget.index + 1}',
      ),
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            widget.newMark
                ? 'Say what this mark identifies.'
                : 'Update its note, redraw its position, or remove it.',
          ),
          const SizedBox(height: 18),
          TextField(
            controller: _controller,
            autofocus: widget.newMark,
            minLines: 3,
            maxLines: 6,
            maxLength: 500,
            decoration: const InputDecoration(
              labelText: 'Note',
              hintText: 'For example: hairline crack above socket',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: () => _close(_MarkEditAction.done),
            child: const Text('Save mark'),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _close(_MarkEditAction.redraw),
                  icon: const Icon(Icons.gesture),
                  label: const Text('Redraw'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextButton.icon(
                  onPressed: () => _close(_MarkEditAction.delete),
                  icon: const Icon(Icons.delete_outline),
                  label: const Text('Delete'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Draws marks over a photo laid out at exactly the image's box. Shared by the editor
/// and the signed report, so a ring looks the same wherever it is read.
class MarkPainter extends CustomPainter {
  const MarkPainter(
    this.marks, {
    this.selectedIndex,
    this.previewShape = 'ring',
    this.previewPoints = const [],
  });

  final List<Map<String, dynamic>> marks;
  final int? selectedIndex;
  final String previewShape;
  final List<Offset> previewPoints;

  @override
  void paint(Canvas canvas, Size size) {
    for (var index = 0; index < marks.length; index++) {
      _paintMark(
        canvas,
        size,
        marks[index],
        number: index + 1,
        selected: selectedIndex == index,
      );
    }
    if (previewPoints.length > 1) {
      final path = Path()
        ..moveTo(previewPoints.first.dx, previewPoints.first.dy);
      if (previewShape == 'ring' || previewShape == 'freehand') {
        for (final point in previewPoints.skip(1)) {
          path.lineTo(point.dx, point.dy);
        }
      } else {
        path.addPath(
          _arrow(previewPoints.first, previewPoints.last, size),
          Offset.zero,
        );
      }
      _paintRim(canvas, path, size, selected: false);
    }
  }

  void _paintMark(
    Canvas canvas,
    Size size,
    Map<String, dynamic> mark, {
    required int number,
    required bool selected,
  }) {
    double n(String key) => (mark[key] as num).toDouble();
    late final Path path;
    late final Offset selectionDot;
    if (mark['shape'] == 'ring') {
      final center = Offset(n('cx') * size.width, n('cy') * size.height);
      final radiusX = n('rx') * size.width;
      final radiusY = n('ry') * size.height;
      path = Path()
        ..addOval(
          Rect.fromCenter(
            center: center,
            width: radiusX * 2,
            height: radiusY * 2,
          ),
        );
      selectionDot = Offset(center.dx - radiusX, center.dy - radiusY);
    } else if (mark['shape'] == 'arrow') {
      final tail = Offset(n('tx') * size.width, n('ty') * size.height);
      final head = Offset(n('hx') * size.width, n('hy') * size.height);
      path = _arrow(tail, head, size);
      selectionDot = tail;
    } else {
      final points = (mark['points'] as List<dynamic>)
          .map((value) => value as Map<dynamic, dynamic>)
          .map(
            (value) => Offset(
              (value['x'] as num).toDouble() * size.width,
              (value['y'] as num).toDouble() * size.height,
            ),
          )
          .toList();
      path = Path()..moveTo(points.first.dx, points.first.dy);
      for (final point in points.skip(1)) {
        path.lineTo(point.dx, point.dy);
      }
      selectionDot = points.first;
    }
    _paintRim(canvas, path, size, selected: selected);
    final badgeColor = selected ? const Color(0xFF2563EB) : Colors.red;
    canvas.drawCircle(selectionDot, 11, Paint()..color = Colors.white);
    canvas.drawCircle(selectionDot, 9, Paint()..color = badgeColor);
    final label = TextPainter(
      text: TextSpan(
        text: '$number',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    label.paint(
      canvas,
      selectionDot - Offset(label.width / 2, label.height / 2),
    );
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

  void _paintRim(
    Canvas canvas,
    Path path,
    Size size, {
    required bool selected,
  }) {
    final width = math.max(2.0, math.min(size.width, size.height) / 100);
    canvas.drawPath(
      path,
      Paint()
        ..color = Colors.white
        ..style = PaintingStyle.stroke
        ..strokeWidth = width * 2.2
        ..strokeJoin = StrokeJoin.round
        ..strokeCap = StrokeCap.round,
    );
    canvas.drawPath(
      path,
      Paint()
        ..color = selected ? const Color(0xFF2563EB) : Colors.red
        ..style = PaintingStyle.stroke
        ..strokeWidth = width
        ..strokeJoin = StrokeJoin.round
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(covariant MarkPainter oldDelegate) => true;
}
