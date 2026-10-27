import 'dart:io';

import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'api.dart';
import 'capture_backend.dart';
import 'capture_queue.dart';
import 'capture_store.dart';
import 'uploader.dart';

/// The storage type of a photo from its first bytes, or null for anything storage will
/// not take. The file name cannot be trusted: Android's picker keeps a HEIC's name on
/// the JPEG it re-encodes it to.
Future<String?> photoMimeType(File file) async {
  final handle = await file.open();
  final List<int> head;
  try {
    head = await handle.read(12);
  } finally {
    await handle.close();
  }
  bool starts(List<int> bytes, [int offset = 0]) =>
      head.length >= offset + bytes.length &&
      Iterable<int>.generate(
        bytes.length,
      ).every((i) => head[offset + i] == bytes[i]);
  if (starts([0xFF, 0xD8, 0xFF])) return 'image/jpeg';
  if (starts([0x89, 0x50, 0x4E, 0x47])) return 'image/png';
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) {
    return 'image/webp';
  }
  return null;
}

/// Photos for one change on a draft update to a signed report. A photo goes through the
/// same durable queue as a room capture: copied into app storage before anything else,
/// then carried straight to storage on a signed URL and registered, and retried (here,
/// and whenever the app resumes) until the server confirms it. A capture is never lost.
class AddendumPhotos {
  AddendumPhotos({Api? api}) : _api = api ?? Api();

  final Api _api;
  final _picker = ImagePicker();

  static String queueOwner(String addendumId) =>
      '$addendumQueueOwnerPrefix$addendumId';

  /// Takes or picks one photo for [entryId]. Null if the person cancelled; true once it
  /// has reached the draft, false if it is saved on the phone and still to upload.
  Future<bool?> add({
    required String addendumId,
    required String entryId,
    required ImageSource source,
  }) async {
    final root = await getApplicationSupportDirectory();
    if (await File('${root.path}/$supportingDocumentPickerFilename').exists()) {
      throw const ApiFailure(
        'Reopen Supporting documents to recover the previous photo before taking another.',
        null,
      );
    }
    // A quality below 100 makes both platforms re-encode: iOS writes a HEIC out as JPEG
    // and Android decodes and compresses it to JPEG (or PNG, with transparency).
    final photo = await _picker.pickImage(
      source: source,
      maxWidth: evidencePhotoEdge,
      maxHeight: evidencePhotoEdge,
      imageQuality: evidencePhotoQuality,
      requestFullMetadata: false,
    );
    if (photo == null) return null;
    final file = File(photo.path);
    final mimeType = await photoMimeType(file);
    if (mimeType == null) {
      throw const ApiFailure(
        'This photo is in a format Kivilo cannot store. Take it again, or choose a JPEG or PNG.',
        null,
      );
    }
    final ownerId = Supabase.instance.client.auth.currentUser!.id;
    final queue = CaptureQueue();
    try {
      await CaptureStore(queue: queue, root: root).save(
        source: file,
        ownerId: ownerId,
        inspectionId: queueOwner(addendumId),
        roomId: entryId,
        kind: 'PHOTO',
        extension: switch (mimeType) {
          'image/png' => 'png',
          'image/webp' => 'webp',
          _ => 'jpg',
        },
        mimeType: mimeType,
      );
      return await Uploader(
        queue: queue,
        backend: RoutingEvidenceBackend(_api.dio),
        root: root,
        ownerId: ownerId,
      ).drain();
    } finally {
      await queue.close();
    }
  }

  /// Photos taken for each change that have not reached the draft yet, by entry id.
  Future<Map<String, int>> pending(
    String addendumId,
    Iterable<String> entryIds,
  ) async {
    final ownerId = Supabase.instance.client.auth.currentUser?.id;
    if (ownerId == null) return const {};
    final queue = CaptureQueue();
    try {
      return {
        for (final entryId in entryIds)
          entryId: (await queue.forRoom(entryId, ownerId))
              .where(
                (capture) => capture.inspectionId == queueOwner(addendumId),
              )
              .length,
      };
    } finally {
      await queue.close();
    }
  }
}
