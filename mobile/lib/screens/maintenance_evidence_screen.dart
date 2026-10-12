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
import '../ui/kivilo_theme.dart';

class MaintenanceEvidenceScreen extends StatefulWidget {
  const MaintenanceEvidenceScreen({
    super.key,
    required this.caseId,
    required this.purpose,
    this.visitId,
  });

  final String caseId;
  final String purpose;
  final String? visitId;

  @override
  State<MaintenanceEvidenceScreen> createState() =>
      _MaintenanceEvidenceScreenState();
}

class _MaintenanceEvidenceScreenState extends State<MaintenanceEvidenceScreen> {
  final _queue = CaptureQueue();
  final _api = Api();
  final _picker = ImagePicker();
  Directory? _root;
  bool _busy = false;
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
      _root = await getApplicationSupportDirectory();
      await _recoverLostPhoto();
    } catch (error) {
      if (mounted) {
        setState(() => _message = 'Could not prepare evidence: $error');
      }
    }
  }

  Future<void> _recoverLostPhoto() async {
    if (!Platform.isAndroid) return;
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
      final photo = await _picker.pickImage(
        source: source,
        imageQuality: 95,
        requestFullMetadata: false,
      );
      if (photo != null) await _savePhoto(photo);
    } catch (error) {
      if (mounted) {
        setState(() => _message = 'Could not add evidence: $error');
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
            ? 'Evidence saved and uploaded.'
            : 'Evidence saved on this phone. Kivilo will retry automatically.',
      );
    }
  }

  @override
  void dispose() {
    unawaited(_queue.close());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(
        widget.purpose == 'BEFORE' ? 'Before evidence' : 'After evidence',
      ),
    ),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(24, 30, 24, 28),
          decoration: BoxDecoration(
            color: KiviloColors.canvas,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: KiviloColors.border),
          ),
          child: const Column(
            children: [
              Icon(
                Icons.add_a_photo_outlined,
                size: 44,
                color: KiviloColors.pink,
              ),
              SizedBox(height: 14),
              Text(
                'Add evidence with your phone’s camera',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: KiviloColors.ink,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              SizedBox(height: 8),
              Text(
                'Use the full native camera experience, or choose a photo you already took.',
                textAlign: TextAlign.center,
                style: TextStyle(color: KiviloColors.muted),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        FilledButton.icon(
          onPressed: _busy || _root == null
              ? null
              : () => unawaited(_addPhoto(ImageSource.camera)),
          icon: const Icon(Icons.photo_camera_outlined),
          label: Text(_busy ? 'Saving…' : 'Take evidence photo'),
        ),
        const SizedBox(height: 10),
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
    ),
  );
}
