import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/inspection.dart';
import '../services/api.dart';
import '../services/product_events.dart';
import '../services/capture_backend.dart';
import '../services/capture_queue.dart';
import '../services/capture_store.dart';
import '../services/uploader.dart';
import '../ui/check_in_reference_view.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_format.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_theme.dart';
import '../ui/marked_network_photo.dart';
import 'photo_mark_screen.dart';
import 'multi_shot_camera_screen.dart';
import 'video_screen.dart';
import '../services/photo_cache.dart';

class CaptureScreen extends StatefulWidget {
  const CaptureScreen({
    super.key,
    required this.inspectionId,
    required this.roomId,
    this.itemId,
    this.itemName,
    this.onEditItem,
    this.api,
    this.queue,
    this.ownerId,
    this.supportDirectory,
    this.picker,
  });

  final String inspectionId;
  final String roomId;
  final String? itemId;
  final String? itemName;
  final Future<void> Function(InventoryItem, List<EvidenceCapture>)? onEditItem;
  final Api? api;
  final CaptureQueue? queue;
  final String? ownerId;
  final Future<Directory> Function()? supportDirectory;
  final ImagePicker? picker;

  @override
  State<CaptureScreen> createState() => _CaptureScreenState();
}

class _CaptureScreenState extends State<CaptureScreen> {
  late final _api = widget.api ?? Api();
  late final _queue = widget.queue ?? CaptureQueue();
  late final _picker = widget.picker ?? ImagePicker();
  late final _backend = RoutingEvidenceBackend(_api.dio);
  late final String _ownerId =
      widget.ownerId ?? Supabase.instance.client.auth.currentUser!.id;
  Directory? _root;
  RoomDetail? _room;
  Future<void>? _uploading;
  bool _videoMode = false;
  bool _busy = true;
  bool _leaving = false;
  bool _finishing = false;
  bool _loadingRoom = false;
  Future<void>? _roomLoad;
  bool _reloadRoom = false;
  bool _offline = false;
  String? _error;
  List<PendingCapture>? _pendingCaptures;
  // Display-only handovers keep the same card alive after SQLite confirms upload.
  // They never keep bytes in the queue or count as unfinished uploads.
  final Map<int, PendingCapture> _handingOver = {};
  final Set<int> _deletedCaptures = {};
  final List<String> _localCaptureOrder = [];
  List<PendingRemoteEdit>? _remoteEdits;
  List<String> _unresolved = const [];
  StreamSubscription<List<PendingCapture>>? _captureSubscription;
  StreamSubscription<List<PendingRemoteEdit>>? _editSubscription;
  StreamSubscription<EvidenceSyncUpdate>? _syncSubscription;
  final Map<String, EvidenceSyncUpdate> _syncUpdates = {};

  InventoryItem? get _item =>
      _room?.items.where((item) => item.id == widget.itemId).firstOrNull;

  List<EvidenceCapture> get _visibleCaptures {
    final captures = _room?.captures ?? const <EvidenceCapture>[];
    if (widget.itemId == null) return captures;
    final item = _item;
    if (item == null) return const [];
    return captures
        .where(
          (capture) =>
              item.evidenceCaptureIds.contains(capture.id) ||
              item.sourceCaptureId == capture.id,
        )
        .toList();
  }

  @override
  void initState() {
    super.initState();
    _captureSubscription = _queue
        .watch(widget.roomId, ownerId: _ownerId)
        .listen((captures) {
          if (!mounted) return;
          final remaining = captures.map((capture) => capture.id).toSet();
          final handedOver =
              _pendingCaptures?.any(
                (capture) => !remaining.contains(capture.id),
              ) ==
              true;
          setState(() {
            for (final capture in _pendingCaptures ?? <PendingCapture>[]) {
              if (!remaining.contains(capture.id) &&
                  !capture.deleteRequested &&
                  !_deletedCaptures.contains(capture.id) &&
                  (widget.itemId == null || capture.itemId == widget.itemId)) {
                _handingOver[capture.id] = capture;
              }
            }
            for (final capture in captures) {
              _handingOver.remove(capture.id);
              final key = _pendingKey(capture);
              if (!_localCaptureOrder.contains(key)) {
                _localCaptureOrder.add(key);
              }
            }
            _pendingCaptures = captures;
          });
          if (handedOver) unawaited(_refreshHandovers());
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
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _pendingKey(PendingCapture capture) =>
      capture.clientId ?? capture.uploadedId ?? 'pending:${capture.id}';

  Future<void> _refreshHandovers() async {
    try {
      // The stream may coalesce registration and removal into one update. Use
      // the durable, owner-scoped receipt to distinguish uploads from discards.
      for (final capture in _handingOver.values.toList()) {
        if (capture.uploadedId != null) continue;
        final serverId = capture.clientId == null
            ? null
            : await _queue.serverIdForClient(
                _ownerId,
                widget.inspectionId,
                capture.clientId!,
              );
        if (!mounted) return;
        if (serverId == null) {
          setState(() => _handingOver.remove(capture.id));
        }
      }
      await _loadRoom();
    } catch (error) {
      _queueError(error);
    }
  }

  Future<void> _loadRoom() {
    _reloadRoom = true;
    return _roomLoad ??= _loadLatestRoom();
  }

  Future<void> _loadLatestRoom() async {
    if (mounted) setState(() => _loadingRoom = true);
    try {
      do {
        _reloadRoom = false;
        await _readRoom();
      } while (_reloadRoom && mounted);
    } finally {
      _roomLoad = null;
      if (mounted) setState(() => _loadingRoom = false);
    }
  }

  Future<void> _readRoom() async {
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
      if (mounted && !_reloadRoom) {
        setState(() {
          _room = detail;
          _offline = _api.offlineCopy;
          // Retire only when the saved photo is visible in this room/item. A
          // cached or overlapping response can still lack its item association.
          final visible = _visibleCaptures;
          _handingOver.removeWhere(
            (_, local) => visible.any(
              (saved) =>
                  saved.id == local.uploadedId ||
                  (local.clientId != null && saved.clientId == local.clientId),
            ),
          );
          _error = null;
        });
      }
    } on ApiFailure catch (error) {
      if (mounted && !_reloadRoom) {
        setState(() {
          _room = null;
          if (error.statusCode != null) _handingOver.clear();
          _offline = false;
          _error = error.statusCode == null
              ? 'Room has not been loaded on this phone. Connect once to open it.'
              : error.message;
        });
      }
    } catch (error) {
      if (mounted && !_reloadRoom) {
        setState(
          () => _error = 'Could not open this room. ${plainError(error)}',
        );
      }
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
      await _beginPicker();
      final picked = _videoMode
          ? await _picker.pickVideo(source: ImageSource.camera)
          : await _picker.pickImage(
              source: ImageSource.camera,
              maxWidth: evidencePhotoEdge,
              maxHeight: evidencePhotoEdge,
              imageQuality: evidencePhotoQuality,
              requestFullMetadata: false,
            );
      await _saveSelection(picked == null ? [] : [picked], video: _videoMode);
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

  Future<void> _openMultiShotCamera() async {
    if (_busy || _leaving || _finishing || _root == null || _room == null) {
      return;
    }
    await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => MultiShotCameraScreen(
          inspectionId: widget.inspectionId,
          roomId: widget.roomId,
          itemId: widget.itemId,
          ownerId: _ownerId,
          root: _root!,
          queue: _queue,
          title: _item?.name ?? widget.itemName ?? _room!.name,
        ),
      ),
    );
    if (!mounted) return;
    await _loadRoom();
    unawaited(_drain());
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
      await _beginPicker();
      if (_videoMode) {
        final picked = await _picker.pickVideo(source: ImageSource.gallery);
        await _saveSelection(picked == null ? [] : [picked], video: true);
      } else {
        final picked = await _picker.pickMultiImage(
          maxWidth: evidencePhotoEdge,
          maxHeight: evidencePhotoEdge,
          imageQuality: evidencePhotoQuality,
          requestFullMetadata: false,
        );
        await _saveSelection(picked, video: false);
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
    // ImagePicker has one lost-result slot. Only the finding editor which owns
    // this durable intent may consume its photo after an Android restart.
    if (await File('${_root!.path}/finding-picker.json').exists() ||
        await File(
          '${_root!.path}/$supportingDocumentPickerFilename',
        ).exists()) {
      return;
    }
    Map<String, dynamic>? intent;
    if (await _pickerJournal.exists()) {
      intent =
          jsonDecode(await _pickerJournal.readAsString())
              as Map<String, dynamic>;
      if (intent['ownerId'] != _ownerId) return;
      if (intent['files'] != null) {
        await _persistSelection(intent);
        return;
      }
    }
    if (!Platform.isAndroid) {
      if (intent != null) await _pickerJournal.delete();
      return;
    }
    final response = await _picker.retrieveLostData();
    if (response.isEmpty) {
      if (intent != null) await _pickerJournal.delete();
      return;
    }
    if (response.exception != null) {
      throw StateError(
        'Could not recover the interrupted selection: ${response.exception}',
      );
    }
    final video = response.type == RetrieveType.video;
    if (intent == null) {
      // A selection interrupted in an older build has no item provenance.
      // Keep it as room evidence instead of guessing the item now on screen.
      await _writePickerIntent({
        'ownerId': _ownerId,
        'inspectionId': widget.inspectionId,
        'roomId': widget.roomId,
      });
    }
    await _saveSelection(response.files ?? const <XFile>[], video: video);
  }

  File get _pickerJournal => File('${_root!.path}/capture-picker.json');

  Future<void> _writePickerIntent(Map<String, dynamic> intent) async {
    final temporary = File('${_pickerJournal.path}.tmp');
    await temporary.writeAsString(jsonEncode(intent), flush: true);
    await temporary.rename(_pickerJournal.path);
  }

  Future<void> _beginPicker() async {
    if (await File(
      '${_root!.path}/$supportingDocumentPickerFilename',
    ).exists()) {
      throw const ApiFailure(
        'Reopen Supporting documents to recover the previous photo before taking another.',
        null,
      );
    }
    if (await _pickerJournal.exists() ||
        await File('${_root!.path}/finding-picker.json').exists()) {
      throw StateError(
        'A previous camera selection still needs recovery. Reopen its room before taking another photo.',
      );
    }
    await _writePickerIntent({
      'ownerId': _ownerId,
      'inspectionId': widget.inspectionId,
      'roomId': widget.roomId,
      'itemId': widget.itemId,
    });
  }

  Future<void> _saveSelection(List<XFile> files, {required bool video}) async {
    final intent =
        jsonDecode(await _pickerJournal.readAsString()) as Map<String, dynamic>;
    intent['video'] = video;
    intent['files'] = [
      for (final file in files)
        {
          'path': file.path,
          'mimeType': file.mimeType,
          'clientId': newCaptureId(),
        },
    ];
    await _writePickerIntent(intent);
    await _persistSelection(intent);
  }

  Future<void> _persistSelection(Map<String, dynamic> intent) async {
    final video = intent['video'] as bool;
    final ids = <int>[];
    // Save the entire library selection before opening its first editor. A crash
    // during marking must not strand the remaining photos in the picker cache.
    for (final entry
        in (intent['files'] as List).cast<Map<String, dynamic>>()) {
      final clientId = entry['clientId'] as String;
      if (await _queue.serverIdForClient(
            _ownerId,
            intent['inspectionId'] as String,
            clientId,
          ) !=
          null) {
        continue;
      }
      final extension = _extensionFor(
        (entry['path'] as String).toLowerCase(),
        video: video,
      );
      ids.add(
        await CaptureStore(queue: _queue, root: _root!).save(
          source: File(entry['path'] as String),
          ownerId: _ownerId,
          inspectionId: intent['inspectionId'] as String,
          roomId: intent['roomId'] as String,
          itemId: intent['itemId'] as String?,
          kind: video ? 'VIDEO' : 'PHOTO',
          extension: extension,
          mimeType:
              entry['mimeType'] as String? ??
              _mimeTypeFor(extension, video: video),
          clientId: clientId,
          awaitingMarkup: !video,
        ),
      );
    }
    await _pickerJournal.delete();
    if (!video &&
        intent['roomId'] == widget.roomId &&
        intent['itemId'] == widget.itemId) {
      for (final id in ids) {
        if (!mounted) break;
        final capture = await _queue.byId(id);
        if (capture != null && capture.awaitingMarkup) {
          await _markQueued(capture);
        }
      }
    }
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
          if (moved || _handingOver.isNotEmpty) await _loadRoom();
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
      image = StoredNetworkImage(server.url);
    }
    if (!mounted) return;
    final result = await Navigator.push<PhotoMarksResult>(
      context,
      MaterialPageRoute(
        builder: (_) => PhotoMarkScreen(
          image: image,
          annotations: previous,
          saveLabel: capture.awaitingMarkup ? 'Save photo' : 'Save',
          onChanged: capture.awaitingMarkup
              ? (annotations) => _queue.setAnnotations(
                  capture.id,
                  annotations == null ? null : jsonEncode(annotations),
                )
              : null,
        ),
      ),
    );
    if (result == null) return;
    if (capture.awaitingMarkup) {
      await _queue.finishMarkup(capture.id);
      unawaited(_drain());
      return;
    }
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
    if (mounted) {
      setState(() {
        _deletedCaptures.add(capture.id);
        _handingOver.remove(capture.id);
      });
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
          image: StoredNetworkImage(capture.url),
          placeholder: capture.posterUrl == null
              ? null
              : StoredNetworkImage(capture.posterUrl!),
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
    final pending = _pendingCaptures
        ?.where(
          (capture) => widget.itemId == null || capture.itemId == widget.itemId,
        )
        .toList();
    final item = _item;
    final uploadedCaptures = _visibleCaptures;
    final roomEdits = _roomEdits;
    final waiting =
        _loadingRoom ||
        pending == null ||
        _remoteEdits == null ||
        pending.isNotEmpty ||
        roomEdits.isNotEmpty ||
        _unresolved.isNotEmpty;
    final hasMedia =
        pending?.isNotEmpty == true ||
        uploadedCaptures.isNotEmpty ||
        _handingOver.values.any(
          (capture) => widget.itemId == null || capture.itemId == widget.itemId,
        );
    final paused = pending
        ?.where(
          (capture) => _annotationError(capture) || capture.lastError != null,
        )
        .firstOrNull;
    final checkIn = _room?.checkIn;
    final baseline = checkIn?.lines
        .where((line) => line.key == item?.baselineKey)
        .firstOrNull;
    final scaffold = Scaffold(
      appBar: AppBar(
        title: Text(
          item?.name ?? widget.itemName ?? _room?.name ?? 'Room media',
        ),
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
          if (widget.itemId != null)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: FilledButton(
                style: FilledButton.styleFrom(minimumSize: const Size(0, 40)),
                onPressed: _busy || _leaving ? null : _leaveAfterSaving,
                child: const Text('Done'),
              ),
            ),
        ],
      ),
      body: KiviloContent(
        maxWidth: 1200,
        child: LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth >= 840;
            final controls = <Widget>[
              if (widget.itemId != null && item != null) ...[
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.name,
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '${item.category} · ${item.condition} · Qty ${item.quantity}',
                        ),
                        if (baseline != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            'At check-in: ${baseline.name} · ${baseline.condition} · Qty ${baseline.quantity}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          if (baseline.identifier?.isNotEmpty == true)
                            Text(
                              'Serial / model at check-in: ${baseline.identifier}',
                            ),
                          if (baseline.meterReading?.isNotEmpty == true)
                            Text('Meter at check-in: ${baseline.meterReading}'),
                          if (baseline.notes?.isNotEmpty == true)
                            Text('Check-in notes: ${baseline.notes}'),
                        ],
                        if (item.identifier?.isNotEmpty == true)
                          Text('Serial / model: ${item.identifier}'),
                        if (item.meterReading?.isNotEmpty == true)
                          Text('Meter reading: ${item.meterReading}'),
                        if (item.notes?.isNotEmpty == true) ...[
                          const SizedBox(height: 8),
                          Text(item.notes!),
                        ],
                        if (widget.onEditItem != null) ...[
                          const SizedBox(height: kiviloButtonGap),
                          SizedBox(
                            width: double.infinity,
                            child: TextButton.icon(
                              onPressed: _busy
                                  ? null
                                  : () async {
                                      setState(() => _busy = true);
                                      try {
                                        await widget.onEditItem!(
                                          item,
                                          _room!.captures,
                                        );
                                        if (mounted) await _loadRoom();
                                      } catch (error) {
                                        if (mounted) {
                                          setState(
                                            () => _error = plainError(error),
                                          );
                                        }
                                      } finally {
                                        if (mounted) {
                                          setState(() => _busy = false);
                                        }
                                      }
                                    },
                              icon: const Icon(Icons.edit_outlined),
                              label: const Text('Edit details'),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
              ],
              if (widget.itemId == null) ...[
                Text(
                  'Room media',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 6),
                Text(
                  'Record a room walkthrough or manage existing room media.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 20),
              ],
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
              // A tile only says "Paused"; the reason belongs here.
              if (paused != null)
                _notice(
                  Icons.error_outline,
                  _annotationError(paused)
                      ? 'A photo uploaded, but its marks did not. Tap to try again, or edit its marks.'
                      : 'Upload paused. ${paused.lastError} Tap to try again.',
                  KiviloColors.redSoft,
                  KiviloColors.red,
                  onTap: () => unawaited(_drain()),
                ),
              // An item's photo actions are the footer, so this screen is about the photos.
              if (widget.itemId == null) ...[
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
                  onPressed:
                      _busy ||
                          _leaving ||
                          _finishing ||
                          _room == null ||
                          (widget.itemId != null && item == null)
                      ? null
                      : _videoMode || widget.picker != null
                      ? _openSystemCamera
                      : _openMultiShotCamera,
                  icon: Icon(
                    _videoMode ? Icons.videocam : Icons.camera_alt_outlined,
                  ),
                  label: Text(
                    _videoMode
                        ? 'Record video'
                        : widget.picker != null
                        ? (hasMedia ? 'Take another photo' : 'Take a photo')
                        : (hasMedia ? 'Take more photos' : 'Take photos'),
                  ),
                ),
                const SizedBox(height: kiviloButtonGap),
                OutlinedButton.icon(
                  onPressed:
                      _busy ||
                          _leaving ||
                          _finishing ||
                          _room == null ||
                          (widget.itemId != null && item == null)
                      ? null
                      : _chooseFromLibrary,
                  icon: const Icon(Icons.image),
                  label: Text(_videoMode ? 'Choose video' : 'Choose photos'),
                ),
              ],
            ];
            final captures =
                <String, ({PendingCapture? pending, EvidenceCapture? saved})>{
                  for (final capture in uploadedCaptures.reversed)
                    capture.clientId ?? capture.id: (
                      pending: null,
                      saved: capture,
                    ),
                };
            for (final capture in [
              ..._handingOver.values,
              ...pending ?? <PendingCapture>[],
            ]) {
              if (widget.itemId != null && capture.itemId != widget.itemId) {
                continue;
              }
              final key = _pendingKey(capture);
              final server = captures[key]?.saved;
              captures[key] = (pending: capture, saved: server);
            }
            final localKeys = _localCaptureOrder.toSet();
            final keys = [
              for (final key in _localCaptureOrder.reversed)
                if (captures.containsKey(key)) key,
              for (final key in captures.keys)
                if (!localKeys.contains(key)) key,
            ];
            Widget cardAt(int index) {
              final key = keys[index];
              final capture = captures[key]!;
              return _captureTile(
                key,
                pending: capture.pending,
                saved: capture.saved,
                number: index + 1,
              );
            }

            // The photo is the content, so the list is the photos themselves:
            // three across on a phone, status only on one still on its way.
            const grid = SliverGridDelegateWithMaxCrossAxisExtent(
              maxCrossAxisExtent: 160,
              mainAxisSpacing: 8,
              crossAxisSpacing: 8,
            );
            int? indexOfKey(Key key) {
              final index = keys.indexOf((key as ValueKey<String>).value);
              return index < 0 ? null : index;
            }

            final media = <Widget>[
              KiviloSectionHeading(
                title: widget.itemId == null ? 'Media' : 'Photos',
                subtitle: 'Saved on your phone first, then added to the report',
              ),
              const SizedBox(height: kiviloHeadingGap),
              if (widget.itemId != null && keys.isEmpty)
                Text(
                  'No photos of this item yet.',
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(color: KiviloColors.muted),
                ),
              if (wide)
                SizedBox(
                  height: (constraints.maxHeight - 100).clamp(360, 600),
                  child: GridView.builder(
                    key: PageStorageKey('capture-media-${widget.roomId}'),
                    primary: false,
                    gridDelegate: grid,
                    itemCount: keys.length,
                    findChildIndexCallback: indexOfKey,
                    itemBuilder: (_, index) => cardAt(index),
                  ),
                )
              else
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  padding: EdgeInsets.zero,
                  gridDelegate: grid,
                  itemCount: keys.length,
                  findChildIndexCallback: indexOfKey,
                  itemBuilder: (_, index) => cardAt(index),
                ),
            ];
            return ListView(
              padding: kiviloScreenPadding,
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
                  // The item card already ends in a 12 gap, so items match rooms' 24.
                  SizedBox(height: widget.itemId == null ? 24 : 12),
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
                if (widget.itemId == null && waiting) ...[
                  const Text(
                    'Review opens once this room’s photos, videos and changes have uploaded. Your media stays saved on this phone while you wait for signal.',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                ],
                if (widget.itemId != null) ...[
                  FilledButton.icon(
                    onPressed:
                        _busy ||
                            _leaving ||
                            _finishing ||
                            _room == null ||
                            item == null
                        ? null
                        : widget.picker != null
                        ? _openSystemCamera
                        : _openMultiShotCamera,
                    icon: const Icon(Icons.camera_alt_outlined),
                    label: Text(
                      widget.picker != null
                          ? (hasMedia ? 'Take another photo' : 'Take a photo')
                          : (hasMedia ? 'Take more photos' : 'Take photos'),
                    ),
                  ),
                  TextButton.icon(
                    style: kiviloTertiary,
                    onPressed:
                        _busy ||
                            _leaving ||
                            _finishing ||
                            _room == null ||
                            item == null
                        ? null
                        : _chooseFromLibrary,
                    icon: const Icon(Icons.image),
                    label: const Text('Choose photos'),
                  ),
                ] else
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
    return ProductScreen(
      screen: ProductScreenName.capture,
      child: PopScope(
        canPop: !_busy && !_leaving && !_finishing,
        onPopInvokedWithResult: (didPop, _) {
          if (!didPop) unawaited(_leaveAfterSaving());
        },
        child: scaffold,
      ),
    );
  }

  /// What a photo still on its way says on its tile, in a word or two so it fits a
  /// phone tile beside the actions button. Null once it is in the report.
  ({String text, bool problem, double? progress})? _pendingStatus(
    PendingCapture capture,
  ) {
    if (_handingOver.containsKey(capture.id)) {
      return (text: 'Adding', problem: false, progress: null);
    }
    final update = capture.clientId == null
        ? null
        : _syncUpdates[capture.clientId!];
    if (capture.awaitingMarkup) {
      return (text: 'Tap to add', problem: false, progress: null);
    }
    if (_annotationError(capture) || capture.lastError != null) {
      return (text: 'Paused', problem: true, progress: null);
    }
    return (
      text: switch (update?.stage) {
        EvidenceSyncStage.uploading => 'Uploading',
        EvidenceSyncStage.registering => 'Adding',
        EvidenceSyncStage.finalizing => 'Adding',
        EvidenceSyncStage.failed => 'Paused',
        _ => capture.claimedAt == null ? 'Waiting' : 'Preparing',
      },
      problem: update?.stage == EvidenceSyncStage.failed,
      progress: (update?.progress ?? 0).clamp(0.0, 1.0),
    );
  }

  bool _annotationError(PendingCapture capture) =>
      capture.uploadedId != null &&
      !capture.registrationAnnotationsApplied &&
      capture.annotations != null;

  Widget _captureTile(
    String identity, {
    required PendingCapture? pending,
    required EvidenceCapture? saved,
    required int number,
  }) {
    final handingOver = pending != null && _handingOver.containsKey(pending.id);
    final kind = pending?.kind ?? saved!.kind;
    final note = pending != null ? pending.note : saved?.note;
    final annotations = pending != null
        ? pending.annotations == null
              ? null
              : jsonDecode(pending.annotations!) as Map<String, dynamic>
        : saved!.annotations;
    final status = pending == null ? null : _pendingStatus(pending);
    final VoidCallback? open = handingOver
        ? null
        : kind == 'PHOTO'
        ? () => unawaited(
            pending != null ? _markQueued(pending) : _markServer(saved!),
          )
        : pending == null
        ? () => unawaited(_openServerActions(saved!))
        : null;
    final hasNote = note?.isNotEmpty == true;
    Widget badge(IconData icon) => DecoratedBox(
      decoration: const BoxDecoration(
        color: Colors.black54,
        shape: BoxShape.circle,
      ),
      child: Padding(
        padding: const EdgeInsets.all(5),
        child: Icon(icon, size: 16, color: Colors.white),
      ),
    );
    return Semantics(
      key: ValueKey(identity),
      button: open != null,
      label: [
        '${kind == 'PHOTO' ? 'Photo' : 'Video'} $number',
        if (hasNote) note!,
        status?.text ?? 'In the report',
      ].join(', '),
      child: Material(
        color: KiviloColors.canvas,
        borderRadius: BorderRadius.circular(12),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: open,
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (kind == 'PHOTO' && (pending == null || _root != null))
                MarkedPhoto(
                  image: pending != null
                      ? FileImage(
                          File('${_root!.path}/${pending.relativePath}'),
                        )
                      : StoredNetworkImage(saved!.posterUrl ?? saved.url),
                  annotations: annotations,
                  cacheWidth: (160 * MediaQuery.devicePixelRatioOf(context))
                      .ceil(),
                  fit: BoxFit.cover,
                )
              else
                VideoPoster(posterUrl: saved?.posterUrl, iconSize: 28),
              if (status != null)
                Positioned(
                  left: 6,
                  top: 6,
                  right: 36,
                  child: Align(
                    alignment: Alignment.topLeft,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 4,
                        ),
                        // Already in the tile's label; read once.
                        child: ExcludeSemantics(
                          child: Text(
                            status.text,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: status.problem
                                  ? KiviloColors.redBorder
                                  : Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              // The 48 tap target is offset so the visible circle sits 6 from the
              // corner, level with the status chip.
              Positioned(
                top: -5,
                right: -5,
                child: IconButton(
                  onPressed: handingOver
                      ? null
                      : () => unawaited(
                          pending != null
                              ? _openQueuedActions(pending)
                              : _openServerActions(saved!),
                        ),
                  icon: badge(Icons.more_horiz),
                  tooltip: 'Media actions',
                ),
              ),
              if (hasNote)
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  child: ColoredBox(
                    color: Colors.black54,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(8, 5, 8, 6),
                      child: ExcludeSemantics(
                        child: Text(
                          note!,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            height: 1.3,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              if (status?.progress != null)
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  child: KiviloProgressBar(
                    value: status!.progress,
                    color: KiviloColors.pink,
                    minHeight: 3,
                  ),
                ),
            ],
          ),
        ),
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
