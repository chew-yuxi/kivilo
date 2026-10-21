import 'dart:io';

import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'capture_backend.dart';
import 'capture_queue.dart';
import 'pending_evidence.dart';

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

/// Counts durable photos that have not reached a draft update yet, including
/// photos still awaiting marks or a caption in EvidencePhotoScreen.
class AddendumPhotos {
  static String queueOwner(String addendumId) =>
      '$addendumQueueOwnerPrefix$addendumId';

  /// Photos taken for each change that have not reached the draft yet, by entry id.
  Future<Map<String, int>> pending(
    String addendumId,
    Iterable<String> entryIds,
  ) async {
    final ownerId = Supabase.instance.client.auth.currentUser?.id;
    if (ownerId == null) return const {};
    final queue = CaptureQueue();
    try {
      final pending = await pendingEvidencePhotos(
        queue: queue,
        root: await getApplicationSupportDirectory(),
        ownerId: ownerId,
        queueOwner: queueOwner(addendumId),
      );
      return {
        for (final entryId in entryIds)
          entryId: pending[entryId] ?? 0,
      };
    } finally {
      await queue.close();
    }
  }
}
