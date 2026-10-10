import 'dart:async';
import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/api.dart';
import '../services/capture_backend.dart';
import '../services/capture_queue.dart';
import '../services/capture_store.dart';
import '../services/uploader.dart';

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
  State<MaintenanceEvidenceScreen> createState() => _MaintenanceEvidenceScreenState();
}

class _MaintenanceEvidenceScreenState extends State<MaintenanceEvidenceScreen> {
  final _queue = CaptureQueue();
  final _api = Api();
  CameraController? _camera;
  Directory? _root;
  bool _busy = false;
  String? _message;

  String get _queueOwner => 'maintenance:${widget.caseId}';
  String get _target => '${widget.purpose}${widget.visitId == null ? '' : '|${widget.visitId}'}';

  @override
  void initState() {
    super.initState();
    unawaited(_initialize());
  }

  Future<void> _initialize() async {
    try {
      _root = await getApplicationSupportDirectory();
      final cameras = await availableCameras();
      final selected = cameras.firstWhere(
        (camera) => camera.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );
      final controller = CameraController(selected, ResolutionPreset.high, enableAudio: false);
      await controller.initialize();
      if (!mounted) {
        await controller.dispose();
        return;
      }
      setState(() => _camera = controller);
    } catch (error) {
      if (mounted) setState(() => _message = 'Camera unavailable: $error');
    }
  }

  Future<void> _takePhoto() async {
    final camera = _camera;
    final root = _root;
    if (_busy || camera == null || root == null) return;
    setState(() { _busy = true; _message = null; });
    try {
      final photo = await camera.takePicture();
      final authOwner = Supabase.instance.client.auth.currentUser!.id;
      await CaptureStore(queue: _queue, root: root).save(
        source: File(photo.path),
        ownerId: authOwner,
        inspectionId: _queueOwner,
        roomId: _target,
        kind: widget.purpose,
        extension: 'jpg',
        mimeType: 'image/jpeg',
      );
      final moved = await Uploader(
        queue: _queue,
        backend: RoutingEvidenceBackend(_api.dio),
        root: root,
        ownerId: authOwner,
      ).drain();
      if (mounted) {
        setState(() => _message = moved
            ? 'Evidence saved and uploaded.'
            : 'Evidence saved on this phone. Kivilo will retry automatically.');
      }
    } catch (error) {
      if (mounted) setState(() => _message = 'Evidence is still on this phone: $error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    unawaited(_camera?.dispose());
    unawaited(_queue.close());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(widget.purpose == 'BEFORE' ? 'Before evidence' : 'After evidence')),
    body: Column(children: [
      Expanded(
        child: _camera?.value.isInitialized == true
            ? CameraPreview(_camera!)
            : const Center(child: CircularProgressIndicator()),
      ),
      if (_message != null)
        Padding(padding: const EdgeInsets.all(12), child: Text(_message!, textAlign: TextAlign.center)),
      SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _busy ? null : _takePhoto,
              icon: const Icon(Icons.camera_alt_outlined),
              label: Text(_busy ? 'Saving…' : 'Take evidence photo'),
            ),
          ),
        ),
      ),
    ]),
  );
}
