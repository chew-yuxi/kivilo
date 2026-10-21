import 'dart:io';

import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/services/capture_queue.dart';

void main() {
  late Directory directory;
  late CaptureQueue first;
  late CaptureQueue second;

  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);
  tearDownAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = false);

  setUp(() async {
    directory = await Directory.systemTemp.createTemp('kivilo-concurrent-');
    final file = File('${directory.path}/queue.sqlite');
    first = CaptureQueue(NativeDatabase.createInBackground(file));
    // Finish schema initialization before opening an independent connection.
    await first.customSelect('SELECT 1').get();
    second = CaptureQueue(NativeDatabase.createInBackground(file));
    await second.customSelect('SELECT 1').get();
  });

  tearDown(() async {
    await first.close();
    await second.close();
    await directory.delete(recursive: true);
  });

  Future<int> enqueue() => first.enqueue(
    PendingCapturesCompanion.insert(
      ownerId: const Value('owner-a'),
      clientId: const Value('capture-a'),
      inspectionId: 'inspection-a',
      roomId: 'room-a',
      kind: 'PHOTO',
      relativePath: 'captures/owner-a/capture-a.jpg',
      filename: 'capture-a.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 128,
      createdAt: DateTime.utc(2026, 10, 11),
    ),
  );

  test('independent SQLite workers claim a capture only once', () async {
    await enqueue();
    final now = DateTime.utc(2026, 10, 11, 12);
    final claims = await Future.wait([
      first.claimNext(now, ownerId: 'owner-a'),
      second.claimNext(now, ownerId: 'owner-a'),
    ]);
    expect(claims.whereType<PendingCapture>(), hasLength(1));
    final claimed = claims.whereType<PendingCapture>().single;
    expect((await first.byId(claimed.id))!.leaseId, claimed.leaseId);
    expect((await second.byId(claimed.id))!.leaseId, claimed.leaseId);
  });

  test('version 6 upgrade preserves existing queued evidence', () async {
    final id = await enqueue();
    await first.setNote(id, 'Existing room evidence');
    await first.setAnnotations(id, '{"w":640,"h":480,"marks":[]}');
    // Remove only the additive version 7 columns to recreate the shipped schema.
    for (final column in [
      'item_id',
      'awaiting_markup',
      'registration_item_applied',
    ]) {
      await first.customStatement(
        'ALTER TABLE pending_captures DROP COLUMN $column',
      );
    }
    await first.customStatement('PRAGMA user_version = 6');
    await first.close();
    first = CaptureQueue(
      NativeDatabase.createInBackground(File('${directory.path}/queue.sqlite')),
    );

    final migrated = (await first.byId(id))!;
    expect(migrated.clientId, 'capture-a');
    expect(migrated.note, 'Existing room evidence');
    expect(migrated.annotations, '{"w":640,"h":480,"marks":[]}');
    expect(migrated.itemId, isNull);
    expect(migrated.awaitingMarkup, isFalse);
    expect(migrated.registrationItemApplied, isTrue);
    expect(
      await first.claimNext(DateTime.now(), ownerId: 'owner-a'),
      isNotNull,
    );
  });

  test('unfinished item marks stay held across workers and restarts', () async {
    final id = await first.enqueue(
      PendingCapturesCompanion.insert(
        ownerId: const Value('owner-a'),
        clientId: const Value('item-capture'),
        inspectionId: 'inspection-a',
        roomId: 'room-a',
        itemId: const Value('item-a'),
        awaitingMarkup: const Value(true),
        kind: 'PHOTO',
        relativePath: 'captures/owner-a/item-capture.jpg',
        filename: 'item-capture.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 128,
        createdAt: DateTime.utc(2026, 10, 21),
      ),
    );
    const marks = '{"w":640,"h":480,"marks":[]}';
    await first.setAnnotations(id, marks);
    expect(await second.claimNext(DateTime.now(), ownerId: 'owner-a'), isNull);

    await first.close();
    first = CaptureQueue(
      NativeDatabase.createInBackground(File('${directory.path}/queue.sqlite')),
    );
    expect(await first.claimNext(DateTime.now(), ownerId: 'owner-a'), isNull);
    final draft = (await first.byId(id))!;
    expect(draft.itemId, 'item-a');
    expect(draft.annotations, marks);
    expect(draft.awaitingMarkup, isTrue);

    await first.finishMarkup(id);
    final ready = (await second.claimNext(DateTime.now(), ownerId: 'owner-a'))!;
    expect(ready.itemId, 'item-a');
    expect(ready.annotations, marks);
  });

  test(
    'renewal and stale-worker fencing hold across SQLite connections',
    () async {
      final id = await enqueue();
      final now = DateTime.utc(2026, 10, 11, 12);
      final original = (await first.claimNext(now, ownerId: 'owner-a'))!;
      await first.renewLease(
        id,
        original.leaseId!,
        now.add(const Duration(minutes: 9)),
      );
      expect(
        await second.claimNext(
          now.add(const Duration(minutes: 11)),
          ownerId: 'owner-a',
        ),
        isNull,
        reason: 'a long transfer with a heartbeat still owns its capture',
      );
      final recovered = (await second.claimNext(
        now.add(const Duration(minutes: 20)),
        ownerId: 'owner-a',
      ))!;
      expect(recovered.leaseId, isNot(original.leaseId));
      await first.renewLease(
        id,
        original.leaseId!,
        now.add(const Duration(minutes: 21)),
      );
      await first.recordFailure(id, 'stale worker', leaseId: original.leaseId);
      expect(
        await first.finishIfUnchanged(original, original.leaseId!),
        isNull,
      );
      final row = (await second.byId(id))!;
      expect(row.leaseId, recovered.leaseId);
      expect(row.claimedAt!.isAtSameMomentAs(recovered.claimedAt!), isTrue);
      expect(row.attempts, 0);
      await expectLater(
        first.markUploaded(id, 'stale-server-id', leaseId: original.leaseId),
        throwsStateError,
      );
      expect(
        await first.serverIdForClient('owner-a', 'inspection-a', 'capture-a'),
        isNull,
      );
    },
  );

  test('an edit made while another worker sends cannot be discarded', () async {
    await first.queueRemoteNote(
      'owner-a',
      'inspection-a',
      'server-capture',
      'First note',
    );
    final now = DateTime.utc(2026, 10, 11, 12);
    final claims = await Future.wait([
      first.claimNextRemoteEdit(now, 'owner-a'),
      second.claimNextRemoteEdit(now, 'owner-a'),
    ]);
    final sent = claims.whereType<PendingRemoteEdit>().single;
    await second.queueRemoteNote(
      'owner-a',
      'inspection-a',
      'server-capture',
      'Revised while sending',
    );
    expect(await first.finishRemoteEdit(sent), isFalse);
    final updated = (await first.remoteEdit('server-capture'))!;
    expect(updated.note, 'Revised while sending');
    expect(updated.leaseId, sent.leaseId);
    expect(await first.finishRemoteEdit(updated), isTrue);
    expect(await second.remoteEdit('server-capture'), isNull);
  });
}
