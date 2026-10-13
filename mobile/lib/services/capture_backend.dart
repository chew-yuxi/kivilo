import 'dart:async';
import 'dart:io';

import 'package:background_downloader/background_downloader.dart';
import 'package:dio/dio.dart';

import 'api_failure.dart';

const _metadataDeadline = Duration(seconds: 20);

enum EvidenceSyncStage {
  preparing,
  uploading,
  registering,
  finalizing,
  complete,
  failed,
}

class EvidenceSyncUpdate {
  const EvidenceSyncUpdate({
    required this.clientId,
    required this.stage,
    this.progress,
  });

  final String clientId;
  final EvidenceSyncStage stage;
  final double? progress;
}

final _evidenceSyncUpdates = StreamController<EvidenceSyncUpdate>.broadcast();
Stream<EvidenceSyncUpdate> get evidenceSyncUpdates =>
    _evidenceSyncUpdates.stream;

void reportEvidenceSync(
  String clientId,
  EvidenceSyncStage stage, {
  double? progress,
}) {
  _evidenceSyncUpdates.add(
    EvidenceSyncUpdate(clientId: clientId, stage: stage, progress: progress),
  );
}

Future<Response<T>> _metadata<T>(
  Future<Response<T>> Function(CancelToken) request,
  Duration deadline,
) {
  final cancel = CancelToken();
  return request(cancel).timeout(
    deadline,
    onTimeout: () {
      cancel.cancel('Evidence metadata request deadline exceeded');
      throw const ApiFailure(
        'Kivilo did not respond. Check your signal and try again. '
        'Anything you took is saved on this phone.',
        null,
      );
    },
  );
}

/// Everything the uploader needs from the outside world, behind one interface so the
/// hand-over rules can be tested without a network or a phone. Those rules are where the
/// bugs live: what happens when the bytes land but the response does not, or when the
/// inspector types a note while the photo is in flight.
abstract class CaptureBackend {
  Future<({String storagePath, String? signedUrl, bool alreadyUploaded})>
  uploadUrl(
    String inspectionId,
    String roomId,
    String filename,
    String clientId,
  );

  /// Straight from the device to storage with a one-shot credential. A walkthrough is
  /// far past any serverless body cap, and routing evidence through a function would be
  /// slower and no safer.
  Future<void> putBytes(
    String signedUrl,
    File file,
    String mimeType,
    String clientId,
  );

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
  });

  Future<void> updateNote(String inspectionId, String captureId, String? note);

  Future<void> annotate(
    String inspectionId,
    String captureId,
    Map<String, dynamic>? annotations,
  );

  Future<void> deleteCapture(String inspectionId, String captureId);
}

class HttpCaptureBackend implements CaptureBackend {
  HttpCaptureBackend(this._dio, {Duration metadataDeadline = _metadataDeadline})
    : _deadline = metadataDeadline;

  final Dio _dio;
  final Duration _deadline;
  static Future<void>? _downloaderReady;

  static Future<void> _prepareDownloader() async {
    final downloader = FileDownloader();
    if (Platform.isAndroid) {
      final configured = await downloader.configure(
        androidConfig: (Config.runInForeground, Config.always),
      );
      if (configured.any((item) => item.$2.isNotEmpty)) {
        throw StateError(
          'Could not enable foreground media uploads: $configured',
        );
      }
    }
    await downloader.start(
      autoCleanDatabase: false,
      markDownloadedComplete: false,
    );
  }

  @override
  Future<({String storagePath, String? signedUrl, bool alreadyUploaded})>
  uploadUrl(
    String inspectionId,
    String roomId,
    String filename,
    String clientId,
  ) async {
    final response = await _metadata(
      (cancel) => _dio.post<Map<String, dynamic>>(
        '/api/v1/inspections/$inspectionId/rooms/$roomId/upload-url',
        data: {'filename': filename, 'clientId': clientId},
        cancelToken: cancel,
      ),
      _deadline,
    );
    return (
      storagePath: response.data!['storagePath'] as String,
      signedUrl: response.data!['signedUrl'] as String?,
      alreadyUploaded: response.data!['alreadyUploaded'] as bool,
    );
  }

  @override
  Future<void> putBytes(
    String signedUrl,
    File file,
    String mimeType,
    String clientId,
  ) async {
    // Native URLSession / WorkManager owns the transfer after enqueue. Its persistent
    // task record lets the next launch recognize a completed upload even if Dart never
    // received the response. A new credential is requested only after a failed task.
    await (_downloaderReady ??= _prepareDownloader());
    final downloader = FileDownloader();
    if (Platform.isAndroid) {
      if (await downloader.permissions.status(PermissionType.notifications) !=
          PermissionStatus.granted) {
        await downloader.permissions.request(PermissionType.notifications);
      }
    }
    final previous = await downloader.database.recordForId(clientId);
    // The authorized upload-url endpoint has just checked that the object is absent.
    // An old local "complete" record cannot prove otherwise, so retry its path.
    if (previous != null && previous.status.isFinalState) {
      downloader.transfers.remove(clientId);
      await downloader.database.deleteRecordWithId(clientId);
    }

    final (baseDirectory, directory, filename) = await Task.split(
      filePath: file.path,
    );
    final task = UploadTask(
      taskId: clientId,
      url: signedUrl,
      filename: filename,
      directory: directory,
      baseDirectory: baseDirectory,
      httpRequestMethod: 'PUT',
      mimeType: mimeType,
      // Supabase's signed upload endpoint expects multipart with an unnamed file
      // field, just like storage_client.uploadToSignedUrl. The native plugin streams
      // it from disk, so a ten-minute video is never loaded into Dart memory.
      fileField: '',
      fields: {'cacheControl': '3600'},
      headers: {'x-upsert': 'false'},
      transferHints: {
        // Android's plugin UIDT path can miss JobService's 10-second mandatory
        // notification deadline during a queued burst. Foreground WorkManager
        // keeps long uploads alive without that UIDT startup deadline.
        if (!Platform.isAndroid) TransferHint.userInitiated,
        TransferHint.largeFile,
      },
      notificationConfig: TaskNotificationConfig(
        running: const TaskNotification(
          'Uploading Kivilo media',
          '{displayName} · {progress}',
        ),
        progressBar: true,
      ),
      displayName: 'Kivilo media',
      updates: Updates.statusAndProgress,
    );
    final transfer = await downloader.transfers.getOrStart(task);
    final progress = transfer.progressUpdates.listen((update) {
      if (update.progress >= 0 && update.progress <= 1) {
        reportEvidenceSync(
          clientId,
          EvidenceSyncStage.uploading,
          progress: update.progress,
        );
      }
    });
    late final TaskStatusUpdate result;
    try {
      result = await transfer.result;
    } finally {
      await progress.cancel();
    }
    if (result.status != TaskStatus.complete) {
      throw StateError(
        'Upload ${result.status.name}: ${result.exception ?? result.responseStatusCode ?? 'retry later'}',
      );
    }
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
    final response = await _metadata(
      (cancel) => _dio.post<Map<String, dynamic>>(
        '/api/v1/inspections/$inspectionId/rooms/$roomId/captures',
        data: {
          'kind': kind,
          'storagePath': storagePath,
          'clientId': clientId,
          'mimeType': mimeType,
          'sizeBytes': sizeBytes,
          'durationSec': durationSec,
          'note': note,
          'annotations': annotations,
        },
        cancelToken: cancel,
      ),
      _deadline,
    );
    return (
      id: response.data!['id'] as String,
      annotationsApplied: response.data!['annotationsApplied'] as bool,
    );
  }

  @override
  Future<void> updateNote(
    String inspectionId,
    String captureId,
    String? note,
  ) async => _metadata(
    (cancel) => _dio.patch<void>(
      '/api/v1/inspections/$inspectionId/captures/$captureId',
      data: {'note': note},
      cancelToken: cancel,
    ),
    _deadline,
  );

  @override
  Future<void> annotate(
    String inspectionId,
    String captureId,
    Map<String, dynamic>? annotations,
  ) async => _metadata(
    (cancel) => _dio.put<void>(
      '/api/v1/inspections/$inspectionId/captures/$captureId/annotations',
      data: {'annotations': annotations},
      cancelToken: cancel,
    ),
    _deadline,
  );

  @override
  Future<void> deleteCapture(String inspectionId, String captureId) async =>
      _metadata(
        (cancel) => _dio.delete<void>(
          '/api/v1/inspections/$inspectionId/captures/$captureId',
          cancelToken: cancel,
        ),
        _deadline,
      );
}

/// Routes the shared durable evidence queue without teaching it about product domains.
/// Maintenance rows use a namespaced owner id and otherwise keep the exact same lease,
/// retry and hand-over rules as inspection captures.
class RoutingEvidenceBackend implements CaptureBackend {
  RoutingEvidenceBackend(Dio dio)
    : _captures = HttpCaptureBackend(dio),
      _maintenance = HttpMaintenanceEvidenceBackend(dio);

  final HttpCaptureBackend _captures;
  final HttpMaintenanceEvidenceBackend _maintenance;

  bool _isMaintenance(String ownerId) => ownerId.startsWith('maintenance:');
  CaptureBackend _for(String ownerId) =>
      _isMaintenance(ownerId) ? _maintenance : _captures;

  @override
  Future<({bool alreadyUploaded, String? signedUrl, String storagePath})>
  uploadUrl(
    String inspectionId,
    String roomId,
    String filename,
    String clientId,
  ) => _for(inspectionId).uploadUrl(inspectionId, roomId, filename, clientId);

  @override
  Future<void> putBytes(
    String signedUrl,
    File file,
    String mimeType,
    String clientId,
  ) => _captures.putBytes(signedUrl, file, mimeType, clientId);

  @override
  Future<({bool annotationsApplied, String id})> registerCapture({
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
  }) => _for(inspectionId).registerCapture(
    inspectionId: inspectionId,
    roomId: roomId,
    kind: kind,
    storagePath: storagePath,
    clientId: clientId,
    mimeType: mimeType,
    sizeBytes: sizeBytes,
    durationSec: durationSec,
    note: note,
    annotations: annotations,
  );

  @override
  Future<void> updateNote(
    String inspectionId,
    String captureId,
    String? note,
  ) => _for(inspectionId).updateNote(inspectionId, captureId, note);
  @override
  Future<void> annotate(
    String inspectionId,
    String captureId,
    Map<String, dynamic>? annotations,
  ) => _for(inspectionId).annotate(inspectionId, captureId, annotations);
  @override
  Future<void> deleteCapture(String inspectionId, String captureId) =>
      _for(inspectionId).deleteCapture(inspectionId, captureId);
}

class HttpMaintenanceEvidenceBackend implements CaptureBackend {
  HttpMaintenanceEvidenceBackend(this._dio);
  final Dio _dio;

  String _caseId(String ownerId) => ownerId.substring('maintenance:'.length);
  ({String purpose, String? visitId}) _target(String roomId) {
    final parts = roomId.split('|');
    return (purpose: parts.first, visitId: parts.length > 1 ? parts[1] : null);
  }

  @override
  Future<({bool alreadyUploaded, String? signedUrl, String storagePath})>
  uploadUrl(
    String inspectionId,
    String roomId,
    String filename,
    String clientId,
  ) async {
    final response = await _metadata(
      (cancel) => _dio.post<Map<String, dynamic>>(
        '/api/v1/maintenance/${_caseId(inspectionId)}/upload-url',
        data: {
          'clientId': clientId,
          'purpose': _target(roomId).purpose,
          'visitId': _target(roomId).visitId,
          'mimeType': 'image/jpeg',
        },
        cancelToken: cancel,
      ),
      _metadataDeadline,
    );
    final data = response.data!;
    if (data['alreadyRegistered'] == true) {
      return (
        storagePath: data['storagePath'] as String,
        signedUrl: null,
        alreadyUploaded: true,
      );
    }
    return (
      storagePath: data['storagePath'] as String,
      signedUrl: data['signedUrl'] as String?,
      alreadyUploaded: data['alreadyUploaded'] == true,
    );
  }

  @override
  Future<void> putBytes(
    String signedUrl,
    File file,
    String mimeType,
    String clientId,
  ) => HttpCaptureBackend(_dio).putBytes(signedUrl, file, mimeType, clientId);

  @override
  Future<({bool annotationsApplied, String id})> registerCapture({
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
    final target = _target(roomId);
    final response = await _metadata(
      (cancel) => _dio.post<Map<String, dynamic>>(
        '/api/v1/maintenance/${_caseId(inspectionId)}/evidence',
        data: {
          'clientId': clientId,
          'purpose': target.purpose,
          'visitId': target.visitId,
          'storagePath': storagePath,
          'mimeType': mimeType,
          'sizeBytes': sizeBytes,
          'note': note,
        },
        cancelToken: cancel,
      ),
      _metadataDeadline,
    );
    return (id: response.data!['id'] as String, annotationsApplied: true);
  }

  Never _immutable() => throw StateError('Maintenance evidence is immutable.');
  @override
  Future<void> updateNote(
    String inspectionId,
    String captureId,
    String? note,
  ) async => _immutable();
  @override
  Future<void> annotate(
    String inspectionId,
    String captureId,
    Map<String, dynamic>? annotations,
  ) async => _immutable();
  @override
  Future<void> deleteCapture(String inspectionId, String captureId) async =>
      _immutable();
}
