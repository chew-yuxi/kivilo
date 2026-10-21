import 'dart:convert';
import 'dart:io';

import 'package:drift/drift.dart';
import 'package:image_picker/image_picker.dart';

import 'addendum_photos.dart';
import 'api_failure.dart';
import 'capture_queue.dart';
import 'capture_store.dart';

/// One global picker journal pins the destination before leaving Flutter. A result
/// from another screen/account is never consumed or assigned to the current target.
class EvidencePhotoIntake {
  EvidencePhotoIntake({
    required this.queue,
    required this.root,
    required this.picker,
    required this.ownerId,
    required this.queueOwner,
    required this.targetId,
    required this.kind,
    bool? recoverAndroid,
  }) : recoverAndroid = recoverAndroid ?? Platform.isAndroid;

  final CaptureQueue queue;
  final Directory root;
  final ImagePicker picker;
  final String ownerId;
  final String queueOwner;
  final String targetId;
  final String kind;
  final bool recoverAndroid;

  File get journal => File('${root.path}/capture-picker.json');

  bool _owns(Map<String, dynamic> intent) =>
      intent['flow'] == 'evidence' &&
      intent['ownerId'] == ownerId &&
      intent['inspectionId'] == queueOwner &&
      intent['roomId'] == targetId;

  Future<void> _write(Map<String, dynamic> intent) async {
    await root.create(recursive: true);
    final temporary = File('${journal.path}.tmp');
    await temporary.writeAsString(jsonEncode(intent), flush: true);
    await temporary.rename(journal.path);
  }

  Future<List<int>> pick(ImageSource source) async {
    if (await journal.exists()) {
      throw const ApiFailure(
        'An interrupted photo selection needs recovery. Reopen its original photo screen first.',
        null,
      );
    }
    final intent = <String, dynamic>{
      'flow': 'evidence',
      'ownerId': ownerId,
      'inspectionId': queueOwner,
      'roomId': targetId,
      'kind': kind,
      'video': false,
    };
    await _write(intent);
    final List<XFile> selected;
    if (source == ImageSource.gallery) {
      selected = await picker.pickMultiImage(
        imageQuality: 95,
        requestFullMetadata: false,
      );
    } else {
      final photo = await picker.pickImage(
        source: source,
        imageQuality: 95,
        requestFullMetadata: false,
      );
      selected = photo == null ? [] : [photo];
    }
    return _saveSelection(intent, selected);
  }

  Future<List<int>> recover() async {
    if (!await journal.exists()) return [];
    final intent =
        jsonDecode(await journal.readAsString()) as Map<String, dynamic>;
    if (!_owns(intent)) return [];
    if (intent['files'] != null) return _persist(intent);
    if (!recoverAndroid) {
      await journal.delete();
      return [];
    }
    final response = await picker.retrieveLostData();
    if (response.exception != null) {
      throw StateError('Could not recover the photo: ${response.exception}');
    }
    return _saveSelection(intent, response.files ?? const []);
  }

  Future<List<int>> _saveSelection(
    Map<String, dynamic> intent,
    List<XFile> files,
  ) async {
    intent['files'] = [
      for (final file in files) {'path': file.path, 'clientId': newCaptureId()},
    ];
    await _write(intent);
    return _persist(intent);
  }

  Future<List<int>> _persist(Map<String, dynamic> intent) async {
    if (!_owns(intent)) {
      throw StateError('Photo selection belongs to another target');
    }
    final ids = <int>[];
    // Persist the entire batch before its first editor can be opened or interrupted.
    for (final entry
        in (intent['files'] as List).cast<Map<String, dynamic>>()) {
      final clientId = entry['clientId'] as String;
      if (await queue.serverIdForClient(ownerId, queueOwner, clientId) !=
          null) {
        continue;
      }
      final existing = await queue.byClientId(clientId);
      if (existing != null) {
        if (existing.ownerId != ownerId ||
            existing.inspectionId != queueOwner ||
            existing.roomId != targetId) {
          throw StateError('Photo selection conflicts with another capture');
        }
        ids.add(existing.id);
        continue;
      }
      // Preserve bytes before validating a disposable picker file. Unknown formats
      // remain held locally, and must not block another photo being taken.
      ids.add(
        await CaptureStore(queue: queue, root: root).save(
          source: File(entry['path'] as String),
          ownerId: ownerId,
          inspectionId: queueOwner,
          roomId: targetId,
          kind: intent['kind'] as String,
          extension: 'original',
          mimeType: 'application/octet-stream',
          clientId: clientId,
          awaitingMarkup: true,
        ),
      );
    }
    await journal.delete();
    for (final id in ids) {
      await preparePhoto(id);
    }
    return ids;
  }

  /// Determine the storage type from the durable original. A failed read or unknown
  /// format stays visible in the queue and can be retried without losing any bytes.
  Future<void> preparePhoto(int id) async {
    final row = await queue.byId(id);
    if (row == null || !row.awaitingMarkup) return;
    if (row.ownerId != ownerId ||
        row.inspectionId != queueOwner ||
        row.roomId != targetId) {
      throw StateError('Photo belongs to another destination');
    }
    try {
      final mime = await photoMimeType(
        File('${root.path}/${row.relativePath}'),
      );
      if (mime == null) {
        throw const ApiFailure(
          'This original is saved on your phone, but its format cannot be uploaded. Contact support to recover it. Supported formats are JPEG, PNG and WebP.',
          null,
        );
      }
      final extension = switch (mime) {
        'image/png' => 'png',
        'image/webp' => 'webp',
        _ => 'jpg',
      };
      await (queue.update(
        queue.pendingCaptures,
      )..where((capture) => capture.id.equals(id))).write(
        PendingCapturesCompanion(
          mimeType: Value(mime),
          filename: Value('${row.clientId}.$extension'),
          lastError: const Value(null),
        ),
      );
    } catch (error) {
      await (queue.update(queue.pendingCaptures)
            ..where((capture) => capture.id.equals(id)))
          .write(PendingCapturesCompanion(lastError: Value(plainError(error))));
    }
  }
}
