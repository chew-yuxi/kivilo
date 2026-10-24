// drift exports isNull/isNotNull as SQL helpers, which collide with the matchers.
import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/services/capture_queue.dart';

/// The queue is where "a capture is never lost" actually lives, so these are the tests
/// that matter most in this app. They pin the same rules the web client follows in
/// src/lib/offline-queue.ts and src/components/upload-queue.tsx, because both write the
/// same rows to the same server.
void main() {
  late CaptureQueue queue;

  setUp(() => queue = CaptureQueue(NativeDatabase.memory()));
  tearDown(() => queue.close());

  Future<int> add({
    String room = 'room-1',
    String kind = 'PHOTO',
    int attempts = 0,
    DateTime? createdAt,
    String? note,
    String? owner,
    String inspection = 'insp-1',
    bool awaitingMarkup = false,
  }) {
    return queue.enqueue(
      PendingCapturesCompanion.insert(
        roomId: room,
        inspectionId: inspection,
        ownerId: Value(owner),
        kind: kind,
        relativePath:
            'captures/$kind-${createdAt?.millisecondsSinceEpoch ?? attempts}.jpg',
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
        createdAt: createdAt ?? DateTime(2026, 8, 28),
        note: Value(note),
        attempts: Value(attempts),
        awaitingMarkup: Value(awaitingMarkup),
      ),
    );
  }

  test(
    'a capture is on the phone the moment it is taken, before any network',
    () async {
      final id = await add();
      final row = await queue.byId(id);
      expect(row, isNotNull);
      expect(row!.uploadedId, isNull, reason: 'nothing has been sent yet');
      expect(await queue.watch('room-1').first, hasLength(1));
    },
  );

  test('a repeatedly failing capture goes to the back of the line', () async {
    final struggling = await add(
      attempts: 4,
      createdAt: DateTime(2026, 8, 28, 9),
    );
    final fresh = await add(attempts: 0, createdAt: DateTime(2026, 8, 28, 10));

    final first = await queue.claimNext(DateTime(2026, 8, 28, 11));
    expect(
      first!.id,
      fresh,
      reason: 'the newly taken photo must not wait behind a failure',
    );

    final second = await queue.claimNext(DateTime(2026, 8, 28, 11));
    expect(second!.id, struggling);
  });

  /// The one rule with no exception. The web client used to stop retrying after five
  /// attempts, which meant about a hundred seconds of bad signal could strand a
  /// walkthrough forever; that was removed there and must never appear here.
  test(
    'nothing is ever given up on, however many times it has failed',
    () async {
      final id = await add();
      for (var i = 0; i < 50; i++) {
        await queue.claimNext(DateTime(2026, 8, 28, 12));
        await queue.recordFailure(id, 'connection closed');
      }

      final row = await queue.byId(id);
      expect(row, isNotNull, reason: 'still queued after 50 failures');
      expect(row!.attempts, 50);
      expect(row.lastError, 'connection closed');
      expect(await queue.claimNext(DateTime(2026, 8, 28, 13)), isNotNull);
    },
  );

  test('two uploaders cannot pick up the same capture', () async {
    await add();
    final now = DateTime(2026, 8, 28, 12);

    // A background transfer runs in its own isolate with its own handle, so the guard
    // has to be in the database rather than in memory.
    final mine = await queue.claimNext(now);
    final theirs = await queue.claimNext(now);

    expect(mine, isNotNull);
    expect(theirs, isNull);
  });

  test(
    'a capture abandoned by a killed uploader is picked up again later',
    () async {
      await add();
      final claimed = await queue.claimNext(DateTime(2026, 8, 28, 12));
      expect(claimed, isNotNull);

      expect(
        await queue.claimNext(DateTime(2026, 8, 28, 12, 5)),
        isNull,
        reason: 'still inside the lease',
      );
      expect(
        await queue.claimNext(DateTime(2026, 8, 28, 12, 11)),
        isNotNull,
        reason: 'the lease expired, so the work is available again',
      );
    },
  );

  /// The expensive mistake: the bytes reach storage, the response is lost, and the next
  /// pass uploads them again, leaving two captures of one moment in the report and
  /// feeding both to the model.
  test(
    'a registered capture keeps its lease until the hand-over completes',
    () async {
      final id = await add();
      await queue.claimNext(DateTime(2026, 8, 28, 12));
      await queue.markUploaded(id, 'cap_server_1');

      final row = await queue.byId(id);
      expect(row!.uploadedId, 'cap_server_1');
      expect(
        row.claimedAt,
        isNotNull,
        reason: 'another worker cannot race the final note and marks hand-over',
      );

      final again = await queue.claimNext(DateTime(2026, 8, 28, 12, 1));
      expect(again, isNull);
      expect(await queue.finishIfUnchanged(row, row.leaseId!), isNotNull);
      expect(await queue.byId(id), isNull);
    },
  );

  /// A note typed while the bytes were in flight has to reach the server row. Reading it
  /// separately from the delete is what loses it, so take() does both at once.
  test(
    'take reports the record as it was at the moment it was removed',
    () async {
      final id = await add(note: 'Fridge rating plate');
      await queue.setNote(id, 'Chip on the worktop, right of the sink');

      final taken = await queue.take(id);
      expect(taken!.note, 'Chip on the worktop, right of the sink');
      expect(await queue.byId(id), isNull);

      expect(
        await queue.take(id),
        isNull,
        reason:
            'a second take reports that it had already gone, which is how the '
            'uploader learns the inspector deleted it mid-flight',
      );
    },
  );

  test(
    'marks drawn before the photo left the phone survive in the queue',
    () async {
      final id = await add();
      const marks =
          '{"w":1536,"h":2048,"marks":[{"shape":"ring","cx":0.68,"cy":0.34,'
          '"rx":0.09,"ry":0.07}]}';
      await queue.setAnnotations(id, marks);

      expect((await queue.byId(id))!.annotations, marks);
      expect((await queue.take(id))!.annotations, marks);
    },
  );

  test(
    'multi-shot completion releases only the chosen durable drafts',
    () async {
      final first = await add(awaitingMarkup: true);
      final second = await add(awaitingMarkup: true);
      final other = await add(room: 'bedroom', awaitingMarkup: true);

      expect(await queue.claimNext(DateTime(2026, 8, 28, 12)), isNull);
      await queue.finishMarkupMany([first, second]);

      expect((await queue.byId(first))!.awaitingMarkup, isFalse);
      expect((await queue.byId(second))!.awaitingMarkup, isFalse);
      expect((await queue.byId(other))!.awaitingMarkup, isTrue);
      expect(await queue.claimNext(DateTime(2026, 8, 28, 12)), isNotNull);
    },
  );

  test('discarding a multi-shot session makes every draft deletable', () async {
    final first = await add(awaitingMarkup: true);
    final second = await add(awaitingMarkup: true);

    await queue.requestDeleteMany([first, second]);

    for (final id in [first, second]) {
      final capture = (await queue.byId(id))!;
      expect(capture.awaitingMarkup, isFalse);
      expect(capture.deleteRequested, isTrue);
    }
  });

  test('a room only ever sees its own captures', () async {
    await add(room: 'kitchen');
    await add(room: 'kitchen');
    await add(room: 'bedroom');

    expect(await queue.watch('kitchen').first, hasLength(2));
    expect(await queue.watch('bedroom').first, hasLength(1));
  });

  test('signature guard counts only this account and inspection', () async {
    await add(owner: 'owner-a', inspection: 'inspection-a');
    await add(owner: 'owner-b', inspection: 'inspection-a');
    await add(owner: 'owner-a', inspection: 'inspection-b');
    await queue.queueRemoteNote(
      'owner-a',
      'inspection-a',
      'server-photo',
      'Waiting to sync',
    );

    expect(await queue.pendingForInspection('inspection-a', 'owner-a'), (
      captures: 1,
      edits: 1,
    ));
    expect(await queue.pendingForInspection('inspection-a', 'owner-b'), (
      captures: 1,
      edits: 0,
    ));
    expect(await queue.pendingForInspection('inspection-b', 'owner-a'), (
      captures: 1,
      edits: 0,
    ));
  });

  test('room deletion guard isolates queued captures and edits', () async {
    await add(room: 'kitchen', owner: 'owner-a');
    await add(room: 'bedroom', owner: 'owner-a');
    await add(room: 'kitchen', owner: 'owner-b');
    await queue.queueRemoteNote(
      'owner-a',
      'insp-1',
      'kitchen-photo',
      'Waiting to sync',
    );
    await queue.queueRemoteNote(
      'owner-a',
      'insp-1',
      'bedroom-photo',
      'Waiting to sync',
    );

    expect(
      await queue.pendingForRoom('insp-1', 'kitchen', 'owner-a', [
        'kitchen-photo',
      ]),
      (captures: 1, edits: 1),
    );
    expect(await queue.pendingForRoom('insp-1', 'kitchen', 'owner-b', []), (
      captures: 1,
      edits: 0,
    ));
    expect(await queue.pendingForRoom('insp-1', 'living', 'owner-a', []), (
      captures: 0,
      edits: 0,
    ));
  });

  test(
    'room deletion guard includes edits to a capture still handing over',
    () async {
      final id = await add(room: 'kitchen', owner: 'owner-a');
      await queue.markUploaded(id, 'new-kitchen-photo');
      await queue.queueRemoteAnnotations(
        'owner-a',
        'insp-1',
        'new-kitchen-photo',
        '{"w":1,"h":1,"marks":[]}',
      );

      expect(await queue.pendingForRoom('insp-1', 'kitchen', 'owner-a', []), (
        captures: 1,
        edits: 1,
      ));
    },
  );
}
