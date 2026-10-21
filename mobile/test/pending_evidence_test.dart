import 'dart:convert';
import 'dart:io';

import 'package:drift/drift.dart' show Value;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/services/capture_queue.dart';
import 'package:kivilo/services/pending_evidence.dart';

void main() {
  late CaptureQueue queue;
  late Directory root;

  setUp(() {
    queue = CaptureQueue(NativeDatabase.memory());
    root = Directory.systemTemp.createTempSync('pending-evidence-');
  });
  tearDown(() async {
    await queue.close();
    root.deleteSync(recursive: true);
  });

  Future<Map<String, int>> pending() => pendingEvidencePhotos(
    queue: queue,
    root: root,
    ownerId: 'agent',
    queueOwner: 'finding:inspection',
  );

  Future<int> enqueue(
    String clientId, {
    String owner = 'agent',
    String destination = 'finding:inspection',
    String target = 'finding-one',
  }) => queue.enqueue(
    PendingCapturesCompanion.insert(
      ownerId: Value(owner),
      clientId: Value(clientId),
      roomId: target,
      inspectionId: destination,
      kind: 'PHOTO',
      awaitingMarkup: const Value(true),
      relativePath: 'captures/$owner/$clientId.jpg',
      filename: '$clientId.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 4,
      createdAt: DateTime.utc(2026, 10, 21),
    ),
  );

  Future<File> intake(
    String clientId, {
    String owner = 'agent',
    String destination = 'finding:inspection',
    String target = 'finding-one',
    bool originalExists = false,
  }) async {
    final relative = 'captures/$owner/$clientId.jpg';
    if (originalExists) {
      final original = File('${root.path}/$relative');
      await original.parent.create(recursive: true);
      await original.writeAsBytes([0xFF, 0xD8, 0xFF, 1]);
    }
    final journal = File('${root.path}/capture-intake/$clientId.json');
    await journal.parent.create(recursive: true);
    await journal.writeAsString(
      jsonEncode({
        'clientId': clientId,
        'ownerId': owner,
        'inspectionId': destination,
        'roomId': target,
        'kind': 'PHOTO',
        'awaitingMarkup': true,
        'relativePath': relative,
        'sourcePath': '${root.path}/missing-$clientId.jpg',
        'filename': '$clientId.jpg',
        'mimeType': 'image/jpeg',
        'createdAt': '2026-10-21T00:00:00Z',
      }),
    );
    return journal;
  }

  Future<File> picker({
    String owner = 'agent',
    String destination = 'finding:inspection',
    String target = 'finding-one',
    List<String>? clients,
  }) async {
    final journal = File('${root.path}/capture-picker.json');
    await journal.writeAsString(
      jsonEncode({
        'flow': 'evidence',
        'ownerId': owner,
        'inspectionId': destination,
        'roomId': target,
        if (clients != null)
          'files': [
            for (final client in clients)
              {'clientId': client, 'path': '${root.path}/$client.jpg'},
          ],
      }),
    );
    return journal;
  }

  test(
    'recovers a durable original before counting its held queue row',
    () async {
      final journal = await intake('recovered', originalExists: true);
      expect(await pending(), {'finding-one': 1});
      expect(await journal.exists(), isFalse);
      expect((await queue.byClientId('recovered'))!.awaitingMarkup, isTrue);
      expect(await pending(), {'finding-one': 1});
    },
  );

  test('in-flight picker blocks until its own screen recovers it', () async {
    final journal = await picker();
    expect(await pending(), {'finding-one': 1});
    expect(await journal.exists(), isTrue);
    await picker(clients: []);
    expect(await pending(), isEmpty);
  });

  test(
    'matches owner and destination exactly and returns each target',
    () async {
      await enqueue('queued-one');
      await enqueue('queued-two', target: 'finding-two');
      await enqueue('other-owner', owner: 'other');
      await enqueue('other-flow', destination: 'addendum:inspection');
      await intake('other-journal-owner', owner: 'other');
      await intake('other-journal-flow', destination: 'maintenance:inspection');
      await picker(owner: 'other');
      expect(await pending(), {'finding-one': 1, 'finding-two': 1});
      await picker(destination: 'finding:another-inspection');
      expect(await pending(), {'finding-one': 1, 'finding-two': 1});
    },
  );

  test(
    'counts unresolved journals once across picker and queue identities',
    () async {
      await enqueue('queued');
      final unresolved = await intake('missing');
      await picker(
        clients: ['queued', 'missing', 'picker-only', 'picker-only'],
      );
      expect(await pending(), {'finding-one': 3});
      expect(await unresolved.exists(), isTrue);
      expect(await queue.byClientId('missing'), isNull);
    },
  );

  test('stale handed-off journals do not resurrect completed photos', () async {
    await queue
        .into(queue.captureHandoffs)
        .insert(
          CaptureHandoffsCompanion.insert(
            clientId: 'uploaded',
            ownerId: 'agent',
            inspectionId: 'finding:inspection',
            captureId: 'server-photo',
          ),
        );
    final stale = await intake('uploaded');
    await picker(clients: ['uploaded']);
    expect(await pending(), isEmpty);
    expect(await stale.exists(), isFalse);
    expect(await queue.byClientId('uploaded'), isNull);
  });

  test(
    'a handoff still finishing metadata remains pending in the queue',
    () async {
      await enqueue('registered');
      await queue
          .into(queue.captureHandoffs)
          .insert(
            CaptureHandoffsCompanion.insert(
              clientId: 'registered',
              ownerId: 'agent',
              inspectionId: 'finding:inspection',
              captureId: 'server-photo',
            ),
          );
      await picker(clients: ['registered']);
      expect(await pending(), {'finding-one': 1});
    },
  );

  test(
    'ambiguous or malformed journals fail closed and remain recoverable',
    () async {
      final journal = await picker();
      await journal.writeAsString('{unfinished');
      await expectLater(pending(), throwsFormatException);
      expect(await journal.readAsString(), '{unfinished');
      await journal.writeAsString(jsonEncode({'roomId': 'finding-one'}));
      await expectLater(pending(), throwsFormatException);
      await journal.delete();
      final intakeJournal = await intake('unreadable');
      await intakeJournal.writeAsString('[]');
      await expectLater(pending(), throwsFormatException);
      expect(await intakeJournal.readAsString(), '[]');
    },
  );
}
