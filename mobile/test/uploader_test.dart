import 'dart:io';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/services/capture_backend.dart';
import 'package:kivilo/services/capture_queue.dart';
import 'package:kivilo/services/uploader.dart';

class FakeBackend implements CaptureBackend {
  FakeBackend({
    this.failPut = false,
    this.loseRegisterResponse = false,
    this.duringUpload,
    this.duringRegister,
    this.rejectEdits = false,
    this.rejectDeletes = false,
    this.acceptInitialAnnotations = true,
  });

  final bool failPut;
  bool loseRegisterResponse;
  final Future<void> Function()? duringUpload;
  final Future<void> Function()? duringRegister;
  final bool rejectEdits;
  final bool rejectDeletes;
  final bool acceptInitialAnnotations;
  final calls = <String>[];
  final notes = <String?>[];
  final registeredNotes = <String?>[];
  final annotations = <Map<String, dynamic>?>[];
  final ids = <String, String>{};
  bool uploadUrlsAllowed = true;
  bool stored = false;
  int uploads = 0;
  int registrations = 0;

  @override
  Future<({String storagePath, String? signedUrl, bool alreadyUploaded})>
  uploadUrl(
    String inspectionId,
    String roomId,
    String filename,
    String clientId,
  ) async {
    if (!uploadUrlsAllowed) {
      throw StateError('countersigned: no new upload URLs');
    }
    calls.add('uploadUrl');
    return (
      storagePath: '$roomId/$clientId.jpg',
      signedUrl: stored ? null : 'https://storage.test/upload',
      alreadyUploaded: stored,
    );
  }

  @override
  Future<void> putBytes(
    String signedUrl,
    File file,
    String mimeType,
    String clientId,
  ) async {
    calls.add('putBytes');
    uploads++;
    if (duringUpload != null) await duringUpload!();
    if (failPut) throw StateError('putBytes failed');
    stored = true;
  }

  @override
  Future<({String id, bool annotationsApplied})> registerCapture({
    required String inspectionId,
    required String roomId,
    required String kind,
    required String storagePath,
    required String clientId,
    required String mimeType,
    required int sizeBytes,
    int? durationSec,
    String? note,
    Map<String, dynamic>? annotations,
  }) async {
    calls.add('registerCapture');
    final id = ids.putIfAbsent(clientId, () {
      registrations++;
      return 'cap_$registrations';
    });
    registeredNotes.add(note);
    if (duringRegister != null) await duringRegister!();
    if (loseRegisterResponse) {
      loseRegisterResponse = false;
      throw StateError('registration response lost');
    }
    this.annotations.add(annotations);
    return (
      id: id,
      annotationsApplied: annotations == null || acceptInitialAnnotations,
    );
  }

  @override
  Future<void> updateNote(
    String inspectionId,
    String captureId,
    String? note,
  ) async {
    if (rejectEdits) throw StateError('report frozen');
    calls.add('updateNote');
    notes.add(note);
  }

  @override
  Future<void> annotate(
    String inspectionId,
    String captureId,
    Map<String, dynamic>? marks,
  ) async {
    if (rejectEdits) throw StateError('report frozen');
    calls.add('annotate');
    annotations.add(marks);
  }

  @override
  Future<void> deleteCapture(String inspectionId, String captureId) async {
    if (rejectDeletes) throw StateError('not found or unauthorized');
    calls.add('deleteCapture');
  }

  @override
  Future<void> finishRoom(String inspectionId, String roomId) async {
    calls.add('finishRoom');
  }
}

void main() {
  late CaptureQueue queue;
  late Directory root;
  var count = 0;

  setUp(() {
    queue = CaptureQueue(NativeDatabase.memory());
    root = Directory.systemTemp.createTempSync('kivilo-uploader');
  });

  tearDown(() async {
    await queue.close();
    if (root.existsSync()) root.deleteSync(recursive: true);
  });

  Future<int> queued({
    String owner = 'owner-a',
    String? note,
    String? annotations,
    bool withFile = true,
  }) async {
    count++;
    final relative = 'captures/photo-$count.jpg';
    if (withFile) {
      final file = File('${root.path}/$relative')
        ..parent.createSync(recursive: true);
      file.writeAsBytesSync(List.filled(64, 7));
    }
    return queue.enqueue(
      PendingCapturesCompanion.insert(
        ownerId: Value(owner),
        clientId: Value('client-$count'),
        roomId: 'room-1',
        inspectionId: 'insp-1',
        kind: 'PHOTO',
        relativePath: relative,
        filename: 'photo-$count.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 64,
        createdAt: DateTime(2026, 8, 28),
        note: Value(note),
        annotations: Value(annotations),
      ),
    );
  }

  Uploader uploader(FakeBackend backend, {String owner = 'owner-a'}) =>
      Uploader(queue: queue, backend: backend, root: root, ownerId: owner);

  test('stores, registers, hands over, then removes the local file', () async {
    final id = await queued(note: 'Fridge rating plate');
    final queuedCapture = (await queue.byId(id))!;
    final file = File('${root.path}/${queuedCapture.relativePath}');
    final backend = FakeBackend();

    expect(await uploader(backend).drain(), isTrue);

    expect(backend.calls, ['uploadUrl', 'putBytes', 'registerCapture']);
    expect(await queue.byId(id), isNull);
    expect(await file.exists(), isFalse);
    expect(
      await queue.serverIdForClient(
        'owner-a',
        'insp-1',
        queuedCapture.clientId!,
      ),
      'cap_1',
      reason: 'an open editor can save after upload hand-over',
    );
  });

  test(
    'a lost registration response retries one object and one capture row',
    () async {
      final id = await queued();
      final backend = FakeBackend(loseRegisterResponse: true);

      expect(await uploader(backend).drain(), isFalse);
      expect((await queue.byId(id))!.attempts, 1);
      expect(backend.uploads, 1);

      backend.uploadUrlsAllowed = false;
      expect(await uploader(backend).drain(), isTrue);
      expect(
        backend.uploads,
        1,
        reason: 'registration retry never reuploads the stored bytes',
      );
      expect(
        backend.calls.where((call) => call == 'uploadUrl'),
        hasLength(1),
        reason: 'idempotent registration works after countersignature',
      );
      expect(
        backend.registrations,
        1,
        reason: 'clientId makes registration idempotent',
      );
      expect(await queue.byId(id), isNull);
    },
  );

  test('an editor open across hand-over can persist its last note', () async {
    final id = await queued();
    final clientId = (await queue.byId(id))!.clientId!;
    final backend = FakeBackend();

    await uploader(backend).drain();
    final serverId = await queue.serverIdForClient(
      'owner-a',
      'insp-1',
      clientId,
    );
    expect(serverId, isNotNull);
    expect(
      await queue.serverIdForClient('owner-b', 'insp-1', clientId),
      isNull,
    );
    await queue.queueRemoteNote('owner-a', 'insp-1', serverId!, 'Final note');
    expect(await uploader(backend).drain(), isTrue);
    expect(backend.notes, ['Final note']);
  });

  test('a note typed during upload reaches the server', () async {
    final id = await queued(note: 'Before');
    final backend = FakeBackend(duringUpload: () => queue.setNote(id, 'After'));

    await uploader(backend).drain();

    expect(backend.registeredNotes.single, 'After');
    expect(await queue.byId(id), isNull);
  });

  test('a note typed during registration is sent after registration', () async {
    final id = await queued(note: 'Before');
    final backend = FakeBackend(
      duringRegister: () => queue.setNote(id, 'After'),
    );

    await uploader(backend).drain();

    expect(backend.registeredNotes.single, 'Before');
    expect(backend.notes.single, 'After');
    expect(await queue.byId(id), isNull);
  });

  test(
    'late unchanged media registers after signature without an edit',
    () async {
      final id = await queued(note: 'Saved before Send');
      final backend = FakeBackend(rejectEdits: true);

      expect(await uploader(backend).drain(), isTrue);

      expect(backend.registeredNotes.single, 'Saved before Send');
      expect(backend.calls, isNot(contains('updateNote')));
      expect(backend.calls, isNot(contains('annotate')));
      expect(await queue.byId(id), isNull);
    },
  );

  test('marks made offline travel beside the original photo', () async {
    await queued(
      annotations:
          '{"w":100,"h":150,"marks":[{"shape":"ring","cx":0.5,"cy":0.5,"rx":0.1,"ry":0.1}]}',
    );
    final backend = FakeBackend();

    await uploader(backend).drain();

    expect(backend.annotations.first?['w'], 100);
    expect(
      backend.calls,
      isNot(contains('annotate')),
      reason: 'registration already included the marks',
    );
  });

  test(
    'late marks remain durable after bytes register into a frozen report',
    () async {
      final id = await queued(
        annotations:
            '{"w":100,"h":150,"marks":[{"shape":"ring","cx":0.5,"cy":0.5,"rx":0.1,"ry":0.1}]}',
      );
      final file = File('${root.path}/${(await queue.byId(id))!.relativePath}');
      final backend = FakeBackend(
        rejectEdits: true,
        acceptInitialAnnotations: false,
      );

      expect(await uploader(backend).drain(), isFalse);
      final pending = (await queue.byId(id))!;
      expect(
        pending.uploadedId,
        'cap_1',
        reason: 'original media reached the server',
      );
      expect(pending.registrationAnnotationsApplied, isFalse);
      expect(pending.lastError, contains('report frozen'));
      expect(await file.exists(), isTrue);

      // The inspector can explicitly undo the refused marks without deleting the
      // already registered original photograph.
      await queue.setAnnotations(id, null);
      expect(await uploader(backend).drain(), isTrue);
      expect(backend.calls.where((call) => call == 'uploadUrl'), hasLength(1));
      expect(await queue.byId(id), isNull);
      expect(await file.exists(), isFalse);
    },
  );

  test('failed PUT retains bytes, row and retry count', () async {
    final id = await queued();
    final file = File('${root.path}/${(await queue.byId(id))!.relativePath}');
    final backend = FakeBackend(failPut: true);

    expect(await uploader(backend).drain(), isFalse);

    final row = (await queue.byId(id))!;
    expect(row.attempts, 1);
    expect(row.claimedAt, isNull);
    expect(await file.exists(), isTrue);
  });

  test('missing local bytes stay visible for recovery', () async {
    final id = await queued(withFile: false);
    final backend = FakeBackend();

    expect(await uploader(backend).drain(), isFalse);

    final row = (await queue.byId(id))!;
    expect(row.attempts, 1);
    expect(row.lastError, contains('missing'));
    expect(backend.uploads, 0);
  });

  test(
    'deletion requested during upload is confirmed before local removal',
    () async {
      final id = await queued();
      final backend = FakeBackend(duringUpload: () => queue.requestDelete(id));

      expect(await uploader(backend).drain(), isTrue);

      expect(backend.calls, contains('deleteCapture'));
      expect(await queue.byId(id), isNull);
    },
  );

  test(
    'another account cannot upload the previous account’s queued photo',
    () async {
      final id = await queued(owner: 'owner-a');
      final backend = FakeBackend();

      expect(await uploader(backend, owner: 'owner-b').drain(), isFalse);

      expect(backend.calls, isEmpty);
      expect(await queue.byId(id), isNotNull);
    },
  );

  test('offline edits to a synced photo remain durable until accepted', () async {
    await queue.queueRemoteNote(
      'owner-a',
      'insp-1',
      'server-photo',
      'Crack beside hinge',
    );
    await queue.queueRemoteAnnotations(
      'owner-a',
      'insp-1',
      'server-photo',
      '{"w":100,"h":200,"marks":[{"shape":"ring","cx":0.5,"cy":0.5,"rx":0.1,"ry":0.1}]}',
    );

    final frozen = FakeBackend(rejectEdits: true);
    expect(await uploader(frozen).drain(), isFalse);
    expect((await queue.remoteEdit('server-photo'))!.attempts, 1);

    final open = FakeBackend();
    expect(await uploader(open).drain(), isTrue);
    expect(open.notes, ['Crack beside hinge']);
    expect(open.annotations.single?['h'], 200);
    expect(await queue.remoteEdit('server-photo'), isNull);
  });

  test(
    'queued remote deletion does not disappear on a failed attempt',
    () async {
      await queue.queueRemoteDelete('owner-a', 'insp-1', 'server-photo');
      final backend = FakeBackend();

      expect(await uploader(backend, owner: 'owner-b').drain(), isFalse);
      expect(await queue.remoteEdit('server-photo'), isNotNull);
      expect(await uploader(backend).drain(), isTrue);
      expect(backend.calls, ['deleteCapture']);
      expect(await queue.remoteEdit('server-photo'), isNull);
    },
  );

  test(
    'a 404-like refused deletion stays queued for account recovery',
    () async {
      await queue.queueRemoteDelete('owner-a', 'insp-1', 'server-photo');

      expect(await uploader(FakeBackend(rejectDeletes: true)).drain(), isFalse);
      expect((await queue.remoteEdit('server-photo'))!.attempts, 1);

      expect(await uploader(FakeBackend()).drain(), isTrue);
      expect(await queue.remoteEdit('server-photo'), isNull);
    },
  );

  test('HTTP deletion propagates an ambiguous 404', () async {
    final dio = Dio(BaseOptions(baseUrl: 'https://example.invalid'));
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          handler.reject(
            DioException(
              requestOptions: options,
              response: Response(requestOptions: options, statusCode: 404),
            ),
          );
        },
      ),
    );

    expect(
      HttpCaptureBackend(dio).deleteCapture('insp-1', 'cap-1'),
      throwsA(isA<DioException>()),
    );
  });
}
