import 'dart:io';

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

  /// Held by whichever uploader is working on this row. Background transfers run in
  /// their own isolate with their own database handle, so a re-entrancy flag in memory
  /// (which is all the web client needs) would not be seen by the other side.
  DateTimeColumn get claimedAt => dateTime().nullable()();

  IntColumn get attempts => integer().withDefault(const Constant(0))();
  TextColumn get lastError => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();
}

@DriftDatabase(tables: [PendingCaptures])
class CaptureQueue extends _$CaptureQueue {
  CaptureQueue([QueryExecutor? executor])
      : super(executor ?? driftDatabase(name: 'kivilo_captures'));

  @override
  int get schemaVersion => 1;

  /// How long an uploader may hold a row before another may take it over. Long enough
  /// for a large video on a bad connection, short enough that a killed isolate does not
  /// strand a capture until the next launch.
  static const leaseFor = Duration(minutes: 10);

  /// Everything still on the phone, newest last, so the UI can show a capture the
  /// instant it is taken rather than waiting for a round trip. This is the analogue of
  /// the web client's useSyncExternalStore subscription.
  Stream<List<PendingCapture>> watch(String roomId) =>
      (select(pendingCaptures)..where((row) => row.roomId.equals(roomId))
            ..orderBy([(row) => OrderingTerm(expression: row.createdAt)]))
          .watch();

  Future<int> enqueue(PendingCapturesCompanion capture) =>
      into(pendingCaptures).insert(capture);

  Future<PendingCapture?> byId(int id) =>
      (select(pendingCaptures)..where((row) => row.id.equals(id))).getSingleOrNull();

  /// The next row to work on, leased so a second uploader in another isolate cannot pick
  /// the same one. Ordered by attempts first, so a capture that keeps failing goes to the
  /// back of the line and cannot hold up the ones taken after it.
  Future<PendingCapture?> claimNext(DateTime now) {
    return transaction(() async {
      final stale = now.subtract(leaseFor);
      final candidate = await (select(pendingCaptures)
            ..where((row) => row.claimedAt.isNull() | row.claimedAt.isSmallerThanValue(stale))
            ..orderBy([
              (row) => OrderingTerm(expression: row.attempts),
              (row) => OrderingTerm(expression: row.createdAt),
            ])
            ..limit(1))
          .getSingleOrNull();
      if (candidate == null) return null;

      await (update(pendingCaptures)..where((row) => row.id.equals(candidate.id)))
          .write(PendingCapturesCompanion(claimedAt: Value(now)));
      return candidate.copyWith(claimedAt: Value(now));
    });
  }

  /// Records the server id as soon as storage has the bytes, inside the same call that
  /// releases the lease. A crash after this point must never re-upload: the next pass
  /// sees uploadedId and goes straight to the hand-over.
  Future<void> markUploaded(int id, String captureId) =>
      (update(pendingCaptures)..where((row) => row.id.equals(id))).write(
        PendingCapturesCompanion(uploadedId: Value(captureId), claimedAt: const Value(null)),
      );

  /// A failed attempt is a retry, never a discard. There is deliberately no maximum.
  Future<void> recordFailure(int id, String error) async {
    final row = await byId(id);
    if (row == null) return;
    await (update(pendingCaptures)..where((r) => r.id.equals(id))).write(
      PendingCapturesCompanion(
        attempts: Value(row.attempts + 1),
        lastError: Value(error),
        claimedAt: const Value(null),
      ),
    );
  }

  Future<void> setNote(int id, String? note) =>
      (update(pendingCaptures)..where((row) => row.id.equals(id)))
          .write(PendingCapturesCompanion(note: Value(note)));

  Future<void> setAnnotations(int id, String? annotations) =>
      (update(pendingCaptures)..where((row) => row.id.equals(id)))
          .write(PendingCapturesCompanion(annotations: Value(annotations)));

  /// Removes the row and reports what it held at that moment, so a note typed right up
  /// to the delete still reaches the server. Read and delete happen in one transaction,
  /// which is the whole reason this is not a get followed by a delete.
  Future<PendingCapture?> take(int id) {
    return transaction(() async {
      final row = await byId(id);
      if (row != null) {
        await (delete(pendingCaptures)..where((r) => r.id.equals(id))).go();
      }
      return row;
    });
  }

  /// The bytes go last, and only once the row is gone. The other order leaves a row
  /// pointing at a file that no longer exists, which is a capture lost.
  Future<void> discardFile(Directory root, PendingCapture capture) async {
    final file = File('${root.path}/${capture.relativePath}');
    if (file.existsSync()) await file.delete();
  }
}
