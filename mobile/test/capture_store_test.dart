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
