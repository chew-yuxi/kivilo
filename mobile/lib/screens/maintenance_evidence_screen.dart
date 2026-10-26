import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/api.dart';
import '../services/capture_backend.dart';
import '../services/capture_queue.dart';
import '../services/capture_store.dart';
import '../services/uploader.dart';
import '../ui/kivilo_layout.dart';

class MaintenanceEvidenceScreen extends StatefulWidget {
  const MaintenanceEvidenceScreen({
    super.key,
    required this.caseId,
    required this.purpose,
    this.visitId,
    this.api,
    this.queue,
    this.picker,
    this.supportDirectory,
    this.canRecoverLostData,
  });

  final String caseId;
  final String purpose;
  final String? visitId;
  final Api? api;
  final CaptureQueue? queue;
  final ImagePicker? picker;
  final Future<Directory> Function()? supportDirectory;
  final bool? canRecoverLostData;

  @override
  State<MaintenanceEvidenceScreen> createState() =>
      _MaintenanceEvidenceScreenState();
}

class _MaintenanceEvidenceScreenState extends State<MaintenanceEvidenceScreen> {
  late final _queue = widget.queue ?? CaptureQueue();
  late final _api = widget.api ?? Api();
  late final _picker = widget.picker ?? ImagePicker();
  Directory? _root;
  bool _busy = true;
  String? _message;

  String get _queueOwner => 'maintenance:${widget.caseId}';
  String get _target =>
      '${widget.purpose}${widget.visitId == null ? '' : '|${widget.visitId}'}';

  @override
  void initState() {
    super.initState();
    unawaited(_initialize());
  }

  Future<void> _initialize() async {
    try {
      _root = await (widget.supportDirectory ?? getApplicationSupportDirectory)();
      await _recoverLostPhoto();
    } catch (error) {
      if (mounted) {
        setState(() => _message = 'Could not prepare the photo. ${plainError(error)}');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _recoverLostPhoto() async {
    if (!(widget.canRecoverLostData ?? Platform.isAndroid)) return;
    // The receipt's original tenancy/request must recover its Android picker result.
    if (await File('${_root!.path}/$supportingDocumentPickerFilename').exists()) {
      return;
    }
    final response = await _picker.retrieveLostData();
    if (response.isEmpty) return;
    if (response.exception != null) {
      throw StateError(
        'Could not recover the interrupted photo: ${response.exception}',
      );
    }
    for (final photo in response.files ?? const <XFile>[]) {
      await _savePhoto(photo);
    }
  }

  Future<void> _addPhoto(ImageSource source) async {
    if (_busy || _root == null) return;
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      if (await File('${_root!.path}/$supportingDocumentPickerFilename').exists()) {
        throw const ApiFailure(
          'Reopen Supporting documents to recover the previous photo before taking another.',
          null,
        );
      }
      final photo = await _picker.pickImage(
        source: source,
        imageQuality: 95,
        requestFullMetadata: false,
      );
      if (photo != null) await _savePhoto(photo);
    } catch (error) {
      if (mounted) {
        setState(() => _message = 'Could not add the photo. ${plainError(error)}');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _savePhoto(XFile photo) async {
    final root = _root!;
    final path = photo.path.toLowerCase();
    final extension = path.endsWith('.png')
        ? 'png'
        : path.endsWith('.webp')
        ? 'webp'
        : path.endsWith('.heic')
        ? 'heic'
        : path.endsWith('.heif')
        ? 'heif'
        : 'jpg';
    final mimeType =
        photo.mimeType ??
        switch (extension) {
          'png' => 'image/png',
          'webp' => 'image/webp',
          'heic' => 'image/heic',
          'heif' => 'image/heif',
          _ => 'image/jpeg',
        };
    final authOwner = Supabase.instance.client.auth.currentUser!.id;
    await CaptureStore(queue: _queue, root: root).save(
      source: File(photo.path),
      ownerId: authOwner,
      inspectionId: _queueOwner,
      roomId: _target,
      kind: widget.purpose,
      extension: extension,
      mimeType: mimeType,
    );
    final moved = await Uploader(
      queue: _queue,
      backend: RoutingEvidenceBackend(_api.dio),
      root: root,
      ownerId: authOwner,
    ).drain();
    if (mounted) {
      setState(
        () => _message = moved
            ? 'Photo saved and uploaded.'
            : 'Photo saved on this phone. Kivilo will retry automatically.',
      );
    }
  }

  @override
  void dispose() {
    if (widget.queue == null) unawaited(_queue.close());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_busy,
    child: Scaffold(
    appBar: AppBar(
      title: Text(
        widget.purpose == 'BEFORE' ? 'Before photos' : 'After photos',
      ),
    ),
    body: KiviloContent(maxWidth: 720, child: ListView(
      padding: kiviloScreenPadding,
      children: [
        FilledButton.icon(
          onPressed: _busy || _root == null
              ? null
              : () => unawaited(_addPhoto(ImageSource.camera)),
          icon: const Icon(Icons.photo_camera_outlined),
          label: Text(_busy ? 'Saving…' : 'Take photo'),
        ),
        const SizedBox(height: kiviloButtonGap),
        OutlinedButton.icon(
          onPressed: _busy || _root == null
              ? null
              : () => unawaited(_addPhoto(ImageSource.gallery)),
          icon: const Icon(Icons.add_photo_alternate_outlined),
          label: const Text('Choose existing photo'),
        ),
        if (_message != null) ...[
          const SizedBox(height: 18),
          Text(_message!, textAlign: TextAlign.center),
        ],
      ],
    )),
    ),
  );
}
