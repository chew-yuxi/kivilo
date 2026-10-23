import 'dart:convert';
import 'dart:io';

import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'addendum_photos.dart' show photoMimeType;
import 'api.dart';
import 'capture_backend.dart';
import 'capture_queue.dart';
import 'capture_store.dart';
import 'uploader.dart';

/// Receipt photos use the same durable, account-owned queue as inspection evidence.
/// The namespace keeps them separate from every room and its review/signature checks.
class SupportingDocumentPhotos {
  SupportingDocumentPhotos({
    required this.api,
    required this.tenancyId,
    ImagePicker? picker,
    Directory? root,
    CaptureQueue? queue,
    CaptureBackend? backend,
    String? Function()? currentOwner,
    bool? supportsLostData,
  }) : _picker = picker ?? ImagePicker(),
       // Public injection names make the storage and retry behavior testable.
       // ignore: prefer_initializing_formals
       _root = root,
       // ignore: prefer_initializing_formals
       _queue = queue,
       // ignore: prefer_initializing_formals
       _backend = backend,
       _supportsLostData = supportsLostData ?? Platform.isAndroid,
       _currentOwner =
           currentOwner ??
           (() => Supabase.instance.client.auth.currentUser?.id);

  final Api api;
  final String tenancyId;
  final ImagePicker _picker;
  final Directory? _root;
  final CaptureQueue? _queue;
  final CaptureBackend? _backend;
  final String? Function() _currentOwner;
  final bool _supportsLostData;
  String? _owner;

  String get namespace => '$supportingDocumentQueuePrefix$tenancyId';

  String _requireOwner() {
    final current = _currentOwner();
    if (current == null || (_owner != null && _owner != current)) {
      throw const ApiFailure('Account changed. Open this page again.', 401);
    }
    return _owner ??= current;
  }

  /// Null means cancelled; false means saved safely and waiting for an upload retry.
  Future<bool?> add(String requestId, ImageSource source) async {
    final owner = _requireOwner();
    final root = _root ?? await getApplicationSupportDirectory();
    final queue = _queue ?? CaptureQueue();
    try {
      for (final name in [
        supportingDocumentPickerFilename,
        'capture-picker.json',
        'finding-picker.json',
      ]) {
        if (await File('${root.path}/$name').exists()) {
          throw const ApiFailure(
            'Reopen the previous photo selection to recover it before choosing another photo.',
            null,
          );
        }
      }
      final intent = <String, dynamic>{
        'ownerId': owner,
        'tenancyId': tenancyId,
        'requestId': requestId,
        'clientId': newCaptureId(),
      };
      await _writeIntent(root, intent);
      final photo = await _picker.pickImage(
        source: source,
        imageQuality: 90,
        requestFullMetadata: false,
      );
      if (photo == null) {
        await File('${root.path}/$supportingDocumentPickerFilename').delete();
        return null;
      }
      intent['path'] = photo.path;
      await _writeIntent(root, intent);
      await _storeIntent(root, queue, intent);
      // A sign-out while the picker was open must not send this photo as a new user.
      // It remains in the original account's queue, including across app restarts.
      _requireOwner();
      await Uploader(
        queue: queue,
        root: root,
        ownerId: owner,
        backend: _backend ?? RoutingEvidenceBackend(api.dio),
      ).drain();
      return await queue.byClientId(intent['clientId'] as String) == null;
    } finally {
      if (_queue == null) await queue.close();
    }
  }

  Future<void> _writeIntent(Directory root, Map<String, dynamic> intent) async {
    final file = File('${root.path}/$supportingDocumentPickerFilename');
    await file.parent.create(recursive: true);
    final temporary = File('${file.path}.tmp');
    await temporary.writeAsString(jsonEncode(intent), flush: true);
    await temporary.rename(file.path);
  }

  Future<void> _storeIntent(
    Directory root,
    CaptureQueue queue,
    Map<String, dynamic> intent,
  ) async {
    final clientId = intent['clientId'] as String;
    final owner = intent['ownerId'] as String;
    final namespace = '$supportingDocumentQueuePrefix${intent['tenancyId']}';
    final journal = File('${root.path}/$supportingDocumentPickerFilename');
    if (await queue.byClientId(clientId) != null ||
        await queue.serverIdForClient(owner, namespace, clientId) != null) {
      await journal.delete();
      return;
    }
    final source = File(intent['path'] as String);
    final mimeType =
        intent['mimeType'] as String? ?? await photoMimeType(source);
    if (mimeType == null || await source.length() > 10 * 1024 * 1024) {
      // A rejected format was never accepted into the queue; release the picker so
      // the tenant can choose a supported file. The original stays in the picker cache.
      await journal.delete();
      throw const ApiFailure(
        'Choose a JPEG, PNG or WebP photo smaller than 10 MB, or upload a PDF in your browser.',
        null,
      );
    }
    intent['mimeType'] = mimeType;
    await _writeIntent(root, intent);
    await CaptureStore(queue: queue, root: root).save(
      source: source,
      ownerId: owner,
      inspectionId: namespace,
      roomId: intent['requestId'] as String,
      kind: 'DOCUMENT',
      clientId: clientId,
      extension: switch (mimeType) {
        'image/png' => 'png',
        'image/webp' => 'webp',
        _ => 'jpg',
      },
      mimeType: mimeType,
    );
    await journal.delete();
  }

  /// Only this tenancy and the account that launched the picker may consume its
  /// Android lost result. Other capture screens leave the durable intent untouched.
  Future<void> recover() async {
    final owner = _requireOwner();
    final root = _root ?? await getApplicationSupportDirectory();
    final journal = File('${root.path}/$supportingDocumentPickerFilename');
    if (!await journal.exists()) return;
    final intent =
        jsonDecode(await journal.readAsString()) as Map<String, dynamic>;
    if (intent['ownerId'] != owner || intent['tenancyId'] != tenancyId) return;
    if (intent['path'] == null) {
      if (!_supportsLostData) {
        await journal.delete();
        return;
      }
      final lost = await _picker.retrieveLostData();
      if (lost.exception != null) throw lost.exception!;
      if (lost.files == null || lost.files!.isEmpty) {
        await journal.delete();
        return;
      }
      intent['path'] = lost.files!.single.path;
      await _writeIntent(root, intent);
    }
    _requireOwner();
    final queue = _queue ?? CaptureQueue();
    try {
      await CaptureStore(queue: queue, root: root).reconcile(owner);
      await _storeIntent(root, queue, intent);
    } finally {
      if (_queue == null) await queue.close();
    }
  }

  Future<Map<String, List<PendingCapture>>> pending(
    Iterable<String> requestIds,
  ) async {
    final owner = _requireOwner();
    final queue = _queue ?? CaptureQueue();
    try {
      return {
        for (final id in requestIds)
          id: (await queue.forRoom(
            id,
            owner,
          )).where((row) => row.inspectionId == namespace).toList(),
      };
    } finally {
      if (_queue == null) await queue.close();
    }
  }

  Future<void> retry() async {
    await recover();
    final owner = _requireOwner();
    final root = _root ?? await getApplicationSupportDirectory();
    final queue = _queue ?? CaptureQueue();
    try {
      await CaptureStore(queue: queue, root: root).reconcile(owner);
      _requireOwner();
      await Uploader(
        queue: queue,
        root: root,
        ownerId: owner,
        backend: _backend ?? RoutingEvidenceBackend(api.dio),
      ).drain();
    } finally {
      if (_queue == null) await queue.close();
    }
  }
}
