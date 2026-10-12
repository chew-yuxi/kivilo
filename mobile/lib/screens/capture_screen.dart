import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/inspection.dart';
import '../services/api.dart';
import '../services/capture_backend.dart';
import '../services/capture_queue.dart';
import '../services/capture_store.dart';
import '../services/uploader.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_theme.dart';
import 'photo_mark_screen.dart';

class CaptureScreen extends StatefulWidget {
  const CaptureScreen({
    super.key,
    required this.inspectionId,
    required this.roomId,
  });

  final String inspectionId;
  final String roomId;

  @override
  State<CaptureScreen> createState() => _CaptureScreenState();
}

class _CaptureScreenState extends State<CaptureScreen> {
  final _api = Api();
  final _queue = CaptureQueue();
  final _picker = ImagePicker();
  late final _backend = RoutingEvidenceBackend(_api.dio);
  late final String _ownerId = Supabase.instance.client.auth.currentUser!.id;
  Directory? _root;
  RoomDetail? _room;
  Future<void>? _uploading;
  bool _videoMode = false;
  bool _busy = false;
  bool _leaving = false;
  bool _finishing = false;
  bool _offline = false;
  String? _error;
  List<PendingRemoteEdit> _remoteEdits = const [];
  List<String> _unresolved = const [];

  @override
  void initState() {
    super.initState();
    unawaited(_initialize());
  }

  Future<void> _initialize() async {
    try {
      final root = await getApplicationSupportDirectory();
      _root = root;
      _unresolved = await CaptureStore(
        queue: _queue,
        root: root,
      ).reconcile(_ownerId);
      await _loadRoom();
      await _recoverLostPickerData();
      unawaited(_drain());
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    }
  }

  Future<void> _loadRoom() async {
    try {
      if (Supabase.instance.client.auth.currentUser?.id != _ownerId) {
        throw const ApiFailure('Account changed. Open this room again.', 401);
      }
      final detail = await _api.room(widget.inspectionId, widget.roomId);
      if (Supabase.instance.client.auth.currentUser?.id != _ownerId) {
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
      if (mounted) setState(() => _error = 'Could not load room: $error');
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
        setState(() => _error = 'Could not capture evidence: $error');
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
      if (mounted) setState(() => _error = 'Could not add evidence: $error');
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
      final edits = await _queue.remoteEditsFor(_ownerId, widget.inspectionId);
      if (mounted) setState(() => _remoteEdits = edits);
    } catch (error) {
      if (mounted) setState(() => _error = 'Upload paused: $error');
    } finally {
      _uploading = null;
    }
  }

  Future<String?> _askNote(String? initial) async {
    return showKiviloDrawer<String>(
      context: context,
      builder: (_) => _PhotoNoteDrawer(initial: initial),
    );
  }

  Future<String?> _chooseEvidenceAction({required bool photo}) {
    return showKiviloDrawer<String>(
      context: context,
      builder: (context) => KiviloDrawer(
        title: const Text('Evidence actions'),
        content: Column(
          children: [
            ListTile(
              leading: const Icon(Icons.notes_outlined),
              title: const Text('Edit note'),
              subtitle: const Text('Describe what this evidence shows'),
              onTap: () => Navigator.pop(context, 'note'),
            ),
            if (photo)
              ListTile(
                leading: const Icon(Icons.gesture_outlined),
                title: const Text('Mark photo'),
                subtitle: const Text('Circle or point to a detail'),
                onTap: () => Navigator.pop(context, 'mark'),
              ),
            const Divider(),
            ListTile(
              leading: const Icon(
                Icons.delete_outline,
                color: KiviloColors.red,
              ),
              title: const Text(
                'Delete evidence',
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
    final action = await _chooseEvidenceAction(photo: capture.kind == 'PHOTO');
    if (!mounted || action == null) return;
    if (action == 'note') await _noteQueued(capture);
    if (action == 'mark') await _markQueued(capture);
    if (action == 'delete') await _deleteQueued(capture);
  }

  Future<void> _openServerActions(EvidenceCapture capture) async {
    final action = await _chooseEvidenceAction(photo: capture.kind == 'PHOTO');
    if (!mounted || action == null) return;
    if (action == 'note') await _noteServer(capture);
    if (action == 'mark') await _markServer(capture);
    if (action == 'delete') {
      await _queue.queueRemoteDelete(_ownerId, widget.inspectionId, capture.id);
      await _drain();
    }
  }

  Future<void> _noteQueued(PendingCapture capture) async {
    final note = await _askNote(capture.note);
    if (note == null) return;
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
                'Could not locate this synced photo. Please retry the note.',
          );
        }
        return;
      }
      await _queue.queueRemoteNote(
        _ownerId,
        widget.inspectionId,
        serverId,
        value,
      );
    }
    unawaited(_drain());
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
                'Could not locate this synced photo. Please retry the marks.',
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
                'Could not locate this synced capture. Please retry deletion.',
          );
        }
        return;
      }
      await _queue.queueRemoteDelete(_ownerId, widget.inspectionId, serverId);
    }
    unawaited(_drain());
  }

  Future<void> _noteServer(EvidenceCapture capture) async {
    final note = await _askNote(capture.note);
    if (note == null) return;
    await _queue.queueRemoteNote(
      _ownerId,
      widget.inspectionId,
      capture.id,
      note.trim().isEmpty ? null : note.trim(),
    );
    unawaited(_drain());
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
      setState(() => _error = 'Wait for the capture to finish saving.');
      return;
    }
    setState(() => _finishing = true);
    try {
      await _drain();
      if (!mounted) return;
      final pending = await _queue.forRoom(widget.roomId, _ownerId);
      final pendingEdits = await _queue.remoteEditsFor(
        _ownerId,
        widget.inspectionId,
      );
      if (!mounted) return;
      if (pending.isNotEmpty ||
          pendingEdits.isNotEmpty ||
          _unresolved.isNotEmpty) {
        setState(
          () => _error =
              'Evidence or edits are still waiting to sync. Retry when connected.',
        );
        return;
      }
      final consent = await showKiviloDrawer<bool>(
        context: context,
        builder: (context) => KiviloDrawer(
          title: const Text('Draft with AI?'),
          content: const Text(
            'Kivilo sends this room’s video, photos and property details to Google Gemini to draft an inventory. '
            'For a check-out, it also sends the reviewed check-in and check-out inventories and tenancy length to Gemini to draft findings. '
            'You review and correct every draft before anyone signs.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Not now'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Allow and draft'),
            ),
          ],
        ),
      );
      if (consent != true) return;
      try {
        await _api.consentToAiProcessing(widget.inspectionId);
        await _api.processRoom(widget.inspectionId, widget.roomId);
        if (mounted) Navigator.pop(context);
      } catch (error) {
        if (mounted) {
          setState(() => _error = 'Could not start drafting: $error');
        }
      }
    } finally {
      if (mounted) setState(() => _finishing = false);
    }
  }

  @override
  void dispose() {
    final upload = _uploading;
    if (upload == null) {
      unawaited(_queue.close());
    } else {
      unawaited(upload.whenComplete(_queue.close));
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scaffold = Scaffold(
      appBar: AppBar(
        title: Text(_room?.name ?? 'Capture room'),
        leading: BackButton(onPressed: () => unawaited(_leaveAfterSaving())),
        actions: [
          IconButton(
            onPressed: () {
              unawaited(_drain());
            },
            icon: const Icon(Icons.sync),
            tooltip: 'Retry uploads',
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        children: [
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
              'Offline. Captures are saved on this phone until they sync.',
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
              '${_unresolved.length} interrupted capture(s) need recovery. Keep the app data on this phone.',
              KiviloColors.amberSoft,
              KiviloColors.amber,
            ),
          if (_remoteEdits.isNotEmpty)
            _notice(
              Icons.sync,
              '${_remoteEdits.length} edit(s) are waiting to sync. Tap to retry.',
              KiviloColors.amberSoft,
              KiviloColors.amber,
              onTap: () => unawaited(_drain()),
            ),
          Center(
            child: SegmentedButton<bool>(
              segments: const [
                ButtonSegment(
                  value: false,
                  label: Text('Photos'),
                  icon: Icon(Icons.photo_camera),
                ),
                ButtonSegment(
                  value: true,
                  label: Text('Video'),
                  icon: Icon(Icons.videocam),
                ),
              ],
              selected: {_videoMode},
              onSelectionChanged: (selected) =>
                  unawaited(_switchMode(selected.first)),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _busy || _leaving || _finishing || _room == null
                ? null
                : _openSystemCamera,
            icon: Icon(_videoMode ? Icons.videocam : Icons.photo_camera),
            label: Text(_videoMode ? 'Record video' : 'Take photo'),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: _busy || _leaving || _finishing || _room == null
                ? null
                : _chooseFromLibrary,
            icon: const Icon(Icons.add_photo_alternate_outlined),
            label: Text(_videoMode ? 'Choose video' : 'Choose photos'),
          ),
          const SizedBox(height: 24),
          const KiviloSectionHeading(
            title: 'Evidence',
            subtitle: 'Saved on your phone first, then added to the report',
          ),
          const SizedBox(height: 12),
          StreamBuilder<List<PendingCapture>>(
            stream: _queue.watch(widget.roomId, ownerId: _ownerId),
            builder: (context, snapshot) {
              final pending = snapshot.data ?? const [];
              return Column(
                children: [
                  for (final capture in pending)
                    Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: ListTile(
                        contentPadding: const EdgeInsets.fromLTRB(12, 6, 4, 6),
                        leading: capture.kind == 'PHOTO' && _root != null
                            ? ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.file(
                                  File(
                                    '${_root!.path}/${capture.relativePath}',
                                  ),
                                  width: 56,
                                  height: 56,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, _, _) =>
                                      const Icon(Icons.broken_image),
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
                              : (capture.kind == 'PHOTO'
                                    ? 'Photo on this phone'
                                    : 'Video on this phone'),
                        ),
                        subtitle: Text(
                          capture.uploadedId != null &&
                                  !capture.registrationAnnotationsApplied &&
                                  capture.annotations != null
                              ? 'Photo uploaded, but marks were not accepted. '
                                    'Retry sync; if the report was sent, open Mark photo '
                                    'and undo the marks to proceed.'
                              : capture.lastError == null
                              ? 'Saved on phone · syncing'
                              : 'Retry ${capture.attempts}: ${capture.lastError}',
                          style: TextStyle(
                            color: capture.lastError == null
                                ? KiviloColors.amber
                                : KiviloColors.red,
                          ),
                        ),
                        trailing: IconButton(
                          onPressed: () =>
                              unawaited(_openQueuedActions(capture)),
                          icon: const Icon(Icons.more_horiz),
                          tooltip: 'Evidence actions',
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
          for (final capture in _room?.captures ?? const <EvidenceCapture>[])
            Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: ListTile(
                contentPadding: const EdgeInsets.fromLTRB(12, 6, 4, 6),
                leading: capture.kind == 'PHOTO'
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          capture.url,
                          width: 56,
                          height: 56,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => const Icon(Icons.image),
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
                      : (capture.kind == 'PHOTO'
                            ? 'Photo synced'
                            : 'Video synced'),
                ),
                subtitle: const Text(
                  'Synced to report',
                  style: TextStyle(color: KiviloColors.green),
                ),
                trailing: IconButton(
                  onPressed: () => unawaited(_openServerActions(capture)),
                  icon: const Icon(Icons.more_horiz),
                  tooltip: 'Evidence actions',
                ),
              ),
            ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
          child: FilledButton.icon(
            onPressed: _room == null || _busy || _leaving || _finishing
                ? null
                : _finishRoom,
            icon: const Icon(Icons.auto_awesome_outlined),
            label: const Text('Finish room & draft inventory'),
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

class _PhotoNoteDrawer extends StatefulWidget {
  const _PhotoNoteDrawer({this.initial});

  final String? initial;

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
      title: const Text('Photo note'),
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
          onPressed: () => Navigator.pop(context, _controller.text),
          child: const Text('Save note'),
        ),
      ],
    );
  }
}
