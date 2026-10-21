import 'dart:convert';
import 'dart:io';

import 'package:drift/drift.dart';

import 'capture_queue.dart';
import 'capture_store.dart';

/// Includes originals interrupted before SQLite insertion, without claiming another
/// account's or destination's picker result. Keys are finding/entry/room IDs.
Future<Map<String, int>> pendingEvidencePhotos({
  required CaptureQueue queue,
  required Directory root,
  required String ownerId,
  required String queueOwner,
}) async {
  await CaptureStore(queue: queue, root: root).reconcile(ownerId);
  final rows =
      await (queue.select(queue.pendingCaptures)..where(
            (row) =>
                row.ownerId.equals(ownerId) &
                row.inspectionId.equals(queueOwner),
          ))
          .get();
  final counts = <String, int>{};
  final clients = <String, String>{};
  for (final row in rows) {
    counts.update(row.roomId, (count) => count + 1, ifAbsent: () => 1);
    if (row.clientId != null) clients[row.clientId!] = row.roomId;
  }

  String? target(Map<String, dynamic> journal) {
    final owner = journal['ownerId'];
    if (owner is! String || owner.isEmpty) {
      throw const FormatException('Saved photo journal has no owner.');
    }
    if (owner != ownerId) return null;
    final destination = journal['inspectionId'];
    if (destination is! String || destination.isEmpty) {
      throw const FormatException('Saved photo journal has no destination.');
    }
    if (destination != queueOwner) return null;
    final room = journal['roomId'];
    if (room is! String || room.isEmpty) {
      throw const FormatException('Saved photo journal has no target.');
    }
    return room;
  }

  Future<void> countClient(Object? value, String room) async {
    if (value is! String || value.isEmpty) {
      throw const FormatException(
        'Saved photo journal has no client identity.',
      );
    }
    final previous = clients[value];
    if (previous != null) {
      if (previous != room) {
        throw StateError('Saved photo journal conflicts with another target.');
      }
      return;
    }
    if (await queue.serverIdForClient(ownerId, queueOwner, value) != null) {
      return;
    }
    clients[value] = room;
    counts.update(room, (count) => count + 1, ifAbsent: () => 1);
  }

  final intake = Directory('${root.path}/capture-intake');
  if (await intake.exists()) {
    await for (final entity in intake.list()) {
      if (entity is! File || !entity.path.endsWith('.json')) continue;
      final journal = await _readJournal(entity);
      if (journal == null) continue;
      final room = target(journal);
      if (room != null) await countClient(journal['clientId'], room);
    }
  }
  final picker = await _readJournal(File('${root.path}/capture-picker.json'));
  if (picker != null) {
    final room = target(picker);
    if (room != null) {
      if (!picker.containsKey('files')) {
        // The system picker has not handed its result back yet. Its original screen
        // must recover or cancel that selection before the destination is frozen.
        counts.update(room, (count) => count + 1, ifAbsent: () => 1);
      } else {
        final files = picker['files'];
        if (files is! List) {
          throw const FormatException('Saved photo selection is unreadable.');
        }
        for (final file in files) {
          if (file is! Map<String, dynamic>) {
            throw const FormatException('Saved photo selection is unreadable.');
          }
          await countClient(file['clientId'], room);
        }
      }
    }
  }
  return counts;
}

Future<Map<String, dynamic>?> _readJournal(File file) async {
  final String contents;
  try {
    contents = await file.readAsString();
  } on FileSystemException catch (error) {
    // Recovery/upload may have finished between listing and reading the journal.
    if (error.osError?.errorCode == 2 && !await file.exists()) return null;
    rethrow;
  }
  final decoded = jsonDecode(contents);
  if (decoded is! Map<String, dynamic>) {
    throw const FormatException('Saved photo journal is unreadable.');
  }
  return decoded;
}
