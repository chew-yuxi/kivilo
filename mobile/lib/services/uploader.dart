import 'dart:async';
import 'dart:convert';
import 'dart:io';


import 'api_failure.dart';
import 'capture_backend.dart';
import 'capture_queue.dart';

/// Carries durable captures to storage and then the report. Every retry keeps the
/// same clientId, so an ambiguous network response can only resolve to one row.
class Uploader {
  Uploader({
    required this.queue,
    required this.backend,
    required this.root,
    required this.ownerId,
  });

  final CaptureQueue queue;
  final CaptureBackend backend;
  final Directory root;
  final String ownerId;

  bool _running = false;

  Future<bool> drain({DateTime Function()? clock}) async {
    if (_running) return false;
    _running = true;
    final now = clock ?? DateTime.now;
    var moved = false;
    final attempted = <int>{};
    try {
      while (true) {
        final capture = await queue.claimNext(
          now(),
          ownerId: ownerId,
          exclude: attempted,
        );
        if (capture == null) break;
        attempted.add(capture.id);
        if (await _carry(capture, now)) moved = true;
      }
      final attemptedEdits = <String>{};
      while (true) {
        final edit = await queue.claimNextRemoteEdit(
          now(),
          ownerId,
          exclude: attemptedEdits,
        );
        if (edit == null) break;
        attemptedEdits.add(edit.captureId);
        if (await _carryEdit(edit, now)) moved = true;
      }
    } finally {
      _running = false;
    }
    return moved;
  }

  Future<bool> _carryEdit(
    PendingRemoteEdit edit,
    DateTime Function() now,
  ) async {
    final leaseId = edit.leaseId!;
    final heartbeat = Timer.periodic(const Duration(minutes: 1), (_) {
      unawaited(queue.renewRemoteEditLease(edit.captureId, leaseId, now()));
    });
    try {
      while (true) {
        final current = await queue.remoteEdit(edit.captureId);
        if (current == null || current.leaseId != leaseId) return false;
        if (current.deleteRequested) {
          await backend.deleteCapture(current.inspectionId, current.captureId);
        } else {
          if (current.hasNote) {
            await backend.updateNote(
              current.inspectionId,
              current.captureId,
              current.note,
            );
          }
          if (current.hasAnnotations) {
            await backend.annotate(
              current.inspectionId,
              current.captureId,
              _decode(current.annotations),
            );
          }
        }
        if (await queue.finishRemoteEdit(current)) return true;
      }
    } catch (error) {
      await queue.failRemoteEdit(
        edit,
        plainError(error),
      );
      return false;
    } finally {
      heartbeat.cancel();
    }
  }

  Future<bool> _carry(PendingCapture capture, DateTime Function() now) async {
    final leaseId = capture.leaseId!;
    final heartbeat = Timer.periodic(const Duration(minutes: 1), (_) {
      unawaited(queue.renewLease(capture.id, leaseId, now()));
    });
    try {
      var serverId = capture.uploadedId;
      if (serverId == null) {
        final clientId = capture.clientId;
        if (clientId == null) {
          // Rows created by an old client before account isolation cannot be safely
          // sent under a different user's bearer token.
          throw StateError('Capture has no owner-safe upload identity.');
        }
        late final String storagePath;
        late final PendingCapture prepared;
        if (capture.registrationPrepared && capture.storagePath != null) {
          reportEvidenceSync(
            clientId,
            EvidenceSyncStage.registering,
            progress: 1,
          );
          // A prior registration may already have succeeded even though its HTTP
          // response was lost. Retry that same call before asking for a new upload
          // token: issuing tokens is forbidden after countersignature, but returning
          // the existing capture by clientId is still safe and supported.
          storagePath = capture.storagePath!;
          prepared = capture;
        } else {
          final file = File('${root.path}/${capture.relativePath}');
          reportEvidenceSync(
            clientId,
            EvidenceSyncStage.preparing,
            progress: 0,
          );
          // Credentials expire, so mint one for each upload attempt. The backend
          // returns the same path and checks whether the object already exists.
          final credential = await backend.uploadUrl(
            capture.inspectionId,
            capture.roomId,
            capture.filename,
            clientId,
          );
          storagePath = credential.storagePath;
          await queue.setStoragePath(capture.id, leaseId, storagePath);
          if (!credential.alreadyUploaded) {
            if (!await file.exists()) {
              throw const ApiFailure(
                'The file for this photo or video is missing from this phone.',
                null,
              );
            }
            reportEvidenceSync(
              clientId,
              EvidenceSyncStage.uploading,
              progress: 0,
            );
            await backend.putBytes(
              credential.signedUrl!,
              file,
              capture.mimeType,
              clientId,
            );
          }
          prepared = await queue.prepareRegistration(capture.id, leaseId);
        }
        reportEvidenceSync(
          clientId,
          EvidenceSyncStage.registering,
          progress: 1,
        );
        final registered = await backend.registerCapture(
          inspectionId: capture.inspectionId,
          roomId: capture.roomId,
          kind: capture.kind,
          storagePath: storagePath,
          clientId: clientId,
          mimeType: capture.mimeType,
          sizeBytes: capture.sizeBytes,
          durationSec: capture.durationSec,
          note: prepared.registrationNote,
          annotations: _decode(prepared.registrationAnnotations),
        );
        serverId = registered.id;
        await queue.markUploaded(
          capture.id,
          serverId,
          leaseId: leaseId,
          annotationsApplied: registered.annotationsApplied,
        );
      }

      // Snapshot just before each remote hand-over. A concurrent note or annotation
      // edit keeps the row in SQLite and makes the loop send the new version too.
      while (true) {
        if (capture.clientId != null) {
          reportEvidenceSync(
            capture.clientId!,
            EvidenceSyncStage.finalizing,
            progress: 1,
          );
        }
        final current = await queue.byId(capture.id);
        if (current == null || current.leaseId != leaseId) return false;
        if (current.deleteRequested) {
          await backend.deleteCapture(capture.inspectionId, serverId);
        } else {
          // Unchanged late evidence may register after Send for Signature, when
          // report edits are frozen. Only a change since registration needs PATCH.
          if (current.note != current.registrationNote) {
            await backend.updateNote(
              capture.inspectionId,
              serverId,
              current.note,
            );
          }
          final marksNeedSending = current.registrationAnnotationsApplied
              ? current.annotations != current.registrationAnnotations
              : current.annotations != null;
          if (marksNeedSending) {
            await backend.annotate(
              capture.inspectionId,
              serverId,
              _decode(current.annotations),
            );
          }
        }

        final finished = await queue.finishIfUnchanged(current, leaseId);
        if (finished == null) continue;
        await queue.discardFile(root, finished);
        if (capture.clientId != null) {
          reportEvidenceSync(
            capture.clientId!,
            EvidenceSyncStage.complete,
            progress: 1,
          );
        }
        return true;
      }
    } catch (error) {
      if (capture.clientId != null) {
        reportEvidenceSync(capture.clientId!, EvidenceSyncStage.failed);
      }
      await queue.recordFailure(
        capture.id,
        plainError(error),
        leaseId: leaseId,
      );
      return false;
    } finally {
      heartbeat.cancel();
    }
  }

  static Map<String, dynamic>? _decode(String? json) =>
      json == null ? null : jsonDecode(json) as Map<String, dynamic>;
}
