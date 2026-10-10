import 'dart:io';
import 'dart:math';

import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

part 'capture_queue.g.dart';

/// A capture is never lost.
///
/// Inspectors work where the signal is worst: empty units, basements, lift lobbies. The
/// bytes are written to the filesystem and a row is written here before anything touches
/// the network, and neither is removed until storage has confirmed the upload. A failed
/// attempt increments a counter and goes to the back of the line. Nothing is ever
/// discarded for failing too often, because "we gave up on your walkthrough" is the
/// failure that loses you the agent.
///
/// This mirrors src/lib/offline-queue.ts on the web, deliberately, down to the ordering
/// and the hand-over rules, because the two clients write the same rows to the same
/// server and a difference between them is a bug in one of them.
class PendingCaptures extends Table {
  IntColumn get id => integer().autoIncrement()();

  /// The auth user's id, not an email address. A later login must never send another
  /// account's unsent evidence using its bearer token.
  TextColumn get ownerId => text().nullable()();

  /// Stable across retries, app restarts and lost HTTP responses.
  TextColumn get clientId => text().nullable().unique()();

  TextColumn get roomId => text()();
  TextColumn get inspectionId => text()();
  TextColumn get kind => text()();

  /// Relative to the app support directory, never absolute: iOS moves the container
  /// between launches and an absolute path recorded yesterday points nowhere today.
  TextColumn get relativePath => text()();
  TextColumn get filename => text()();
  TextColumn get mimeType => text()();
  IntColumn get sizeBytes => integer()();
  IntColumn get durationSec => integer().nullable()();

  TextColumn get note => text().nullable()();

  /// Marks drawn before the photo ever left the phone, as the JSON the server accepts.
  TextColumn get annotations => text().nullable()();

  /// Set the moment the server has the bytes. From then on the row is only a hand-over
  /// of the phone's copy and its bytes are never sent again.
  TextColumn get uploadedId => text().nullable()();

  /// The exact note and marks sent in the first registration. Retries send this
  /// snapshot, and only later edits require a separate mutation. This matters when
  /// late media lands after the report was sent for signature: unchanged evidence can
  /// register without an edit that the signature freeze rightly rejects.
  BoolColumn get registrationPrepared =>
      boolean().withDefault(const Constant(false))();
  TextColumn get registrationNote => text().nullable()();
  TextColumn get registrationAnnotations => text().nullable()();
  BoolColumn get registrationAnnotationsApplied =>
      boolean().withDefault(const Constant(true))();

  /// Remember the object path as soon as a credential is issued. If the storage PUT
  /// succeeds but its response is lost, the retry uses the same path and clientId.
  TextColumn get storagePath => text().nullable()();

  BoolColumn get deleteRequested =>
      boolean().withDefault(const Constant(false))();

  /// Held by whichever uploader is working on this row. Background transfers run in
  /// their own isolate with their own database handle, so a re-entrancy flag in memory
  /// (which is all the web client needs) would not be seen by the other side.
  DateTimeColumn get claimedAt => dateTime().nullable()();
  TextColumn get leaseId => text().nullable()();

  IntColumn get attempts => integer().withDefault(const Constant(0))();
  TextColumn get lastError => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();
}

/// Edits to evidence already handed to the server. A note or mark typed offline must
/// survive process death just as the original capture does.
class PendingRemoteEdits extends Table {
  TextColumn get captureId => text()();
  TextColumn get ownerId => text()();
  TextColumn get inspectionId => text()();
  TextColumn get note => text().nullable()();
  BoolColumn get hasNote => boolean().withDefault(const Constant(false))();
  TextColumn get annotations => text().nullable()();
  BoolColumn get hasAnnotations =>
      boolean().withDefault(const Constant(false))();
  BoolColumn get deleteRequested =>
      boolean().withDefault(const Constant(false))();
  IntColumn get version => integer().withDefault(const Constant(0))();
  IntColumn get attempts => integer().withDefault(const Constant(0))();
  TextColumn get lastError => text().nullable()();
  DateTimeColumn get claimedAt => dateTime().nullable()();
  TextColumn get leaseId => text().nullable()();

  @override
  Set<Column> get primaryKey => {captureId};
}

/// A queued photo can finish uploading while its note or mark editor is open. Keep the
/// client/server identity after deleting the upload row so that the editor can persist
/// its result even when the room read is temporarily offline.
class CaptureHandoffs extends Table {
  TextColumn get clientId => text()();
  TextColumn get ownerId => text()();
  TextColumn get inspectionId => text()();
  TextColumn get captureId => text()();

  @override
  Set<Column> get primaryKey => {clientId};
}

@DriftDatabase(tables: [PendingCaptures, PendingRemoteEdits, CaptureHandoffs])
class CaptureQueue extends _$CaptureQueue {
  CaptureQueue([QueryExecutor? executor])
    : super(executor ?? driftDatabase(name: 'kivilo_captures'));

  @override
  int get schemaVersion => 6;

  @override
  MigrationStrategy get migration => MigrationStrategy(
    onCreate: (m) => m.createAll(),
    onUpgrade: (m, from, to) async {
      if (from < 2) {
        await m.addColumn(pendingCaptures, pendingCaptures.ownerId);
        await m.addColumn(pendingCaptures, pendingCaptures.clientId);
        await m.addColumn(pendingCaptures, pendingCaptures.storagePath);
        await m.addColumn(pendingCaptures, pendingCaptures.deleteRequested);
        await m.addColumn(pendingCaptures, pendingCaptures.leaseId);
        await customStatement(
          'CREATE UNIQUE INDEX IF NOT EXISTS pending_captures_client_id_unique '
          'ON pending_captures (client_id)',
        );
      }
      if (from < 3) await m.createTable(pendingRemoteEdits);
      if (from < 4) {
        await m.addColumn(
          pendingCaptures,
          pendingCaptures.registrationPrepared,
        );
        await m.addColumn(pendingCaptures, pendingCaptures.registrationNote);
        await m.addColumn(
          pendingCaptures,
          pendingCaptures.registrationAnnotations,
        );
      }
      if (from < 5) await m.createTable(captureHandoffs);
      if (from < 6) {
        await m.addColumn(
          pendingCaptures,
          pendingCaptures.registrationAnnotationsApplied,
        );
      }
    },
  );

  /// How long an uploader may hold a row before another may take it over. Long enough
  /// for a large video on a bad connection, short enough that a killed isolate does not
  /// strand a capture until the next launch.
  static const leaseFor = Duration(minutes: 10);

  /// Everything still on the phone, newest last, so the UI can show a capture the
  /// instant it is taken rather than waiting for a round trip. This is the analogue of
  /// the web client's useSyncExternalStore subscription.
  Stream<List<PendingCapture>> watch(String roomId, {String? ownerId}) =>
      (select(pendingCaptures)
            ..where(
              (row) =>
                  row.roomId.equals(roomId) &
                  (ownerId == null
                      ? const Constant(true)
                      : row.ownerId.equals(ownerId)),
            )
            ..orderBy([(row) => OrderingTerm(expression: row.createdAt)]))
          .watch();

  Future<List<PendingCapture>> forRoom(String roomId, String ownerId) =>
      (select(pendingCaptures)..where(
            (row) => row.roomId.equals(roomId) & row.ownerId.equals(ownerId),
          ))
          .get();

  Future<({int captures, int edits})> pendingForInspection(
    String inspectionId,
    String ownerId,
  ) async {
    final captures =
        await (select(pendingCaptures)..where(
              (row) =>
                  row.inspectionId.equals(inspectionId) &
                  row.ownerId.equals(ownerId),
            ))
            .get();
    final edits = await remoteEditsFor(ownerId, inspectionId);
    return (captures: captures.length, edits: edits.length);
  }

  Future<PendingCapture?> byClientId(String clientId) => (select(
    pendingCaptures,
  )..where((row) => row.clientId.equals(clientId))).getSingleOrNull();

  Future<String?> serverIdForClient(
    String ownerId,
    String inspectionId,
    String clientId,
  ) async {
    final handoff =
        await (select(captureHandoffs)..where(
              (row) =>
                  row.clientId.equals(clientId) &
                  row.ownerId.equals(ownerId) &
                  row.inspectionId.equals(inspectionId),
            ))
            .getSingleOrNull();
    return handoff?.captureId;
  }

  Future<int> enqueue(PendingCapturesCompanion capture) =>
      into(pendingCaptures).insert(capture);

  Future<PendingCapture?> byId(int id) => (select(
    pendingCaptures,
  )..where((row) => row.id.equals(id))).getSingleOrNull();

  /// The next row to work on, leased so a second uploader in another isolate cannot pick
  /// the same one. Ordered by attempts first, so a capture that keeps failing goes to the
  /// back of the line and cannot hold up the ones taken after it.
  Future<PendingCapture?> claimNext(
    DateTime now, {
    String? ownerId,
    Set<int> exclude = const {},
  }) {
    return transaction(() async {
      final stale = now.subtract(leaseFor);
      final candidate =
          await (select(pendingCaptures)
                ..where(
                  (row) =>
                      (row.claimedAt.isNull() |
                          row.claimedAt.isSmallerThanValue(stale)) &
                      (ownerId == null
                          ? const Constant(true)
                          : row.ownerId.equals(ownerId)) &
                      row.id.isNotIn(exclude),
                )
                ..orderBy([
                  (row) => OrderingTerm(expression: row.attempts),
                  (row) => OrderingTerm(expression: row.createdAt),
                ])
                ..limit(1))
              .getSingleOrNull();
      if (candidate == null) return null;

      final leaseId = _newId();
      await (update(
        pendingCaptures,
      )..where((row) => row.id.equals(candidate.id))).write(
        PendingCapturesCompanion(
          claimedAt: Value(now),
          leaseId: Value(leaseId),
        ),
      );
      return candidate.copyWith(claimedAt: Value(now), leaseId: Value(leaseId));
    });
  }

  Future<void> renewLease(int id, String leaseId, DateTime now) =>
      (update(pendingCaptures)
            ..where((row) => row.id.equals(id) & row.leaseId.equals(leaseId)))
          .write(PendingCapturesCompanion(claimedAt: Value(now)));

  Future<void> setStoragePath(int id, String leaseId, String path) =>
      (update(pendingCaptures)
            ..where((row) => row.id.equals(id) & row.leaseId.equals(leaseId)))
          .write(PendingCapturesCompanion(storagePath: Value(path)));

  Future<PendingCapture> prepareRegistration(int id, String leaseId) {
    return transaction(() async {
      final current = await byId(id);
      if (current == null || current.leaseId != leaseId) {
        throw StateError('Capture lease changed before registration');
      }
      if (current.registrationPrepared) return current;
      await (update(
        pendingCaptures,
      )..where((row) => row.id.equals(id) & row.leaseId.equals(leaseId))).write(
        PendingCapturesCompanion(
          registrationPrepared: const Value(true),
          registrationNote: Value(current.note),
          registrationAnnotations: Value(current.annotations),
        ),
      );
      return current.copyWith(
        registrationPrepared: true,
        registrationNote: Value(current.note),
        registrationAnnotations: Value(current.annotations),
      );
    });
  }

  /// Records the server id and whether initial marks were accepted in one transaction.
  /// A crash after this point must never re-upload: the next pass sees uploadedId and
  /// resumes only the marks or final hand-over.
  Future<void> markUploaded(
    int id,
    String captureId, {
    String? leaseId,
    bool annotationsApplied = true,
  }) async {
    await transaction(() async {
      final row = await byId(id);
      if (row == null || (leaseId != null && row.leaseId != leaseId)) {
        throw StateError('Capture lease changed before hand-over');
      }
      if (row.clientId != null && row.ownerId != null) {
        final prior =
            await (select(captureHandoffs)
                  ..where((entry) => entry.clientId.equals(row.clientId!)))
                .getSingleOrNull();
        if (prior != null &&
            (prior.ownerId != row.ownerId ||
                prior.inspectionId != row.inspectionId ||
                prior.captureId != captureId)) {
          throw StateError('Capture hand-over identity changed');
        }
        if (prior == null) {
          await into(captureHandoffs).insert(
            CaptureHandoffsCompanion.insert(
              clientId: row.clientId!,
              ownerId: row.ownerId!,
              inspectionId: row.inspectionId,
              captureId: captureId,
            ),
          );
        }
      }
      await (update(
        pendingCaptures,
      )..where((entry) => entry.id.equals(id))).write(
        PendingCapturesCompanion(
          uploadedId: Value(captureId),
          registrationAnnotationsApplied: Value(annotationsApplied),
        ),
      );
    });
  }

  /// A failed attempt is a retry, never a discard. There is deliberately no maximum.
  Future<void> recordFailure(int id, String error, {String? leaseId}) async {
    final row = await byId(id);
    if (row == null) return;
    await (update(pendingCaptures)..where(
          (r) =>
              r.id.equals(id) &
              (leaseId == null
                  ? const Constant(true)
                  : r.leaseId.equals(leaseId)),
        ))
        .write(
          PendingCapturesCompanion(
            attempts: Value(row.attempts + 1),
            lastError: Value(error),
            claimedAt: const Value(null),
            leaseId: const Value(null),
          ),
        );
  }

  Future<void> setNote(int id, String? note) =>
      (update(pendingCaptures)..where((row) => row.id.equals(id))).write(
        PendingCapturesCompanion(note: Value(note)),
      );

  Future<void> setAnnotations(int id, String? annotations) =>
      (update(pendingCaptures)..where((row) => row.id.equals(id))).write(
        PendingCapturesCompanion(annotations: Value(annotations)),
      );

  Future<void> requestDelete(int id) =>
      (update(pendingCaptures)..where((row) => row.id.equals(id))).write(
        const PendingCapturesCompanion(deleteRequested: Value(true)),
      );

  Future<PendingRemoteEdit?> remoteEdit(String captureId) => (select(
    pendingRemoteEdits,
  )..where((row) => row.captureId.equals(captureId))).getSingleOrNull();

  Future<void> queueRemoteNote(
    String ownerId,
    String inspectionId,
    String captureId,
    String? note,
  ) async {
    await transaction(() async {
      final current = await remoteEdit(captureId);
      if (current == null) {
        await into(pendingRemoteEdits).insert(
          PendingRemoteEditsCompanion.insert(
            captureId: captureId,
            ownerId: ownerId,
            inspectionId: inspectionId,
            note: Value(note),
            hasNote: const Value(true),
            version: const Value(1),
          ),
        );
      } else {
        if (current.ownerId != ownerId ||
            current.inspectionId != inspectionId) {
          throw StateError(
            'Capture edit belongs to another account or inspection',
          );
        }
        await (update(
          pendingRemoteEdits,
        )..where((row) => row.captureId.equals(captureId))).write(
          PendingRemoteEditsCompanion(
            note: Value(note),
            hasNote: const Value(true),
            version: Value(current.version + 1),
          ),
        );
      }
    });
  }

  Future<void> queueRemoteAnnotations(
    String ownerId,
    String inspectionId,
    String captureId,
    String? annotations,
  ) async {
    await transaction(() async {
      final current = await remoteEdit(captureId);
      if (current == null) {
        await into(pendingRemoteEdits).insert(
          PendingRemoteEditsCompanion.insert(
            captureId: captureId,
            ownerId: ownerId,
            inspectionId: inspectionId,
            annotations: Value(annotations),
            hasAnnotations: const Value(true),
            version: const Value(1),
          ),
        );
      } else {
        if (current.ownerId != ownerId ||
            current.inspectionId != inspectionId) {
          throw StateError(
            'Capture edit belongs to another account or inspection',
          );
        }
        await (update(
          pendingRemoteEdits,
        )..where((row) => row.captureId.equals(captureId))).write(
          PendingRemoteEditsCompanion(
            annotations: Value(annotations),
            hasAnnotations: const Value(true),
            version: Value(current.version + 1),
          ),
        );
      }
    });
  }

  Future<void> queueRemoteDelete(
    String ownerId,
    String inspectionId,
    String captureId,
  ) async {
    await transaction(() async {
      final current = await remoteEdit(captureId);
      if (current == null) {
        await into(pendingRemoteEdits).insert(
          PendingRemoteEditsCompanion.insert(
            captureId: captureId,
            ownerId: ownerId,
            inspectionId: inspectionId,
            deleteRequested: const Value(true),
            version: const Value(1),
          ),
        );
      } else {
        if (current.ownerId != ownerId ||
            current.inspectionId != inspectionId) {
          throw StateError(
            'Capture edit belongs to another account or inspection',
          );
        }
        await (update(
          pendingRemoteEdits,
        )..where((row) => row.captureId.equals(captureId))).write(
          PendingRemoteEditsCompanion(
            deleteRequested: const Value(true),
            version: Value(current.version + 1),
          ),
        );
      }
    });
  }

  Future<List<PendingRemoteEdit>> remoteEditsFor(
    String ownerId,
    String inspectionId,
  ) =>
      (select(pendingRemoteEdits)..where(
            (row) =>
                row.ownerId.equals(ownerId) &
                row.inspectionId.equals(inspectionId),
          ))
          .get();

  Future<PendingRemoteEdit?> claimNextRemoteEdit(
    DateTime now,
    String ownerId, {
    Set<String> exclude = const {},
  }) {
    return transaction(() async {
      final stale = now.subtract(leaseFor);
      final candidate =
          await (select(pendingRemoteEdits)
                ..where(
                  (row) =>
                      row.ownerId.equals(ownerId) &
                      row.captureId.isNotIn(exclude) &
                      (row.claimedAt.isNull() |
                          row.claimedAt.isSmallerThanValue(stale)),
                )
                ..orderBy([(row) => OrderingTerm(expression: row.attempts)])
                ..limit(1))
              .getSingleOrNull();
      if (candidate == null) return null;
      final leaseId = _newId();
      await (update(
        pendingRemoteEdits,
      )..where((row) => row.captureId.equals(candidate.captureId))).write(
        PendingRemoteEditsCompanion(
          claimedAt: Value(now),
          leaseId: Value(leaseId),
        ),
      );
      return candidate.copyWith(claimedAt: Value(now), leaseId: Value(leaseId));
    });
  }

  Future<void> renewRemoteEditLease(
    String captureId,
    String leaseId,
    DateTime now,
  ) =>
      (update(pendingRemoteEdits)..where(
            (row) =>
                row.captureId.equals(captureId) & row.leaseId.equals(leaseId),
          ))
          .write(PendingRemoteEditsCompanion(claimedAt: Value(now)));

  Future<bool> finishRemoteEdit(PendingRemoteEdit sent) {
    return transaction(() async {
      final current = await remoteEdit(sent.captureId);
      if (current == null ||
          current.leaseId != sent.leaseId ||
          current.version != sent.version) {
        return false;
      }
      await (delete(
        pendingRemoteEdits,
      )..where((row) => row.captureId.equals(sent.captureId))).go();
      return true;
    });
  }

  Future<void> failRemoteEdit(PendingRemoteEdit sent, String error) =>
      (update(pendingRemoteEdits)..where(
            (row) =>
                row.captureId.equals(sent.captureId) &
                row.leaseId.equals(sent.leaseId!),
          ))
          .write(
            PendingRemoteEditsCompanion(
              attempts: Value(sent.attempts + 1),
              lastError: Value(error),
              claimedAt: const Value(null),
              leaseId: const Value(null),
            ),
          );

  /// A remote edit can take seconds. Only remove the row when nothing changed while
  /// that edit was in flight; otherwise the uploader loops with the newer values.
  Future<PendingCapture?> finishIfUnchanged(
    PendingCapture sent,
    String leaseId,
  ) {
    return transaction(() async {
      final current = await byId(sent.id);
      if (current == null ||
          current.leaseId != leaseId ||
          current.note != sent.note ||
          current.annotations != sent.annotations ||
          current.deleteRequested != sent.deleteRequested ||
          current.uploadedId != sent.uploadedId) {
        return null;
      }
      await (delete(
        pendingCaptures,
      )..where((row) => row.id.equals(sent.id))).go();
      return current;
    });
  }

  /// Removes the row and reports what it held at that moment, so a note typed right up
  /// to the delete still reaches the server. Read and delete happen in one transaction,
  /// which is the whole reason this is not a get followed by a delete.
  Future<PendingCapture?> take(int id, {String? leaseId}) {
    return transaction(() async {
      final row = await byId(id);
      if (row != null && (leaseId == null || row.leaseId == leaseId)) {
        await (delete(pendingCaptures)..where((r) => r.id.equals(id))).go();
        return row;
      }
      return null;
    });
  }

  /// Puts a row back after the hand-over failed. Its uploadedId comes with it, so the
  /// bytes are never sent a second time; only the note and the marks are still owed.
  /// Without this, a hand-over that fails after take() has already removed the row would
  /// drop the inspector's last edit with nothing to retry.
  Future<void> restore(PendingCapture row, String error) =>
      into(pendingCaptures).insert(
        PendingCapturesCompanion(
          id: Value(row.id),
          ownerId: Value(row.ownerId),
          clientId: Value(row.clientId),
          roomId: Value(row.roomId),
          inspectionId: Value(row.inspectionId),
          kind: Value(row.kind),
          relativePath: Value(row.relativePath),
          filename: Value(row.filename),
          mimeType: Value(row.mimeType),
          sizeBytes: Value(row.sizeBytes),
          durationSec: Value(row.durationSec),
          note: Value(row.note),
          annotations: Value(row.annotations),
          uploadedId: Value(row.uploadedId),
          registrationPrepared: Value(row.registrationPrepared),
          registrationNote: Value(row.registrationNote),
          registrationAnnotations: Value(row.registrationAnnotations),
          registrationAnnotationsApplied: Value(
            row.registrationAnnotationsApplied,
          ),
          storagePath: Value(row.storagePath),
          deleteRequested: Value(row.deleteRequested),
          claimedAt: const Value(null),
          leaseId: const Value(null),
          attempts: Value(row.attempts + 1),
          lastError: Value(error),
          createdAt: Value(row.createdAt),
        ),
        mode: InsertMode.insertOrReplace,
      );

  /// The bytes go last, and only once the row is gone. The other order leaves a row
  /// pointing at a file that no longer exists, which is a capture lost.
  Future<void> discardFile(Directory root, PendingCapture capture) async {
    final file = File('${root.path}/${capture.relativePath}');
    if (file.existsSync()) await file.delete();
  }
}

String _newId() {
  final bytes = List<int>.generate(16, (_) => Random.secure().nextInt(256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  String hex(int a, int b) => bytes
      .sublist(a, b)
      .map((value) => value.toRadixString(16).padLeft(2, '0'))
      .join();
  return '${hex(0, 4)}-${hex(4, 6)}-${hex(6, 8)}-${hex(8, 10)}-${hex(10, 16)}';
}

String newCaptureId() => _newId();
