import 'dart:convert';
import 'dart:io';

import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/services/capture_queue.dart';
import 'package:kivilo/services/capture_store.dart';

void main() {
  late CaptureQueue queue;
  late Directory root;

  setUp(() {
    queue = CaptureQueue(NativeDatabase.memory());
    root = Directory.systemTemp.createTempSync('kivilo-store');
  });

  tearDown(() async {
    await queue.close();
    if (root.existsSync()) root.deleteSync(recursive: true);
  });

  test(
    'save acknowledges only after app-support bytes and queue row exist',
    () async {
      final original = List.filled(128, 13);
      final source = File('${root.path}/camera-temp.jpg')
        ..writeAsBytesSync(original);
      final store = CaptureStore(queue: queue, root: root);

      final id = await store.save(
        source: source,
        ownerId: 'owner-a',
        inspectionId: 'inspection-a',
        roomId: 'room-a',
        kind: 'PHOTO',
        extension: 'jpg',
        mimeType: 'image/jpeg',
      );

      final row = (await queue.byId(id))!;
      expect(row.clientId, isNotNull);
      expect(row.ownerId, 'owner-a');
      expect(row.sizeBytes, 128);
      expect(
        File('${root.path}/${row.relativePath}').readAsBytesSync(),
        original,
      );
      expect(
        source.existsSync(),
        isFalse,
        reason: 'a large camera file should move without a second full copy',
      );
      expect(Directory('${root.path}/capture-intake').listSync(), isEmpty);
    },
  );

  test(
    'save waits for a native camera video hand-off to become readable',
    () async {
      final source = File('${root.path}/camera-delayed.mp4');
      final store = CaptureStore(queue: queue, root: root);
      final saving = store.save(
        source: source,
        ownerId: 'owner-a',
        inspectionId: 'inspection-a',
        roomId: 'room-a',
        kind: 'VIDEO',
        extension: 'mp4',
        mimeType: 'video/mp4',
        clientId: 'delayed-video',
      );

      await Future<void>.delayed(const Duration(milliseconds: 250));
      await source.writeAsBytes(List.filled(96, 4), flush: true);

      final row = (await queue.byId(await saving))!;
      expect(row.sizeBytes, 96);
      expect(File('${root.path}/${row.relativePath}').lengthSync(), 96);
    },
  );

  test('item photo and unfinished marking survive intake recovery', () async {
    await queue.close();
    queue = _FailOnceCaptureQueue();
    final store = CaptureStore(queue: queue, root: root);
    final source = File('${root.path}/camera-item.jpg')
      ..writeAsBytesSync(List.filled(64, 5));

    await expectLater(
      store.save(
        source: source,
        ownerId: 'owner-a',
        inspectionId: 'inspection-a',
        roomId: 'room-a',
        itemId: 'item-a',
        awaitingMarkup: true,
        kind: 'PHOTO',
        extension: 'jpg',
        mimeType: 'image/jpeg',
        clientId: 'item-photo',
      ),
      throwsStateError,
    );

    expect(await store.reconcile('owner-a'), isEmpty);
    final recovered = (await queue.byClientId('item-photo'))!;
    expect(recovered.itemId, 'item-a');
    expect(recovered.awaitingMarkup, isTrue);
    expect(await queue.claimNext(DateTime.now(), ownerId: 'owner-a'), isNull);

    const marks = '{"w":640,"h":480,"marks":[]}';
    await queue.setAnnotations(recovered.id, marks);
    await queue.setNote(recovered.id, 'Chip on the front');
    await queue.finishMarkup(recovered.id);
    final ready = (await queue.claimNext(DateTime.now(), ownerId: 'owner-a'))!;
    expect(ready.itemId, 'item-a');
    expect(ready.annotations, marks);
    expect(ready.note, 'Chip on the front');
    expect(ready.awaitingMarkup, isFalse);
    expect(File('${root.path}/${ready.relativePath}').lengthSync(), 64);
  });

  test(
    'a crash after file rename but before SQLite insert recovers on restart',
    () async {
      const clientId = 'old-camera-capture';
      const relative = 'captures/owner-a/old-camera-capture.jpg';
      final file = File('${root.path}/$relative')
        ..parent.createSync(recursive: true);
      file.writeAsBytesSync(List.filled(42, 7));
      final journal = File('${root.path}/capture-intake/$clientId.json')
        ..parent.createSync(recursive: true);
      journal.writeAsStringSync(
        jsonEncode({
          'clientId': clientId,
          'ownerId': 'owner-a',
          'inspectionId': 'inspection-a',
          'roomId': 'room-a',
          'kind': 'PHOTO',
          'relativePath': relative,
          'sourcePath': '${root.path}/gone.jpg',
          'filename': '$clientId.jpg',
          'mimeType': 'image/jpeg',
          'durationSec': null,
          'createdAt': '2026-10-10T00:00:00Z',
        }),
      );

      final unresolved = await CaptureStore(
        queue: queue,
        root: root,
      ).reconcile('owner-a');

      expect(unresolved, isEmpty);
      expect((await queue.byClientId(clientId))!.sizeBytes, 42);
      expect(journal.existsSync(), isFalse);
    },
  );

  test(
    'retry keeps the same video after a queue failure following rename',
    () async {
      await queue.close();
      queue = _FailOnceCaptureQueue();
      final store = CaptureStore(queue: queue, root: root);
      const clientId = 'd6fbfbdf-ef43-4d66-965a-793d8147d624';
      final source = File('${root.path}/camera-temp.mp4')
        ..writeAsBytesSync(List.filled(64, 5));

      Future<int> save() => store.save(
        source: source,
        ownerId: 'owner-a',
        inspectionId: 'inspection-a',
        roomId: 'room-a',
        kind: 'VIDEO',
        extension: 'mp4',
        mimeType: 'video/mp4',
        durationSec: 12,
        clientId: clientId,
      );

      await expectLater(save(), throwsStateError);
      expect(source.existsSync(), isFalse);
      expect(
        File('${root.path}/captures/owner-a/$clientId.mp4').existsSync(),
        isTrue,
      );
      expect(await queue.byClientId(clientId), isNull);

      final id = await save();
      final row = (await queue.byId(id))!;
      expect(row.clientId, clientId);
      expect(row.sizeBytes, 64);
      expect(await queue.forRoom('room-a', 'owner-a'), hasLength(1));
      expect(Directory('${root.path}/capture-intake').listSync(), isEmpty);
    },
  );

  test('journals from another account are not imported', () async {
    const clientId = 'other-account';
    final journal = File('${root.path}/capture-intake/$clientId.json')
      ..parent.createSync(recursive: true);
    journal.writeAsStringSync(
      jsonEncode({
        'clientId': clientId,
        'ownerId': 'owner-a',
        'relativePath': 'captures/owner-a/a.jpg',
        'sourcePath': '${root.path}/missing.jpg',
      }),
    );

    expect(
      await CaptureStore(queue: queue, root: root).reconcile('owner-b'),
      isEmpty,
    );
    expect(journal.existsSync(), isTrue);
    expect(await queue.byClientId(clientId), isNull);
  });

  test(
    'an interrupted save in another room does not hold up this room',
    () async {
      final journal = File('${root.path}/capture-intake/bedroom-photo.json')
        ..parent.createSync(recursive: true);
      journal.writeAsStringSync(
        jsonEncode({
          'clientId': 'bedroom-photo',
          'ownerId': 'owner-a',
          'inspectionId': 'inspection-a',
          'roomId': 'bedroom',
          'relativePath': 'captures/owner-a/bedroom-photo.jpg',
          'sourcePath': '${root.path}/missing.jpg',
        }),
      );
      final store = CaptureStore(queue: queue, root: root);
      expect(await store.reconcile('owner-a', roomId: 'kitchen'), isEmpty);
      expect(await store.reconcile('owner-a', roomId: 'bedroom'), [
        'bedroom-photo',
      ]);
      expect(
        journal.existsSync(),
        isTrue,
        reason: 'interrupted media is retained',
      );
    },
  );

  test(
    'a full SQLite queue retains bytes and recovers after space is available',
    () async {
      final pages = (await queue.customSelect('PRAGMA page_count').getSingle())
          .read<int>('page_count');
      await queue.customStatement('PRAGMA max_page_count = $pages');
      final store = CaptureStore(queue: queue, root: root);
      String? failedClientId;
      var acknowledged = 0;
      for (var index = 0; index < 64; index++) {
        final clientId = 'full-queue-$index';
        final source = File('${root.path}/camera-$index.jpg')
          ..writeAsBytesSync(List.filled(64, index));
        try {
          await store.save(
            source: source,
            ownerId: 'owner-a',
            inspectionId: 'inspection-a',
            roomId: 'room-a',
            kind: 'PHOTO',
            extension: 'jpg',
            mimeType: 'image/jpeg',
            clientId: clientId,
          );
          acknowledged++;
        } catch (error) {
          expect(error.toString(), contains('database or disk is full'));
          failedClientId = clientId;
          break;
        }
      }
      expect(
        failedClientId,
        isNotNull,
        reason: 'the test must exhaust its private SQLite page budget',
      );
      expect(await queue.forRoom('room-a', 'owner-a'), hasLength(acknowledged));
      expect(await queue.byClientId(failedClientId!), isNull);
      final durableFile = File(
        '${root.path}/captures/owner-a/$failedClientId.jpg',
      );
      final journal = File('${root.path}/capture-intake/$failedClientId.json');
      expect(durableFile.lengthSync(), 64);
      expect(journal.existsSync(), isTrue);

      await queue.customStatement('PRAGMA max_page_count = 1000');
      expect(await store.reconcile('owner-a'), isEmpty);
      expect(
        await queue.forRoom('room-a', 'owner-a'),
        hasLength(acknowledged + 1),
      );
      expect((await queue.byClientId(failedClientId))!.sizeBytes, 64);
      expect(durableFile.existsSync(), isTrue);
      expect(journal.existsSync(), isFalse);
      expect(await store.reconcile('owner-a'), isEmpty);
      expect(
        await queue.forRoom('room-a', 'owner-a'),
        hasLength(acknowledged + 1),
      );
    },
  );

  test(
    'a stale intake journal does not resurrect handed-over evidence',
    () async {
      final source = File('${root.path}/camera-temp.jpg')
        ..writeAsBytesSync(List.filled(32, 9));
      final store = CaptureStore(queue: queue, root: root);
      final id = await store.save(
        source: source,
        ownerId: 'owner-a',
        inspectionId: 'inspection-a',
        roomId: 'room-a',
        kind: 'PHOTO',
        extension: 'jpg',
        mimeType: 'image/jpeg',
      );
      final row = (await queue.byId(id))!;
      final journal = File('${root.path}/capture-intake/${row.clientId}.json');
      journal.writeAsStringSync(
        jsonEncode({
          'clientId': row.clientId,
          'ownerId': row.ownerId,
          'inspectionId': row.inspectionId,
          'roomId': row.roomId,
          'relativePath': row.relativePath,
          'sourcePath': '${root.path}/gone.jpg',
        }),
      );
      final claimed = (await queue.claimNext(
        DateTime.now(),
        ownerId: 'owner-a',
      ))!;
      await queue.markUploaded(id, 'server-photo', leaseId: claimed.leaseId);
      final uploaded = (await queue.byId(id))!;
      expect(
        await queue.finishIfUnchanged(uploaded, claimed.leaseId!),
        isNotNull,
      );
      File('${root.path}/${row.relativePath}').deleteSync();

      expect(await store.reconcile('owner-a'), isEmpty);
      expect(journal.existsSync(), isFalse);
      expect(await queue.byClientId(row.clientId!), isNull);
    },
  );

  test('a colliding journal cannot claim another account’s capture', () async {
    final store = CaptureStore(queue: queue, root: root);
    final first = await store.save(
      source: File('${root.path}/first.jpg')
        ..writeAsBytesSync(List.filled(16, 1)),
      ownerId: 'owner-a',
      inspectionId: 'inspection-a',
      roomId: 'room-a',
      kind: 'PHOTO',
      extension: 'jpg',
      mimeType: 'image/jpeg',
    );
    final row = (await queue.byId(first))!;
    final relative = 'captures/owner-b/${row.clientId}.jpg';
    File('${root.path}/$relative')
      ..parent.createSync(recursive: true)
      ..writeAsBytesSync(List.filled(16, 2));
    final journal = File('${root.path}/capture-intake/${row.clientId}.json');
    journal.writeAsStringSync(
      jsonEncode({
        'clientId': row.clientId,
        'ownerId': 'owner-b',
        'inspectionId': 'inspection-b',
        'roomId': 'room-b',
        'relativePath': relative,
      }),
    );

    expect(await store.reconcile('owner-b'), hasLength(1));
    expect(journal.existsSync(), isTrue);
    expect((await queue.byId(first))!.ownerId, 'owner-a');
  });
}

class _FailOnceCaptureQueue extends CaptureQueue {
  _FailOnceCaptureQueue() : super(NativeDatabase.memory());

  bool _shouldFail = true;

  @override
  Future<int> enqueue(PendingCapturesCompanion capture) {
    if (_shouldFail) {
      _shouldFail = false;
      throw StateError('simulated queue failure');
    }
    return super.enqueue(capture);
  }
}
