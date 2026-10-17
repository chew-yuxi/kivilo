import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:number_flow_flutter/number_flow_flutter.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/inspection.dart';
import '../services/api.dart';
import '../services/capture_backend.dart';
import '../services/capture_queue.dart';
import '../services/capture_store.dart';
import '../services/uploader.dart';
import '../ui/check_in_reference_view.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_format.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';
import 'photo_mark_screen.dart';
import 'video_screen.dart';

class CaptureScreen extends StatefulWidget {
  const CaptureScreen({
    super.key,
    required this.inspectionId,
    required this.roomId,
    this.api,
    this.queue,
    this.ownerId,
    this.supportDirectory,
  });

  final String inspectionId;
  final String roomId;
  final Api? api;
  final CaptureQueue? queue;
  final String? ownerId;
  final Future<Directory> Function()? supportDirectory;

  @override
  State<CaptureScreen> createState() => _CaptureScreenState();
}

class _CaptureScreenState extends State<CaptureScreen> {
  late final _api = widget.api ?? Api();
  late final _queue = widget.queue ?? CaptureQueue();
  final _picker = ImagePicker();
  late final _backend = RoutingEvidenceBackend(_api.dio);
  late final String _ownerId =
      widget.ownerId ?? Supabase.instance.client.auth.currentUser!.id;
  Directory? _root;
  RoomDetail? _room;
  Future<void>? _uploading;
  bool _videoMode = false;
  bool _busy = false;
  bool _leaving = false;
  bool _finishing = false;
  bool _loadingRoom = false;
  bool _offline = false;
  String? _error;
  List<PendingCapture>? _pendingCaptures;
  List<PendingRemoteEdit>? _remoteEdits;
  List<String> _unresolved = const [];
  StreamSubscription<List<PendingCapture>>? _captureSubscription;
  StreamSubscription<List<PendingRemoteEdit>>? _editSubscription;
  StreamSubscription<EvidenceSyncUpdate>? _syncSubscription;
  final Map<String, EvidenceSyncUpdate> _syncUpdates = {};

  @override
  void initState() {
    super.initState();
    _captureSubscription = _queue
        .watch(widget.roomId, ownerId: _ownerId)
        .listen((captures) {
          final handedOver =
              _pendingCaptures?.isNotEmpty == true && captures.isEmpty;
          if (mounted) setState(() => _pendingCaptures = captures);
          if (mounted && handedOver) unawaited(_loadRoom());
        }, onError: _queueError);
    _editSubscription = _queue
        .watchRemoteEditsFor(_ownerId, widget.inspectionId)
        .listen((edits) {
          if (mounted) setState(() => _remoteEdits = edits);
        }, onError: _queueError);
    _syncSubscription = evidenceSyncUpdates.listen((update) {
      if (!mounted) return;
      setState(() {
        if (update.stage == EvidenceSyncStage.complete) {
          _syncUpdates.remove(update.clientId);
        } else {
          _syncUpdates[update.clientId] = update;
        }
      });
    });
    unawaited(_initialize());
  }

  void _queueError(Object error) {
    if (mounted) {
      setState(
        () => _error = 'Could not check saved media. ${plainError(error)}',
      );
    }
  }

  List<PendingRemoteEdit> get _roomEdits {
    final ids = {
      for (final capture in _room?.captures ?? const <EvidenceCapture>[])
        capture.id,
      for (final capture in _pendingCaptures ?? const <PendingCapture>[])
        if (capture.uploadedId != null) capture.uploadedId!,
    };
    return (_remoteEdits ?? const <PendingRemoteEdit>[])
        .where((edit) => ids.contains(edit.captureId))
        .toList();
  }

  Future<void> _initialize() async {
    try {
      final root =
          await (widget.supportDirectory ?? getApplicationSupportDirectory)();
      _root = root;
      _unresolved = await CaptureStore(
        queue: _queue,
        root: root,
      ).reconcile(_ownerId, roomId: widget.roomId);
      await _loadRoom();
      await _recoverLostPickerData();
      unawaited(_drain());
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    }
  }

  Future<void> _loadRoom() async {
    if (mounted) setState(() => _loadingRoom = true);
    try {
      if ((widget.ownerId ?? Supabase.instance.client.auth.currentUser?.id) !=
          _ownerId) {
        throw const ApiFailure('Account changed. Open this room again.', 401);
      }
      final detail = await _api.room(widget.inspectionId, widget.roomId);
      if ((widget.ownerId ?? Supabase.instance.client.auth.currentUser?.id) !=
          _ownerId) {
        throw const ApiFailure('Account changed. Open this room again.', 401);
      }
      if (mounted) {
        setState(() {
          _room = detail;
          _offline = _api.offlineCopy;
          _error = null;
        });
      }
    } on ApiFailure catch (error) {
      if (mounted) {
        setState(() {
          _room = null;
          _offline = false;
          _error = error.statusCode == null
              ? 'Room has not been loaded on this phone. Connect once to open it.'
              : error.message;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = 'Could not open this room. ${plainError(error)}',
        );
      }
    } finally {
      if (mounted) setState(() => _loadingRoom = false);
    }
  }

  Future<void> _switchMode(bool video) async {
    if (_busy || _leaving || _finishing || video == _videoMode) {
      return;
    }
    setState(() {
      _videoMode = video;
      _error = null;
    });
  }

  Future<void> _openSystemCamera() async {
    if (_busy || _leaving || _finishing || _root == null || _room == null) {
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final picked = _videoMode
          ? await _picker.pickVideo(source: ImageSource.camera)
          : await _picker.pickImage(
              source: ImageSource.camera,
              imageQuality: 95,
              requestFullMetadata: false,
            );
      if (picked != null) await _savePickedFile(picked, video: _videoMode);
    } catch (error) {
      if (mounted) {
        setState(
          () => _error =
              'Could not save that photo or video. ${plainError(error)}',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _chooseFromLibrary() async {
    if (_busy || _leaving || _finishing || _root == null || _room == null) {
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (_videoMode) {
        final picked = await _picker.pickVideo(source: ImageSource.gallery);
        if (picked != null) await _savePickedFile(picked, video: true);
      } else {
        final picked = await _picker.pickMultiImage(
          imageQuality: 95,
          requestFullMetadata: false,
        );
        for (final file in picked) {
          await _savePickedFile(file, video: false);
        }
      }
    } catch (error) {
      if (mounted) {
        setState(
          () => _error =
              'Could not add that photo or video. ${plainError(error)}',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _recoverLostPickerData() async {
    if (!Platform.isAndroid) return;
    final response = await _picker.retrieveLostData();
    if (response.isEmpty) return;
    if (response.exception != null) {
      throw StateError(
        'Could not recover the interrupted selection: ${response.exception}',
      );
    }
    final video = response.type == RetrieveType.video;
    for (final file in response.files ?? const <XFile>[]) {
      await _savePickedFile(file, video: video);
    }
  }

  Future<void> _savePickedFile(XFile picked, {required bool video}) async {
    final path = picked.path.toLowerCase();
    final extension = _extensionFor(path, video: video);
    await CaptureStore(queue: _queue, root: _root!).save(
      source: File(picked.path),
      ownerId: _ownerId,
      inspectionId: widget.inspectionId,
      roomId: widget.roomId,
      kind: video ? 'VIDEO' : 'PHOTO',
      extension: extension,
      mimeType: picked.mimeType ?? _mimeTypeFor(extension, video: video),
      clientId: newCaptureId(),
    );
    unawaited(_drain());
  }

  String _extensionFor(String path, {required bool video}) {
    const imageExtensions = ['jpeg', 'jpg', 'png', 'webp', 'heic', 'heif'];
    const videoExtensions = ['mov', 'mp4', 'm4v'];
    final extensions = video ? videoExtensions : imageExtensions;
    for (final extension in extensions) {
      if (path.endsWith('.$extension')) return extension;
    }
    return video ? 'mp4' : 'jpg';
  }

  String _mimeTypeFor(String extension, {required bool video}) {
    if (video) {
      return extension == 'mov' ? 'video/quicktime' : 'video/mp4';
    }
    return switch (extension) {
      'png' => 'image/png',
      'webp' => 'image/webp',
      'heic' => 'image/heic',
      'heif' => 'image/heif',
      _ => 'image/jpeg',
    };
  }

  Future<void> _leaveAfterSaving() async {
    if (_leaving || _finishing) return;
    setState(() => _leaving = true);
    try {
      while (_busy) {
        await Future<void>.delayed(const Duration(milliseconds: 50));
      }
      if (mounted) Navigator.pop(context);
    } finally {
      if (mounted) setState(() => _leaving = false);
    }
  }

  Future<void> _drain() async {
    final root = _root;
    if (root == null) return;
    if (_uploading != null) return _uploading;
    final future =
        Uploader(
          queue: _queue,
          backend: _backend,
          root: root,
          ownerId: _ownerId,
        ).drain().then((moved) async {
          if (moved) await _loadRoom();
        });
    _uploading = future;
    try {
      await future;
    } catch (error) {
      if (mounted) {
        setState(() => _error = 'Upload paused. ${plainError(error)}');
      }
    } finally {
      _uploading = null;
    }
  }

  Future<_PhotoNoteResult?> _askNote(
    String? initial, {
    bool canReturnToActions = false,
  }) async {
    return showKiviloDrawer<_PhotoNoteResult>(
      context: context,
      builder: (_) => _PhotoNoteDrawer(
        initial: initial,
        canReturnToActions: canReturnToActions,
      ),
    );
  }

  Future<String?> _chooseEvidenceAction({required bool photo}) {
    return showKiviloDrawer<String>(
      context: context,
      builder: (context) => KiviloDrawer(
        title: const Text('Media actions'),
        content: Column(
          children: [
            if (!photo)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.play_circle_outline),
                title: const Text('Play video'),
                onTap: () => Navigator.pop(context, 'play'),
              ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.notes_outlined),
              title: const Text('Edit note'),
              subtitle: const Text('Describe what this shows'),
              onTap: () => Navigator.pop(context, 'note'),
            ),
            if (photo)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.gesture_outlined),
                title: const Text('Mark photo'),
                subtitle: const Text('Circle or point to a detail'),
                onTap: () => Navigator.pop(context, 'mark'),
              ),
            const Divider(),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(
                Icons.delete_outline,
                color: KiviloColors.red,
              ),
              title: const Text(
                'Delete media',
                style: TextStyle(color: KiviloColors.red),
              ),
              onTap: () => Navigator.pop(context, 'delete'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Future<void> _openQueuedActions(PendingCapture capture) async {
    while (mounted) {
      final action = await _chooseEvidenceAction(
        photo: capture.kind == 'PHOTO',
      );
      if (!mounted || action == null) return;
      if (action == 'play') {
        await Navigator.push<void>(
          context,
          MaterialPageRoute(
            builder: (_) => VideoScreen.file(
              file: File('${_root!.path}/${capture.relativePath}'),
            ),
          ),
        );
        return;
      }
      if (action == 'note') {
        if (await _noteQueued(capture)) continue;
        return;
      }
      if (action == 'mark') await _markQueued(capture);
      if (action == 'delete') await _deleteQueued(capture);
      return;
    }
  }

  Future<void> _openServerActions(EvidenceCapture capture) async {
    while (mounted) {
      final action = await _chooseEvidenceAction(
        photo: capture.kind == 'PHOTO',
      );
      if (!mounted || action == null) return;
      if (action == 'play') {
        await Navigator.push<void>(
          context,
          MaterialPageRoute(
            builder: (_) => VideoScreen.network(url: capture.url),
          ),
        );
        return;
      }
      if (action == 'note') {
        if (await _noteServer(capture)) continue;
        return;
      }
      if (action == 'mark') await _markServer(capture);
      if (action == 'delete') {
        await _queue.queueRemoteDelete(
          _ownerId,
          widget.inspectionId,
          capture.id,
        );
        await _drain();
      }
      return;
    }
  }

  Future<bool> _noteQueued(PendingCapture capture) async {
    final result = await _askNote(capture.note, canReturnToActions: true);
    if (result == null) return false;
    if (result.returnToActions) return true;
    final note = result.note!;
    final value = note.trim().isEmpty ? null : note.trim();
    final current = await _queue.byId(capture.id);
    if (current != null) {
      await _queue.setNote(capture.id, value);
    } else {
      final serverId = await _idForQueuedCapture(capture);
      if (serverId == null) {
        if (mounted) {
          setState(
            () => _error =
                'Could not find this photo. Please try the note again.',
          );
        }
        return false;
      }
      await _queue.queueRemoteNote(
        _ownerId,
        widget.inspectionId,
        serverId,
        value,
      );
    }
    unawaited(_drain());
    return false;
  }

  Future<void> _markQueued(PendingCapture capture) async {
    final root = _root!;
    final file = File('${root.path}/${capture.relativePath}');
    final previous = capture.annotations == null
        ? null
        : jsonDecode(capture.annotations!) as Map<String, dynamic>;
    ImageProvider image;
    if (await file.exists()) {
      // Keep the displayed bytes alive while the editor is open: the uploader may
      // finish and remove its disk copy at any moment.
      image = MemoryImage(await file.readAsBytes());
    } else {
      await _loadRoom();
      final server = _serverFor(capture.clientId);
      if (server == null) {
        if (mounted) {
          setState(
            () => _error =
                'Could not open this photo. Please retry when connected.',
          );
        }
        return;
      }
      image = NetworkImage(server.url);
    }
    if (!mounted) return;
    final result = await Navigator.push<PhotoMarksResult>(
      context,
      MaterialPageRoute(
        builder: (_) => PhotoMarkScreen(image: image, annotations: previous),
      ),
    );
    if (result == null) return;
    if (identical(result.annotations, previous)) return;
    final encoded = result.annotations == null
        ? null
        : jsonEncode(result.annotations);
    final current = await _queue.byId(capture.id);
    if (current != null) {
      await _queue.setAnnotations(capture.id, encoded);
    } else {
      final serverId = await _idForQueuedCapture(capture);
      if (serverId == null) {
        if (mounted) {
          setState(
            () => _error =
                'Could not find this photo. Please try the marks again.',
          );
        }
        return;
      }
      await _queue.queueRemoteAnnotations(
        _ownerId,
        widget.inspectionId,
        serverId,
        encoded,
      );
    }
    unawaited(_drain());
  }

  EvidenceCapture? _serverFor(String? clientId) {
    if (clientId == null) return null;
    for (final capture in _room?.captures ?? const <EvidenceCapture>[]) {
      if (capture.clientId == clientId) return capture;
    }
    return null;
  }

  Future<String?> _idForQueuedCapture(PendingCapture capture) async {
    final clientId = capture.clientId;
    if (clientId == null) return null;
    final handedOver = await _queue.serverIdForClient(
      _ownerId,
      widget.inspectionId,
      clientId,
    );
    if (handedOver != null) return handedOver;
    await _loadRoom();
    return _serverFor(clientId)?.id;
  }

  Future<void> _deleteQueued(PendingCapture capture) async {
    final current = await _queue.byId(capture.id);
    if (current != null) {
      await _queue.requestDelete(capture.id);
    } else {
      final serverId = await _idForQueuedCapture(capture);
      if (serverId == null) {
        if (mounted) {
          setState(
            () => _error =
                'Could not find this photo or video. Please try deleting it again.',
          );
        }
        return;
      }
      await _queue.queueRemoteDelete(_ownerId, widget.inspectionId, serverId);
    }
    unawaited(_drain());
  }

  Future<bool> _noteServer(EvidenceCapture capture) async {
    final result = await _askNote(capture.note, canReturnToActions: true);
    if (result == null) return false;
    if (result.returnToActions) return true;
    final note = result.note!;
    await _queue.queueRemoteNote(
      _ownerId,
      widget.inspectionId,
      capture.id,
      note.trim().isEmpty ? null : note.trim(),
    );
    unawaited(_drain());
    return false;
  }

  Future<void> _markServer(EvidenceCapture capture) async {
    final result = await Navigator.push<PhotoMarksResult>(
      context,
      MaterialPageRoute(
        builder: (_) => PhotoMarkScreen(
          image: NetworkImage(capture.url),
          annotations: capture.annotations,
        ),
      ),
    );
    if (result == null) return;
    if (identical(result.annotations, capture.annotations)) return;
    await _queue.queueRemoteAnnotations(
      _ownerId,
      widget.inspectionId,
      capture.id,
      result.annotations == null ? null : jsonEncode(result.annotations),
    );
    unawaited(_drain());
  }

  Future<void> _finishRoom() async {
    if (_finishing) return;
    if (_busy || _leaving) {
      setState(() => _error = 'Wait for the photo or video to finish saving.');
      return;
    }
    setState(() => _finishing = true);
    try {
      final pending = await _queue.pendingForRoom(
        widget.inspectionId,
        widget.roomId,
        _ownerId,
        _room!.captures.map((capture) => capture.id),
      );
      if (!mounted) return;
      if (pending.captures > 0 || pending.edits > 0 || _unresolved.isNotEmpty) {
        setState(
          () => _error =
              'Some photos, videos or changes have not uploaded yet. Try again when you have signal.',
        );
        return;
      }
      await _api.finishRoom(widget.inspectionId, widget.roomId);
      if (mounted) Navigator.pop(context);
    } catch (error) {
      if (mounted) {
        setState(() => _error = 'Could not open review. ${plainError(error)}');
      }
    } finally {
      if (mounted) setState(() => _finishing = false);
    }
  }

  /// [bytes] in the unit and precision the [total] calls for, so the moving figure keeps
  /// the unit of the size it is counting towards instead of jumping from KB to MB.
  ({double value, int digits, String unit}) _sizeIn(int bytes, int total) {
    if (total >= 1024 * 1024) {
      return (
        value: bytes / (1024 * 1024),
        digits: total >= 10 * 1024 * 1024 ? 1 : 2,
        unit: 'MB',
      );
    }
    return (
      value: bytes / 1024,
      digits: total >= 100 * 1024 ? 0 : 1,
      unit: 'KB',
    );
  }

  Widget _pendingCaptureCard(PendingCapture capture) {
    final update = capture.clientId == null
        ? null
        : _syncUpdates[capture.clientId!];
    final progress = (update?.progress ?? 0).clamp(0.0, 1.0);
    final sent = _sizeIn(
      (capture.sizeBytes * progress).round(),
      capture.sizeBytes,
    );
    final whole = _sizeIn(capture.sizeBytes, capture.sizeBytes);
    final annotationError =
        capture.uploadedId != null &&
        !capture.registrationAnnotationsApplied &&
        capture.annotations != null;
    final stage = annotationError
        ? 'Marks need attention'
        : capture.lastError != null
        ? 'Upload paused'
        : switch (update?.stage) {
            EvidenceSyncStage.preparing => 'Preparing secure upload',
            EvidenceSyncStage.uploading => 'Uploading',
            EvidenceSyncStage.registering => 'Adding to room',
            EvidenceSyncStage.finalizing => 'Uploading notes and marks',
            EvidenceSyncStage.failed => 'Upload paused',
            _ =>
              capture.claimedAt == null
                  ? 'Saved safely · waiting to upload'
                  : 'Preparing secure upload',
          };
    final message = annotationError
        ? 'The photo uploaded, but its marks did not. Try again, or edit the marks.'
        : capture.lastError;
    final color = annotationError || capture.lastError != null
        ? KiviloColors.red
        : KiviloColors.pink;
    final detailStyle = Theme.of(context).textTheme.bodySmall?.copyWith(
      color: capture.lastError == null ? KiviloColors.muted : KiviloColors.red,
    );

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Column(
        children: [
          ListTile(
            contentPadding: const EdgeInsets.fromLTRB(12, 6, 4, 0),
            leading: capture.kind == 'PHOTO' && _root != null
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.file(
                      File('${_root!.path}/${capture.relativePath}'),
                      width: 56,
                      height: 56,
                      cacheWidth: (56 * MediaQuery.devicePixelRatioOf(context))
                          .ceil(),
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => const Icon(Icons.broken_image),
                    ),
                  )
                : const SizedBox(
                    width: 56,
                    child: Icon(
                      Icons.videocam_outlined,
                      color: KiviloColors.muted,
                    ),
                  ),
            title: Text(
              capture.note?.isNotEmpty == true
                  ? capture.note!
                  : capture.kind == 'PHOTO'
                  ? 'Photo on this phone'
                  : 'Video on this phone',
            ),
            subtitle: Text(stage, style: TextStyle(color: color)),
            trailing: IconButton(
              onPressed: () => unawaited(_openQueuedActions(capture)),
              icon: const Icon(Icons.more_horiz),
              tooltip: 'Media actions',
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 2, 12, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                KiviloProgressBar(
                  value: capture.lastError == null ? progress : null,
                  color: color,
                ),
                const SizedBox(height: 6),
                if (message != null)
                  Text(message, style: detailStyle)
                else
                  // The figures roll digit by digit, NumberFlow style, rather than
                  // flickering as each progress event lands.
                  Row(
                    children: [
                      // All of the line is NumberFlow's own text: beside a plain Text
                      // its glyphs sit a pixel higher.
                      NumberFlow(
                        value: (progress * 100).round(),
                        suffix: '% · ',
                        style: detailStyle,
                        tabularNums: true,
                      ),
                      NumberFlow(
                        value: sent.value,
                        format: NumberFlowFormat.decimal(
                          minFraction: sent.digits,
                          maxFraction: sent.digits,
                        ),
                        suffix:
                            ' ${sent.unit} of ${whole.value.toStringAsFixed(whole.digits)} ${whole.unit}',
                        style: detailStyle,
                        tabularNums: true,
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    unawaited(_syncSubscription?.cancel());
    unawaited(_captureSubscription?.cancel());
    unawaited(_editSubscription?.cancel());
    if (widget.queue == null) {
      final upload = _uploading;
      if (upload == null) {
        unawaited(_queue.close());
      } else {
        unawaited(upload.whenComplete(_queue.close));
      }
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pending = _pendingCaptures;
    final roomEdits = _roomEdits;
    final waiting =
        _loadingRoom ||
        pending == null ||
        _remoteEdits == null ||
        pending.isNotEmpty ||
        roomEdits.isNotEmpty ||
        _unresolved.isNotEmpty;
    final hasMedia =
        pending?.isNotEmpty == true || _room?.captures.isNotEmpty == true;
    final checkIn = _room?.checkIn;
    final scaffold = Scaffold(
      appBar: AppBar(
        title: Text(_room?.name ?? 'Capture room'),
        leading: BackButton(onPressed: () => unawaited(_leaveAfterSaving())),
        actions: [
          // On a check-out, the room as it was at check-in, one tap from the camera.
          if (checkIn != null)
            TextButton(
              onPressed: () => unawaited(
                showKiviloDrawer<void>(
                  context: context,
                  builder: (context) => KiviloDrawer(
                    title: Text(
                      checkIn.conductedAt == null
                          ? 'At check-in'
                          : 'At check-in · ${shortDate(checkIn.conductedAt!)}',
                    ),
                    content: CheckInReferenceView(reference: checkIn),
                  ),
                ),
              ),
              child: const Text('Check-in'),
            ),
          IconButton(
            onPressed: () {
              unawaited(_drain());
            },
            icon: const Icon(Icons.sync),
            tooltip: 'Retry uploads',
          ),
        ],
      ),
      body: KiviloContent(
        maxWidth: 1200,
        child: LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth >= 840;
            final controls = <Widget>[
              Text(
                'Capture this room',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 6),
              Text(
                'Narrate a walkthrough, then photograph labels and details.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 20),
              if (_offline)
                _notice(
                  Icons.cloud_off_outlined,
                  'Offline. Photos and videos stay on this phone and upload when you have signal.',
                  KiviloColors.amberSoft,
                  KiviloColors.amber,
                ),
              if (_error != null)
                _notice(
                  Icons.error_outline,
                  _error!,
                  KiviloColors.redSoft,
                  KiviloColors.red,
                  onTap: () => setState(() => _error = null),
                ),
              if (_unresolved.isNotEmpty)
                _notice(
                  Icons.warning_amber_outlined,
                  '${_unresolved.length == 1 ? 'A photo or video was' : '${_unresolved.length} photos or videos were'} interrupted while saving. Do not uninstall Kivilo or clear its data, so nothing is lost.',
                  KiviloColors.amberSoft,
                  KiviloColors.amber,
                ),
              if (roomEdits.isNotEmpty)
                _notice(
                  Icons.sync,
                  '${roomEdits.length == 1 ? 'A change is' : '${roomEdits.length} changes are'} waiting to upload. Tap to try again.',
                  KiviloColors.amberSoft,
                  KiviloColors.amber,
                  onTap: () => unawaited(_drain()),
                ),
              KiviloSegmentedControl<bool>(
                options: const [
                  KiviloSegmentOption(
                    value: false,
                    label: 'Photos',
                    icon: Icons.photo_camera,
                  ),
                  KiviloSegmentOption(
                    value: true,
                    label: 'Video',
                    icon: Icons.videocam,
                  ),
                ],
                value: _videoMode,
                onChanged: (selected) => unawaited(_switchMode(selected!)),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: _busy || _leaving || _finishing || _room == null
                    ? null
                    : _openSystemCamera,
                icon: Icon(_videoMode ? Icons.videocam : Icons.photo_camera),
                label: Text(
                  _videoMode
                      ? 'Record video'
                      : hasMedia
                      ? 'Take another photo'
                      : 'Take a photo',
                ),
              ),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                onPressed: _busy || _leaving || _finishing || _room == null
                    ? null
                    : _chooseFromLibrary,
                icon: const Icon(Icons.add_photo_alternate_outlined),
                label: Text(_videoMode ? 'Choose video' : 'Choose photos'),
              ),
            ];
            final queued = (pending ?? const <PendingCapture>[]).reversed
                .toList();
            final uploaded = (_room?.captures ?? const <EvidenceCapture>[])
                .reversed
                .toList();
            final media = <Widget>[
              const KiviloSectionHeading(
                title: 'Media',
                subtitle: 'Saved on your phone first, then added to the report',
              ),
              const SizedBox(height: 12),
              if (wide)
                SizedBox(
                  height: (constraints.maxHeight - 100).clamp(360, 600),
                  child: ListView.builder(
                    key: PageStorageKey('capture-media-${widget.roomId}'),
                    primary: false,
                    itemCount: queued.length + uploaded.length,
                    itemBuilder: (_, index) => index < queued.length
                        ? _pendingCaptureCard(queued[index])
                        : _serverCaptureCard(
                            uploaded[index - queued.length],
                            wide: true,
                          ),
                  ),
                )
              else ...[
                for (final capture in queued) _pendingCaptureCard(capture),
                for (final capture in uploaded)
                  _serverCaptureCard(capture, wide: false),
              ],
            ];
            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              children: [
                if (wide)
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        width: 320,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: controls,
                        ),
                      ),
                      const SizedBox(width: 24),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: media,
                        ),
                      ),
                    ],
                  )
                else ...[
                  ...controls,
                  const SizedBox(height: 24),
                  ...media,
                ],
              ],
            );
          },
        ),
      ),
      bottomNavigationBar: KiviloContent(
        maxWidth: 720,
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (waiting) ...[
                  const Text(
                    'Review opens once this room’s photos, videos and changes have uploaded. Your media stays saved on this phone while you wait for signal.',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                ],
                OutlinedButton.icon(
                  onPressed:
                      _room == null ||
                          _busy ||
                          _leaving ||
                          _finishing ||
                          waiting
                      ? null
                      : _finishRoom,
                  icon: const Icon(Icons.check_rounded),
                  label: const Text('Review room'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    return PopScope(
      canPop: !_busy && !_leaving && !_finishing,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) unawaited(_leaveAfterSaving());
      },
      child: scaffold,
    );
  }

  Widget _serverCaptureCard(EvidenceCapture capture, {required bool wide}) {
    final preview = ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: SizedBox(
        width: wide ? 112 : 56,
        height: wide ? 84 : 56,
        child: capture.kind == 'PHOTO'
            ? Image.network(
                capture.url,
                cacheWidth:
                    ((wide ? 112 : 56) * MediaQuery.devicePixelRatioOf(context))
                        .ceil(),
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => const Icon(Icons.image),
              )
            : VideoPoster(posterUrl: capture.posterUrl, iconSize: 24),
      ),
    );
    final title = Text(
      capture.note?.isNotEmpty == true
          ? capture.note!
          : (capture.kind == 'PHOTO' ? 'Photo' : 'Video'),
    );
    const status = Text(
      'In the report',
      style: TextStyle(color: KiviloColors.green),
    );
    final actions = IconButton(
      onPressed: () => unawaited(_openServerActions(capture)),
      icon: const Icon(Icons.more_horiz),
      tooltip: 'Media actions',
    );
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: wide
          ? Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 4, 12),
              child: Row(
                children: [
                  preview,
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        DefaultTextStyle.merge(
                          style: Theme.of(context).textTheme.titleMedium,
                          child: title,
                        ),
                        const SizedBox(height: 6),
                        status,
                      ],
                    ),
                  ),
                  actions,
                ],
              ),
            )
          : ListTile(
              contentPadding: const EdgeInsets.fromLTRB(12, 6, 4, 6),
              leading: preview,
              title: title,
              subtitle: status,
              trailing: actions,
            ),
    );
  }

  Widget _notice(
    IconData icon,
    String message,
    Color background,
    Color foreground, {
    VoidCallback? onTap,
  }) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Material(
      color: background,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Icon(icon, size: 20, color: foreground),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  message,
                  style: TextStyle(color: foreground, fontSize: 13),
                ),
              ),
              if (onTap != null) Icon(Icons.close, size: 18, color: foreground),
            ],
          ),
        ),
      ),
    ),
  );
}

class _PhotoNoteResult {
  const _PhotoNoteResult.save(this.note) : returnToActions = false;
  const _PhotoNoteResult.back() : note = null, returnToActions = true;

  final String? note;
  final bool returnToActions;
}

class _PhotoNoteDrawer extends StatefulWidget {
  const _PhotoNoteDrawer({this.initial, required this.canReturnToActions});

  final String? initial;
  final bool canReturnToActions;

  @override
  State<_PhotoNoteDrawer> createState() => _PhotoNoteDrawerState();
}

class _PhotoNoteDrawerState extends State<_PhotoNoteDrawer> {
  late final TextEditingController _controller = TextEditingController(
    text: widget.initial,
  );

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return KiviloDrawer(
      title: Row(
        children: [
          if (widget.canReturnToActions) ...[
            IconButton(
              onPressed: () =>
                  Navigator.pop(context, const _PhotoNoteResult.back()),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
              tooltip: 'Back to media actions',
              icon: const Icon(Icons.arrow_back),
            ),
            const SizedBox(width: 8),
          ],
          const Text('Photo note'),
        ],
      ),
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Describe what the viewer should notice in this photo.'),
          const SizedBox(height: 18),
          TextField(
            controller: _controller,
            autofocus: true,
            minLines: 3,
            maxLines: 6,
            decoration: const InputDecoration(
              hintText: 'For example: chip beside the sink',
            ),
          ),
        ],
      ),
      actions: [
        FilledButton(
          onPressed: () =>
              Navigator.pop(context, _PhotoNoteResult.save(_controller.text)),
          child: const Text('Save note'),
        ),
      ],
    );
  }
}
