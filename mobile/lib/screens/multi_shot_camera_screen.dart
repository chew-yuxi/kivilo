import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/camera_startup.dart';
import '../services/capture_queue.dart';
import '../services/capture_store.dart';
import '../ui/marked_network_photo.dart';
import 'photo_mark_screen.dart';

class MultiShotCameraScreen extends StatefulWidget {
  const MultiShotCameraScreen({
    super.key,
    required this.inspectionId,
    required this.roomId,
    required this.ownerId,
    required this.root,
    required this.queue,
    required this.title,
    this.itemId,
  });

  final String inspectionId;
  final String roomId;
  final String ownerId;
  final String? itemId;
  final Directory root;
  final CaptureQueue queue;
  final String title;

  @override
  State<MultiShotCameraScreen> createState() => _MultiShotCameraScreenState();
}

class _MultiShotCameraScreenState extends State<MultiShotCameraScreen>
    with WidgetsBindingObserver {
  final _startup = CameraStartup();
  CameraController? _camera;
  List<CameraDescription> _cameras = const [];
  List<PendingCapture> _drafts = const [];
  int _cameraIndex = 0;
  bool _selectedInitialCamera = false;
  bool _foreground = true;
  bool _saving = false;
  bool _closing = false;
  FlashMode _flash = FlashMode.off;
  double _baseZoom = 1;
  double _zoom = 1;
  double _minZoom = 1;
  double _maxZoom = 1;
  int _pointers = 0;
  String? _error;
  String? _replacementNote;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    unawaited(_initialize());
  }

  Future<void> _initialize() async {
    await _loadDrafts();
    await _startup.open(_openCamera, explicitRetry: true);
  }

  Future<void> _loadDrafts() async {
    final rows = await widget.queue.forRoom(widget.roomId, widget.ownerId);
    if (!mounted) return;
    setState(() {
      _drafts =
          rows
              .where(
                (row) =>
                    row.inspectionId == widget.inspectionId &&
                    row.kind == 'PHOTO' &&
                    row.awaitingMarkup &&
                    !row.deleteRequested &&
                    row.itemId == widget.itemId,
              )
              .toList()
            ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
    });
  }

  Future<bool> _openCamera() async {
    if (!mounted || !_foreground || _closing) return false;
    CameraController? next;
    try {
      _cameras = await availableCameras();
      if (_cameras.isEmpty) throw StateError('No camera is available.');
      if (!_selectedInitialCamera) {
        final back = _cameras.indexWhere(
          (camera) => camera.lensDirection == CameraLensDirection.back,
        );
        _cameraIndex = back < 0 ? 0 : back;
        _selectedInitialCamera = true;
      }
      if (_cameraIndex >= _cameras.length) _cameraIndex = 0;
      next = CameraController(
        _cameras[_cameraIndex],
        ResolutionPreset.high,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );
      await next.initialize();
      final minZoom = await next.getMinZoomLevel();
      final maxZoom = await next.getMaxZoomLevel();
      if (!mounted || !_foreground || _closing) return false;
      final old = _camera;
      setState(() {
        _camera = next;
        _minZoom = minZoom;
        _maxZoom = maxZoom;
        _zoom = minZoom;
        _error = null;
      });
      next = null;
      await old?.dispose();
      return true;
    } on CameraException catch (error) {
      if (error.code.startsWith('CameraAccessDenied')) {
        _startup.markPermissionDenied();
      }
      if (mounted) {
        setState(() {
          _error = error.code.startsWith('CameraAccessDenied')
              ? 'Camera access is off. Enable it in Settings, then retry.'
              : 'Camera unavailable: ${error.description ?? error.code}';
        });
      }
      return false;
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
      return false;
    } finally {
      await next?.dispose();
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive) {
      _foreground = false;
      final camera = _camera;
      _camera = null;
      unawaited(camera?.dispose());
    } else if (state == AppLifecycleState.resumed) {
      _foreground = true;
      unawaited(_startup.open(_openCamera));
    }
  }

  Future<void> _takePhoto() async {
    final camera = _camera;
    if (_saving || camera == null || !camera.value.isInitialized) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final clientId = newCaptureId();
      final photo = await camera.takePicture();
      final id = await CaptureStore(queue: widget.queue, root: widget.root)
          .save(
            source: File(photo.path),
            ownerId: widget.ownerId,
            inspectionId: widget.inspectionId,
            roomId: widget.roomId,
            itemId: widget.itemId,
            kind: 'PHOTO',
            extension: 'jpg',
            mimeType: 'image/jpeg',
            clientId: clientId,
            awaitingMarkup: true,
          );
      if (_replacementNote case final note?) {
        await widget.queue.setNote(id, note);
        _replacementNote = null;
      }
      await _loadDrafts();
      await HapticFeedback.mediumImpact();
    } catch (error) {
      if (mounted) setState(() => _error = 'Photo could not be saved: $error');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _toggleFlash() async {
    final camera = _camera;
    if (camera == null) return;
    final next = switch (_flash) {
      FlashMode.off => FlashMode.auto,
      FlashMode.auto => FlashMode.always,
      _ => FlashMode.off,
    };
    try {
      await camera.setFlashMode(next);
      if (mounted) setState(() => _flash = next);
    } on CameraException catch (error) {
      if (mounted) setState(() => _error = error.description ?? error.code);
    }
  }

  Future<void> _switchCamera() async {
    if (_saving || _cameras.length < 2) return;
    _cameraIndex = (_cameraIndex + 1) % _cameras.length;
    final old = _camera;
    setState(() => _camera = null);
    await old?.dispose();
    await _startup.open(_openCamera, explicitRetry: true);
  }

  Future<void> _review(int initialIndex) async {
    final camera = _camera;
    await camera?.pausePreview();
    if (!mounted) return;
    final result = await Navigator.push<_ReviewResult>(
      context,
      MaterialPageRoute(
        builder: (_) => _MultiShotReviewScreen(
          drafts: _drafts,
          initialIndex: initialIndex,
          root: widget.root,
          queue: widget.queue,
        ),
      ),
    );
    if (result?.replacementNote case final note?) _replacementNote = note;
    await _loadDrafts();
    if (mounted && _foreground && identical(_camera, camera)) {
      await camera?.resumePreview();
    }
  }

  Future<void> _finish() async {
    if (_saving || _closing) return;
    setState(() => _closing = true);
    try {
      await widget.queue.finishMarkupMany(_drafts.map((draft) => draft.id));
      if (mounted) Navigator.pop(context, true);
    } finally {
      if (mounted) setState(() => _closing = false);
    }
  }

  Future<void> _discard() async {
    await widget.queue.requestDeleteMany(_drafts.map((draft) => draft.id));
    if (mounted) Navigator.pop(context, true);
  }

  Future<void> _leave() async {
    if (_saving || _closing) return;
    if (_drafts.isEmpty) {
      Navigator.pop(context, false);
      return;
    }
    final action = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Finish these photos?',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text(
                '${_drafts.length} ${_drafts.length == 1 ? 'photo is' : 'photos are'} saved safely on this phone.',
              ),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: () => Navigator.pop(context, 'save'),
                child: Text('Save ${_drafts.length} photos'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, 'later'),
                child: const Text('Finish later'),
              ),
              OutlinedButton(
                onPressed: () => Navigator.pop(context, 'discard'),
                child: const Text('Discard this session'),
              ),
            ],
          ),
        ),
      ),
    );
    if (action == 'save') await _finish();
    if (action == 'later' && mounted) Navigator.pop(context, false);
    if (action == 'discard') await _discard();
  }

  void _scaleStart(ScaleStartDetails details) => _baseZoom = _zoom;

  void _scaleUpdate(ScaleUpdateDetails details) {
    if (_pointers != 2 || _camera == null) return;
    final next = (_baseZoom * details.scale).clamp(_minZoom, _maxZoom);
    _zoom = next;
    unawaited(_camera!.setZoomLevel(next));
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_camera?.dispose());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final camera = _camera;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) unawaited(_leave());
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: _leave,
                      icon: const Icon(Icons.close, color: Colors.white),
                    ),
                    Expanded(
                      child: Text(
                        widget.title,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: _toggleFlash,
                      tooltip: 'Flash',
                      icon: Icon(switch (_flash) {
                        FlashMode.auto => Icons.flash_auto,
                        FlashMode.always => Icons.flash_on,
                        _ => Icons.flash_off,
                      }, color: Colors.white),
                    ),
                    if (_cameras.length > 1)
                      IconButton(
                        onPressed: _switchCamera,
                        tooltip: 'Switch camera',
                        icon: const Icon(
                          Icons.cameraswitch_outlined,
                          color: Colors.white,
                        ),
                      ),
                  ],
                ),
              ),
              Expanded(
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    if (camera != null && camera.value.isInitialized)
                      Listener(
                        onPointerDown: (_) => _pointers++,
                        onPointerUp: (_) => _pointers--,
                        child: GestureDetector(
                          onScaleStart: _scaleStart,
                          onScaleUpdate: _scaleUpdate,
                          child: Center(child: CameraPreview(camera)),
                        ),
                      )
                    else
                      Center(
                        child: _error == null
                            ? const CircularProgressIndicator(
                                color: Colors.white,
                              )
                            : OutlinedButton.icon(
                                onPressed: () => _startup.open(
                                  _openCamera,
                                  explicitRetry: true,
                                ),
                                icon: const Icon(Icons.refresh),
                                label: const Text('Retry camera'),
                              ),
                      ),
                    if (_error != null)
                      Positioned(
                        left: 12,
                        right: 12,
                        top: 12,
                        child: Material(
                          color: Colors.black87,
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Text(
                              _error!,
                              style: const TextStyle(color: Colors.white),
                            ),
                          ),
                        ),
                      ),
                    if (_replacementNote != null)
                      const Positioned(
                        left: 12,
                        right: 12,
                        bottom: 12,
                        child: Text(
                          'Take the replacement photo',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              if (_drafts.isNotEmpty)
                SizedBox(
                  height: 84,
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    scrollDirection: Axis.horizontal,
                    itemCount: _drafts.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 8),
                    itemBuilder: (_, index) {
                      final draft = _drafts[index];
                      final annotations = draft.annotations == null
                          ? null
                          : jsonDecode(draft.annotations!)
                                as Map<String, dynamic>;
                      return InkWell(
                        onTap: () => _review(index),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: SizedBox(
                            width: 68,
                            child: Stack(
                              fit: StackFit.expand,
                              children: [
                                MarkedPhoto(
                                  image: FileImage(
                                    File(
                                      '${widget.root.path}/${draft.relativePath}',
                                    ),
                                  ),
                                  annotations: annotations,
                                  fit: BoxFit.cover,
                                ),
                                if (draft.note?.isNotEmpty == true ||
                                    annotations != null)
                                  Positioned(
                                    right: 4,
                                    bottom: 4,
                                    child: DecoratedBox(
                                      decoration: const BoxDecoration(
                                        color: Colors.black87,
                                        shape: BoxShape.circle,
                                      ),
                                      child: Padding(
                                        padding: const EdgeInsets.all(4),
                                        child: Icon(
                                          annotations != null
                                              ? Icons.gesture
                                              : Icons.notes,
                                          size: 14,
                                          color: Colors.white,
                                        ),
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
                padding: const EdgeInsets.fromLTRB(18, 8, 18, 14),
                child: Row(
                  children: [
                    SizedBox(
                      width: 96,
                      child: _drafts.isEmpty
                          ? null
                          : TextButton(
                              onPressed: () => _review(_drafts.length - 1),
                              child: const Text('Review'),
                            ),
                    ),
                    Expanded(
                      child: Center(
                        child: Semantics(
                          button: true,
                          label: 'Take photo',
                          child: InkResponse(
                            onTap: _saving ? null : _takePhoto,
                            radius: 42,
                            child: Container(
                              width: 72,
                              height: 72,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: Colors.white,
                                border: Border.all(
                                  color: Colors.white54,
                                  width: 5,
                                ),
                              ),
                              child: _saving
                                  ? const Padding(
                                      padding: EdgeInsets.all(22),
                                      child: CircularProgressIndicator(
                                        strokeWidth: 3,
                                      ),
                                    )
                                  : const Icon(
                                      Icons.camera_alt,
                                      color: Colors.black,
                                      size: 30,
                                    ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    SizedBox(
                      width: 96,
                      child: FilledButton(
                        onPressed: _drafts.isEmpty ? null : _finish,
                        child: Text('Done (${_drafts.length})'),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ReviewResult {
  const _ReviewResult({this.replacementNote});
  final String? replacementNote;
}

class _MultiShotReviewScreen extends StatefulWidget {
  const _MultiShotReviewScreen({
    required this.drafts,
    required this.initialIndex,
    required this.root,
    required this.queue,
  });
  final List<PendingCapture> drafts;
  final int initialIndex;
  final Directory root;
  final CaptureQueue queue;

  @override
  State<_MultiShotReviewScreen> createState() => _MultiShotReviewScreenState();
}

class _MultiShotReviewScreenState extends State<_MultiShotReviewScreen> {
  late final PageController _pages = PageController(
    initialPage: widget.initialIndex,
  );
  late final List<PendingCapture> _drafts = [...widget.drafts];
  late int _index = widget.initialIndex;
  bool _original = false;

  PendingCapture get _current => _drafts[_index];
  File _file(PendingCapture capture) =>
      File('${widget.root.path}/${capture.relativePath}');
  Map<String, dynamic>? _marks(PendingCapture capture) =>
      capture.annotations == null
      ? null
      : jsonDecode(capture.annotations!) as Map<String, dynamic>;

  Future<void> _mark() async {
    final capture = _current;
    final result = await Navigator.push<PhotoMarksResult>(
      context,
      MaterialPageRoute(
        builder: (_) => PhotoMarkScreen(
          image: FileImage(_file(capture)),
          annotations: _marks(capture),
          onChanged: (value) => widget.queue.setAnnotations(
            capture.id,
            value == null ? null : jsonEncode(value),
          ),
        ),
      ),
    );
    if (result == null) return;
    final updated = await widget.queue.byId(capture.id);
    if (updated != null && mounted) setState(() => _drafts[_index] = updated);
  }

  Future<void> _note() async {
    final controller = TextEditingController(text: _current.note);
    final value = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => Padding(
        padding: EdgeInsets.fromLTRB(
          16,
          4,
          16,
          MediaQuery.viewInsetsOf(context).bottom + 16,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Photo note', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              autofocus: true,
              minLines: 3,
              maxLines: 6,
              maxLength: 500,
              decoration: const InputDecoration(
                hintText: 'What should the viewer notice?',
              ),
            ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: () => Navigator.pop(context, controller.text),
              child: const Text('Save note'),
            ),
          ],
        ),
      ),
    );
    controller.dispose();
    if (value == null) return;
    await widget.queue.setNote(
      _current.id,
      value.trim().isEmpty ? null : value.trim(),
    );
    final updated = await widget.queue.byId(_current.id);
    if (updated != null && mounted) setState(() => _drafts[_index] = updated);
  }

  Future<void> _delete({bool retake = false}) async {
    final capture = _current;
    setState(() {
      _drafts.removeAt(_index);
      if (_drafts.isNotEmpty) _index = _index.clamp(0, _drafts.length - 1);
    });
    final messenger = ScaffoldMessenger.of(context);
    final closed = await messenger
        .showSnackBar(
          SnackBar(
            content: Text(
              retake
                  ? 'Photo removed. Return to the camera to retake it.'
                  : 'Photo removed',
            ),
            action: SnackBarAction(label: 'Undo', onPressed: () {}),
            duration: const Duration(seconds: 4),
          ),
        )
        .closed;
    if (closed == SnackBarClosedReason.action) {
      if (mounted) {
        setState(() {
          _drafts.insert(_index.clamp(0, _drafts.length), capture);
        });
      }
      return;
    }
    await widget.queue.requestDelete(capture.id);
    if (!mounted) return;
    if (retake) {
      Navigator.pop(context, _ReviewResult(replacementNote: capture.note));
    } else if (_drafts.isEmpty) {
      Navigator.pop(context, const _ReviewResult());
    }
  }

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_drafts.isEmpty) return const Scaffold(body: SizedBox.shrink());
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text('${_index + 1} of ${_drafts.length}'),
        actions: [
          TextButton(
            onPressed: () => setState(() => _original = !_original),
            child: Text(_original ? 'Show marks' : 'Original'),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: PageView.builder(
              controller: _pages,
              itemCount: _drafts.length,
              onPageChanged: (value) => setState(() {
                _index = value;
                _original = false;
              }),
              itemBuilder: (_, index) {
                final capture = _drafts[index];
                return InteractiveViewer(
                  minScale: 1,
                  maxScale: 5,
                  child: Center(
                    child: _original
                        ? Image.file(_file(capture), fit: BoxFit.contain)
                        : MarkedPhoto(
                            image: FileImage(_file(capture)),
                            annotations: _marks(capture),
                            fit: BoxFit.contain,
                          ),
                  ),
                );
              },
            ),
          ),
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: SafeArea(
              top: false,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_current.note?.isNotEmpty == true)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Text(
                        _current.note!,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _mark,
                          icon: const Icon(Icons.gesture),
                          label: const Text('Mark'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _note,
                          icon: const Icon(Icons.notes),
                          label: const Text('Note'),
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      Expanded(
                        child: TextButton.icon(
                          onPressed: () => _delete(retake: true),
                          icon: const Icon(Icons.refresh),
                          label: const Text('Retake'),
                        ),
                      ),
                      Expanded(
                        child: TextButton.icon(
                          onPressed: _delete,
                          icon: const Icon(Icons.delete_outline),
                          label: const Text('Delete'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
