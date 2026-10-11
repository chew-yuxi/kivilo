import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:camera/camera.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/inspection.dart';
import '../services/api.dart';
import '../services/capture_backend.dart';
import '../services/capture_queue.dart';
import '../services/capture_store.dart';
import '../services/uploader.dart';
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

class _CaptureScreenState extends State<CaptureScreen>
    with WidgetsBindingObserver {
  final _api = Api();
  final _queue = CaptureQueue();
  late final _backend = RoutingEvidenceBackend(_api.dio);
  late final String _ownerId = Supabase.instance.client.auth.currentUser!.id;
  Directory? _root;
  RoomDetail? _room;
  CameraController? _camera;
  Future<void>? _uploading;
  bool _videoMode = false;
  bool _busy = false;
  bool _recording = false;
  bool _offline = false;
  bool _isForeground = true;
  DateTime? _startedAt;
  String? _error;
  List<PendingRemoteEdit> _remoteEdits = const [];
  List<String> _unresolved = const [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
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
      await _initCamera();
      unawaited(_drain());
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    }
  }

  Future<void> _loadRoom() async {
    final root = _root;
    if (root == null) return;
    final cache = File(
      '${root.path}/room-cache/$_ownerId/${widget.inspectionId}/${widget.roomId}.json',
    );
    try {
      final response = await _api.dio.get<Map<String, dynamic>>(
        '/api/v1/inspections/${widget.inspectionId}/rooms/${widget.roomId}',
      );
      final data = response.data!;
      final detail = RoomDetail.fromJson(data);
      await cache.parent.create(recursive: true);
      await cache.writeAsString(jsonEncode(data), flush: true);
      if (mounted) {
        setState(() {
          _room = detail;
          _offline = false;
          _error = null;
        });
      }
    } on DioException catch (error) {
      final transportFailure =
          error.response == null &&
          (error.type == DioExceptionType.connectionError ||
              error.type == DioExceptionType.connectionTimeout ||
              error.type == DioExceptionType.sendTimeout ||
              error.type == DioExceptionType.receiveTimeout ||
              error.error is SocketException);
      if (!transportFailure) {
        if (mounted) {
          setState(() {
            _room = null;
            _offline = false;
            _error = error.response?.statusCode == 401
                ? 'Session expired. Sign in again before capturing this room.'
                : 'This room is unavailable (${error.response?.statusCode ?? 'request failed'}). Refresh access before capturing.';
          });
        }
        return;
      }
      if (await cache.exists()) {
        final detail = RoomDetail.fromJson(
          jsonDecode(await cache.readAsString()) as Map<String, dynamic>,
        );
        if (mounted) {
          setState(() {
            _room = detail;
            _offline = true;
          });
        }
      } else if (mounted) {
        setState(
          () => _error =
              'Room has not been loaded on this phone. Connect once to open it.',
        );
      }
    } catch (error) {
      if (mounted) setState(() => _error = 'Could not load room: $error');
    }
  }

  Future<void> _initCamera() async {
    if (!mounted || !_isForeground || _room == null || _camera != null) return;
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        throw StateError('No camera is available on this device.');
      }
      final description = cameras.firstWhere(
        (camera) => camera.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );
      final controller = CameraController(
        description,
        ResolutionPreset.high,
        enableAudio: _videoMode,
      );
      await controller.initialize();
      if (!mounted || !_isForeground) {
        await controller.dispose();
        return;
      }
      setState(() {
        _camera = controller;
        _error = null;
      });
    } on CameraException catch (error) {
      if (mounted) {
        setState(
          () => _error = switch (error.code) {
            'CameraAccessDenied' || 'CameraAccessDeniedWithoutPrompt' =>
              'Camera access is off. Enable it in your phone Settings to capture this room.',
            'AudioAccessDenied' || 'AudioAccessDeniedWithoutPrompt' =>
              'Microphone access is off. Enable it in Settings to narrate a video, or switch to photos.',
            _ => 'Camera unavailable: ${error.description ?? error.code}',
          },
        );
      }
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    }
  }

  Future<void> _switchMode(bool video) async {
    if (_busy || _recording || video == _videoMode) return;
    setState(() {
      _videoMode = video;
      _error = null;
    });
    final old = _camera;
    setState(() => _camera = null);
    await old?.dispose();
    await _initCamera();
  }

  Future<void> _takePhoto() async {
    final camera = _camera;
    final root = _root;
    if (_busy || camera == null || root == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final photo = await camera.takePicture();
      await CaptureStore(queue: _queue, root: root).save(
        source: File(photo.path),
        ownerId: _ownerId,
        inspectionId: widget.inspectionId,
        roomId: widget.roomId,
        kind: 'PHOTO',
        extension: 'jpg',
        mimeType: 'image/jpeg',
      );
      unawaited(_drain());
    } catch (error) {
      if (mounted) setState(() => _error = 'Photo could not be saved: $error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _toggleVideo() async {
    final camera = _camera;
    final root = _root;
    if (_busy || camera == null || root == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (!_recording) {
        await camera.startVideoRecording();
        _startedAt = DateTime.now();
        if (mounted) setState(() => _recording = true);
      } else {
        final video = await camera.stopVideoRecording();
        final duration = math.max(
          1,
          DateTime.now().difference(_startedAt!).inSeconds,
        );
        final extension = video.path.toLowerCase().endsWith('.mov')
            ? 'mov'
            : 'mp4';
        await CaptureStore(queue: _queue, root: root).save(
          source: File(video.path),
          ownerId: _ownerId,
          inspectionId: widget.inspectionId,
          roomId: widget.roomId,
          kind: 'VIDEO',
          extension: extension,
          mimeType: extension == 'mov' ? 'video/quicktime' : 'video/mp4',
          durationSec: duration,
        );
        if (mounted) setState(() => _recording = false);
        unawaited(_drain());
      }
    } catch (error) {
      if (mounted) setState(() => _error = 'Video could not be saved: $error');
    } finally {
      if (mounted) setState(() => _busy = false);
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
    final controller = TextEditingController(text: initial);
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Photo note'),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLines: 3,
          decoration: const InputDecoration(
            hintText: 'What should the agent notice?',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    controller.dispose();
    return result;
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
    if (_recording) {
      setState(
        () => _error = 'Stop and save the video before finishing this room.',
      );
      return;
    }
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
    final consent = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
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
      if (mounted) setState(() => _error = 'Could not start drafting: $error');
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive) {
      _isForeground = false;
      unawaited(_pauseCamera());
    } else if (state == AppLifecycleState.resumed) {
      _isForeground = true;
      unawaited(_initCamera());
      unawaited(_drain());
    }
  }

  Future<void> _pauseCamera() async {
    // A camera call may have returned a temporary file that is still being copied
    // into app support. Disposing its controller in that gap can make the temporary
    // source disappear before the journal and durable file exist.
    while (_busy) {
      await Future<void>.delayed(const Duration(milliseconds: 50));
    }
    if (_recording) {
      await _toggleVideo();
      if (_recording) {
        return; // Keep the controller if finalizing the video failed.
      }
    }
    final camera = _camera;
    if (camera == null) return;
    if (mounted) setState(() => _camera = null);
    await camera.dispose();
    if (_isForeground) await _initCamera();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_camera?.dispose());
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
    final camera = _camera;
    return Scaffold(
      appBar: AppBar(
        title: Text(_room?.name ?? 'Capture room'),
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
        children: [
          if (_offline)
            const MaterialBanner(
              content: Text(
                'Offline. New captures stay on this phone until they sync.',
              ),
              actions: [],
            ),
          if (_error != null)
            MaterialBanner(
              content: Text(_error!),
              actions: [
                TextButton(
                  onPressed: () => setState(() => _error = null),
                  child: const Text('Dismiss'),
                ),
              ],
            ),
          if (_unresolved.isNotEmpty)
            MaterialBanner(
              content: Text(
                '${_unresolved.length} interrupted capture(s) need recovery. Keep the app data on this phone.',
              ),
              actions: const [],
            ),
          if (_remoteEdits.isNotEmpty)
            MaterialBanner(
              content: Text(
                '${_remoteEdits.length} note, mark or deletion change(s) are waiting to sync.',
              ),
              actions: [
                TextButton(
                  onPressed: () {
                    unawaited(_drain());
                  },
                  child: const Text('Retry'),
                ),
              ],
            ),
          if (camera != null && camera.value.isInitialized) ...[
            AspectRatio(
              aspectRatio: camera.value.aspectRatio,
              child: CameraPreview(camera),
            ),
            const SizedBox(height: 12),
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
                onSelectionChanged: (selected) {
                  unawaited(_switchMode(selected.first));
                },
              ),
            ),
            const SizedBox(height: 12),
            Center(
              child: FilledButton.icon(
                onPressed: _busy || _room == null
                    ? null
                    : _videoMode
                    ? _toggleVideo
                    : _takePhoto,
                icon: Icon(
                  _videoMode
                      ? (_recording ? Icons.stop : Icons.fiber_manual_record)
                      : Icons.camera_alt,
                ),
                label: Text(
                  _videoMode
                      ? (_recording
                            ? 'Stop and save video'
                            : 'Record walkthrough')
                      : 'Take photo',
                ),
              ),
            ),
          ] else ...[
            const SizedBox(height: 16),
            Center(
              child: TextButton.icon(
                onPressed: _initCamera,
                icon: const Icon(Icons.refresh),
                label: const Text('Open camera'),
              ),
            ),
          ],
          const SizedBox(height: 16),
          StreamBuilder<List<PendingCapture>>(
            stream: _queue.watch(widget.roomId, ownerId: _ownerId),
            builder: (context, snapshot) {
              final pending = snapshot.data ?? const [];
              return Column(
                children: [
                  for (final capture in pending)
                    ListTile(
                      leading: capture.kind == 'PHOTO' && _root != null
                          ? Image.file(
                              File('${_root!.path}/${capture.relativePath}'),
                              width: 56,
                              height: 56,
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) =>
                                  const Icon(Icons.broken_image),
                            )
                          : const Icon(Icons.videocam),
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
                            ? 'Saved · waiting to sync'
                            : 'Retry ${capture.attempts}: ${capture.lastError}',
                      ),
                      trailing: PopupMenuButton<String>(
                        onSelected: (action) {
                          if (action == 'note') unawaited(_noteQueued(capture));
                          if (action == 'mark') unawaited(_markQueued(capture));
                          if (action == 'delete') {
                            unawaited(_deleteQueued(capture));
                          }
                        },
                        itemBuilder: (_) => [
                          const PopupMenuItem(
                            value: 'note',
                            child: Text('Edit note'),
                          ),
                          if (capture.kind == 'PHOTO')
                            const PopupMenuItem(
                              value: 'mark',
                              child: Text('Mark photo'),
                            ),
                          const PopupMenuItem(
                            value: 'delete',
                            child: Text('Delete'),
                          ),
                        ],
                      ),
                    ),
                ],
              );
            },
          ),
          for (final capture in _room?.captures ?? const <EvidenceCapture>[])
            ListTile(
              leading: capture.kind == 'PHOTO'
                  ? Image.network(
                      capture.url,
                      width: 56,
                      height: 56,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => const Icon(Icons.image),
                    )
                  : const Icon(Icons.videocam),
              title: Text(
                capture.note?.isNotEmpty == true
                    ? capture.note!
                    : (capture.kind == 'PHOTO'
                          ? 'Photo synced'
                          : 'Video synced'),
              ),
              subtitle: const Text('On the report'),
              trailing: PopupMenuButton<String>(
                onSelected: (action) {
                  if (action == 'note') unawaited(_noteServer(capture));
                  if (action == 'mark') unawaited(_markServer(capture));
                  if (action == 'delete') {
                    unawaited(
                      _queue
                          .queueRemoteDelete(
                            _ownerId,
                            widget.inspectionId,
                            capture.id,
                          )
                          .then((_) => _drain()),
                    );
                  }
                },
                itemBuilder: (_) => [
                  const PopupMenuItem(value: 'note', child: Text('Edit note')),
                  if (capture.kind == 'PHOTO')
                    const PopupMenuItem(
                      value: 'mark',
                      child: Text('Mark photo'),
                    ),
                  const PopupMenuItem(value: 'delete', child: Text('Delete')),
                ],
              ),
            ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.all(16),
            child: FilledButton(
              onPressed: _room == null ? null : _finishRoom,
              child: const Text('Finish room and draft inventory'),
            ),
          ),
        ],
      ),
    );
  }
}
