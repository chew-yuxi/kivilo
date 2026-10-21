import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/api_failure.dart';
import '../services/capture_backend.dart';
import '../services/capture_queue.dart';
import '../services/capture_store.dart';
import '../services/evidence_auth.dart';
import '../services/evidence_photo_intake.dart';
import '../services/uploader.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';
import '../ui/marked_network_photo.dart';
import 'photo_mark_screen.dart';

class EvidencePhoto {
  const EvidencePhoto({
    required this.id,
    required this.url,
    this.note,
    this.annotations,
  });

  final String id;
  final String url;
  final String? note;
  final Map<String, dynamic>? annotations;
}

/// The same local-original/mark/save sequence for immutable evidence on a finding,
/// repair or draft update. Domain authorization stays in each backend's endpoints.
class EvidencePhotoScreen extends StatefulWidget {
  const EvidencePhotoScreen({
    super.key,
    required this.title,
    required this.queueOwner,
    required this.targetId,
    required this.loadPhotos,
    this.kind = 'PHOTO',
    this.initialSource,
    this.queue,
    this.ownerId,
    this.currentOwnerId,
    this.supportDirectory,
    this.picker,
    this.backend,
  });

  final String title;
  final String queueOwner;
  final String targetId;
  final String kind;
  final Future<List<EvidencePhoto>> Function() loadPhotos;
  final ImageSource? initialSource;
  final CaptureQueue? queue;
  final String? ownerId;
  final String? Function()? currentOwnerId;
  final Future<Directory> Function()? supportDirectory;
  final ImagePicker? picker;
  final CaptureBackend? backend;

  @override
  State<EvidencePhotoScreen> createState() => _EvidencePhotoScreenState();
}

class _EvidencePhotoScreenState extends State<EvidencePhotoScreen> {
  late final _queue = widget.queue ?? CaptureQueue();
  late final _ownerId =
      widget.ownerId ?? Supabase.instance.client.auth.currentUser!.id;
  late final _backend =
      widget.backend ?? RoutingEvidenceBackend(ownerBoundEvidenceDio(_ownerId));
  late final _picker = widget.picker ?? ImagePicker();
  Directory? _root;
  EvidencePhotoIntake? _intake;
  List<PendingCapture> _pending = [];
  List<EvidencePhoto> _photos = [];
  StreamSubscription<List<PendingCapture>>? _subscription;
  Future<void>? _uploading;
  bool _busy = true;
  bool _loading = false;
  String? _error;
  String? _uploadError;
  List<String> _unresolved = [];

  bool get _sameOwner {
    final current = widget.currentOwnerId != null
        ? widget.currentOwnerId!()
        : widget.ownerId ?? Supabase.instance.client.auth.currentUser?.id;
    return current == _ownerId;
  }

  void _checkOwner() {
    if (!_sameOwner) {
      throw const ApiFailure(
        'Account changed. Reopen photos in the original account.',
        401,
      );
    }
  }

  @override
  void initState() {
    super.initState();
    _subscription = _queue
        .watch(widget.targetId, ownerId: _ownerId)
        .listen(
          (rows) {
            final target = rows
                .where((row) => row.inspectionId == widget.queueOwner)
                .toList();
            final ids = target.map((row) => row.id).toSet();
            final completed = _pending.any((row) => !ids.contains(row.id));
            if (mounted) setState(() => _pending = target);
            if (completed && mounted) unawaited(_loadPhotos());
          },
          onError: (Object error) {
            if (mounted) setState(() => _error = plainError(error));
          },
        );
    unawaited(_initialize());
  }

  Future<void> _initialize() async {
    try {
      final root =
          await (widget.supportDirectory ?? getApplicationSupportDirectory)();
      _root = root;
      _checkOwner();
      _intake = EvidencePhotoIntake(
        queue: _queue,
        root: root,
        picker: _picker,
        ownerId: _ownerId,
        queueOwner: widget.queueOwner,
        targetId: widget.targetId,
        kind: widget.kind,
      );
      _unresolved = await CaptureStore(
        queue: _queue,
        root: root,
      ).reconcile(_ownerId, roomId: widget.targetId);
      await _intake!.recover();
      await _loadPhotos();
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
    if (!mounted || !_sameOwner) return;
    if (widget.initialSource != null && _intake != null) {
      await _pick(widget.initialSource!);
    }
    unawaited(_drain());
  }

  Future<void> _loadPhotos() async {
    if (_loading) return;
    _loading = true;
    try {
      _checkOwner();
      final photos = await widget.loadPhotos();
      _checkOwner();
      if (mounted) setState(() => _photos = photos);
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = 'Could not load uploaded photos. ${plainError(error)}',
        );
      }
    } finally {
      _loading = false;
    }
  }

  Future<void> _pick(ImageSource source) async {
    if (_busy || _intake == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      _checkOwner();
      final ids = await _intake!.pick(source);
      // Even if the account changed while the system picker was open, the originals
      // were saved under the owner/destination captured before it opened.
      _checkOwner();
      for (final id in ids) {
        if (!mounted) break;
        await _mark(id);
      }
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
    unawaited(_drain());
  }

  Future<void> _resume(int id) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await _mark(id);
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
    unawaited(_drain());
  }

  Future<void> _mark(int id) async {
    _checkOwner();
    await _intake!.preparePhoto(id);
    final capture = await _queue.byId(id);
    if (capture == null || !capture.awaitingMarkup) return;
    if (capture.ownerId != _ownerId ||
        capture.inspectionId != widget.queueOwner ||
        capture.roomId != widget.targetId) {
      throw StateError('Photo belongs to another destination');
    }
    if (capture.mimeType == 'application/octet-stream' ||
        capture.lastError != null) {
      throw ApiFailure(
        capture.lastError ??
            'This original cannot be opened yet. It remains saved on your phone.',
        null,
      );
    }
    final bytes = await File(
      '${_root!.path}/${capture.relativePath}',
    ).readAsBytes();
    if (!mounted) return;
    _checkOwner();
    final result = await Navigator.push<PhotoMarksResult>(
      context,
      MaterialPageRoute(
        builder: (_) => PhotoMarkScreen(
          image: MemoryImage(bytes),
          note: capture.note,
          annotations: _annotations(capture.annotations),
          saveLabel: 'Save photo',
          onNoteChanged: (note) => _queue.setNote(id, note),
          onChanged: (marks) => _queue.setAnnotations(
            id,
            marks == null ? null : jsonEncode(marks),
          ),
        ),
      ),
    );
    if (result == null) return;
    _checkOwner();
    // The editor only returns a result after all caption and mark writes complete.
    await _queue.finishMarkup(id);
  }

  Future<void> _drain() {
    final root = _root;
    if (!mounted || root == null || !_sameOwner) return Future.value();
    if (_uploading != null) return _uploading!;
    if (_uploadError != null) setState(() => _uploadError = null);
    // Every caller, including disposal, shares the handled operation. A failure
    // to claim a queue row must not leave an unobserved failing future behind.
    return _uploading = () async {
      try {
        final moved = await Uploader(
          queue: _queue,
          backend: _backend,
          root: root,
          ownerId: _ownerId,
        ).drain();
        if (moved) await _loadPhotos();
      } catch (error) {
        final message = 'Upload paused. ${plainError(error)}';
        if (mounted) setState(() => _uploadError = message);
      } finally {
        _uploading = null;
      }
    }();
  }

  static Map<String, dynamic>? _annotations(String? raw) =>
      raw == null ? null : jsonDecode(raw) as Map<String, dynamic>;

  Widget _notes(String? note, Map<String, dynamic>? annotations) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      if (note != null && note.isNotEmpty)
        Padding(padding: const EdgeInsets.only(top: 8), child: Text(note)),
      for (final (index, mark)
          in ((annotations?['marks'] as List?) ?? const []).indexed)
        if (mark['note'] is String && (mark['note'] as String).isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text('${index + 1}. ${mark['note']}'),
          ),
    ],
  );

  Widget _localPhoto(PendingCapture capture) {
    final marks = _annotations(capture.annotations);
    final image = Image.file(
      File('${_root!.path}/${capture.relativePath}'),
      fit: BoxFit.contain,
      errorBuilder: (_, _, _) =>
          const Center(child: Text('Photo saved; preview unavailable')),
    );
    if (marks == null) return image;
    final width = (marks['w'] as num).toDouble();
    final height = (marks['h'] as num).toDouble();
    return LayoutBuilder(
      builder: (_, bounds) {
        final scale = math.min(
          bounds.maxWidth / width,
          bounds.maxHeight / height,
        );
        return Center(
          child: SizedBox(
            width: width * scale,
            height: height * scale,
            child: Stack(
              fit: StackFit.expand,
              children: [
                image,
                CustomPaint(
                  painter: MarkPainter(
                    (marks['marks'] as List).cast<Map<String, dynamic>>(),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _view(EvidencePhoto photo) => Navigator.push<void>(
    context,
    MaterialPageRoute(
      builder: (_) => Scaffold(
        appBar: AppBar(title: const Text('Photo')),
        body: KiviloContent(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              SizedBox(
                height: 420,
                child: InteractiveViewer(
                  child: MarkedNetworkPhoto(
                    url: photo.url,
                    annotations: photo.annotations,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
              _notes(photo.note, photo.annotations),
            ],
          ),
        ),
      ),
    ),
  );

  @override
  void dispose() {
    unawaited(_subscription?.cancel());
    if (widget.queue == null) {
      final upload = _uploading;
      unawaited(() async {
        if (upload != null) await upload;
        await _queue.close();
      }());
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => !_sameOwner
      ? Scaffold(
          appBar: AppBar(title: Text(widget.title)),
          body: const Center(
            child: Text(
              'Account changed. Reopen photos in the original account.',
            ),
          ),
        )
      : PopScope(
          canPop: !_busy,
          child: Scaffold(
            appBar: AppBar(title: Text(widget.title)),
            body: KiviloContent(
              maxWidth: 720,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  const Text(
                    'Take a photo, add marks or a note, then save. The original stays unchanged.',
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: _busy || _intake == null
                        ? null
                        : () => _pick(ImageSource.camera),
                    child: const Text('Take photo'),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: _busy || _intake == null
                        ? null
                        : () => _pick(ImageSource.gallery),
                    child: const Text('Choose photos'),
                  ),
                  if (_busy)
                    const Padding(
                      padding: EdgeInsets.all(12),
                      child: LinearProgressIndicator(),
                    ),
                  for (final error in [_error, _uploadError])
                    if (error != null)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        child: Text(error),
                      ),
                  if (_unresolved.isNotEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: Text(
                        'A photo was interrupted while saving. Keep Kivilo installed and its data intact so it can be recovered.',
                      ),
                    ),
                  for (final capture in _pending)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            if (_root != null)
                              SizedBox(
                                height: 180,
                                child: _localPhoto(capture),
                              ),
                            _notes(
                              capture.note,
                              _annotations(capture.annotations),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              capture.awaitingMarkup
                                  ? 'Saved on this phone. Finish marking before upload.'
                                  : 'Saved on this phone. Waiting to upload.',
                            ),
                            if (capture.lastError != null)
                              Text(
                                capture.lastError!,
                                style: const TextStyle(color: KiviloColors.red),
                              ),
                            if (capture.awaitingMarkup)
                              TextButton(
                                onPressed: _busy
                                    ? null
                                    : () => _resume(capture.id),
                                child: const Text('Finish marking'),
                              )
                            else
                              TextButton(
                                onPressed: _busy ? null : _drain,
                                child: const Text('Retry upload'),
                              ),
                          ],
                        ),
                      ),
                    ),
                  for (final photo in _photos)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            SizedBox(
                              height: 180,
                              child: MarkedNetworkPhoto(
                                url: photo.url,
                                annotations: photo.annotations,
                                fit: BoxFit.contain,
                              ),
                            ),
                            _notes(photo.note, photo.annotations),
                            TextButton(
                              onPressed: () => _view(photo),
                              child: const Text('View photo'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  if (!_busy && _pending.isEmpty && _photos.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: Text('No photos yet.'),
                    ),
                ],
              ),
            ),
          ),
        );
}
