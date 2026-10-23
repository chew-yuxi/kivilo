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
    String clientId, {
    String? mimeType,
    int? sizeBytes,
  });

  /// Straight from the device to storage with a one-shot credential. A walkthrough is
  /// far past any serverless body cap, and routing evidence through a function would be
  /// slower and no safer.
  Future<void> putBytes(
    String signedUrl,
    File file,
    String mimeType,
    String clientId,
  );

  Future<({String id, bool annotationsApplied, bool itemApplied})>
  registerCapture({
    required String inspectionId,
    required String roomId,
    required String kind,
    required String storagePath,
    required String clientId,
    required String mimeType,
    required int sizeBytes,
    int? durationSec,
    String? itemId,
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
    String clientId, {
    String? mimeType,
    int? sizeBytes,
  }) async {
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
      // Losing signal mid-upload is not a fault. Say so in the words every other lost
      // connection uses, which also keeps it out of the error reports.
      if (result.exception is TaskConnectionException) {
        throw ApiFailure.noConnection;
      }
      throw StateError(
        'Upload ${result.status.name}: ${result.exception ?? result.responseStatusCode ?? 'retry later'}',
      );
    }
  }

  @override
  Future<({String id, bool annotationsApplied, bool itemApplied})>
  registerCapture({
    required String inspectionId,
    required String roomId,
    required String kind,
    required String storagePath,
    required String clientId,
    required String mimeType,
    required int sizeBytes,
    int? durationSec,
    String? itemId,
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
          'itemId': ?itemId,
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
      // Older servers cannot promise an item link they do not understand.
      itemApplied: response.data!['itemApplied'] == true || itemId == null,
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
/// Maintenance and report-update rows use a namespaced owner id and otherwise keep the
/// exact same lease, retry and hand-over rules as inspection captures.
class RoutingEvidenceBackend implements CaptureBackend {
  RoutingEvidenceBackend(Dio dio)
    : _captures = HttpCaptureBackend(dio),
      _maintenance = HttpMaintenanceEvidenceBackend(dio),
      _addenda = HttpAddendumPhotoBackend(dio),
      _findings = HttpFindingPhotoBackend(dio),
      _documents = HttpSupportingDocumentBackend(dio);

  final HttpCaptureBackend _captures;
  final HttpMaintenanceEvidenceBackend _maintenance;
  final HttpAddendumPhotoBackend _addenda;
  final HttpFindingPhotoBackend _findings;
  final HttpSupportingDocumentBackend _documents;

  void bindOwner(String ownerId) {
    _findings.bindOwner(ownerId);
    _documents.bindOwner(ownerId);
  }

  CaptureBackend _for(String ownerId) => ownerId.startsWith('maintenance:')
      ? _maintenance
      : ownerId.startsWith(addendumQueueOwnerPrefix)
      ? _addenda
      : ownerId.startsWith('finding-draft:') || ownerId.startsWith('finding:')
      ? _findings
      : ownerId.startsWith(supportingDocumentQueuePrefix)
      ? _documents
      : _captures;

  @override
  Future<({bool alreadyUploaded, String? signedUrl, String storagePath})>
  uploadUrl(
    String inspectionId,
    String roomId,
    String filename,
    String clientId, {
    String? mimeType,
    int? sizeBytes,
  }) => _for(inspectionId).uploadUrl(
    inspectionId, roomId, filename, clientId,
    mimeType: mimeType, sizeBytes: sizeBytes,
  );

  @override
  Future<void> putBytes(
    String signedUrl,
    File file,
    String mimeType,
    String clientId,
  ) => _captures.putBytes(signedUrl, file, mimeType, clientId);

  @override
  Future<({bool annotationsApplied, bool itemApplied, String id})>
  registerCapture({
    required String inspectionId,
    required String roomId,
    required String kind,
    required String storagePath,
    required String clientId,
    required String mimeType,
    required int sizeBytes,
    int? durationSec,
    String? itemId,
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
    itemId: itemId,
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

const supportingDocumentQueuePrefix = 'supporting-documents:';
const agreementQueueTarget = 'agreement';
const supportingDocumentPickerFilename = 'supporting-document-picker.json';

/// An optional tenancy document stays outside room evidence and the signed report.
/// Its generated display name remains identical when a registration is retried.
class HttpSupportingDocumentBackend implements CaptureBackend {
  HttpSupportingDocumentBackend(this._dio);
  final Dio _dio;
  String? _ownerId;

  void bindOwner(String ownerId) {
    if (_ownerId != null && _ownerId != ownerId) {
      throw StateError('Uploader account changed.');
    }
    _ownerId = ownerId;
  }

  void _guardOwner() {
    final current = _dio.options.extra['currentOwnerId'];
    if (_ownerId != null &&
        current is String? Function() &&
        current() != _ownerId) {
      throw const ApiFailure('Account changed. Open this page again.', 401);
    }
  }

  Options get _options => Options(extra: {'expectedOwnerId': ?_ownerId});
  Future<String> _base(String owner, String requestId) async {
    final tenancyId = owner.substring(supportingDocumentQueuePrefix.length);
    final documents = '/api/v1/tenancies/$tenancyId/documents';
    if (requestId == agreementQueueTarget) {
      // Photos can be taken before this tenancy has an agreement slot, including
      // offline. The server resolves the same unique slot on every queue retry.
      final prepared = await _metadata(
        (cancel) => _dio.post<Map<String, dynamic>>(
          '$documents/agreement',
          data: const <String, dynamic>{},
          options: _options,
          cancelToken: cancel,
        ),
        _metadataDeadline,
      );
      _guardOwner();
      requestId =
          (prepared.data!['agreement'] as Map<String, dynamic>)['requestId']
              as String;
    }
    return '$documents/$requestId';
  }

  Map<String, dynamic> _metadataBody(
    String clientId,
    String mimeType,
    int sizeBytes,
  ) {
    final extension = switch (mimeType) {
      'image/png' => 'png',
      'image/webp' => 'webp',
      'image/jpeg' => 'jpg',
      _ => throw StateError('Unsupported document photo type.'),
    };
    return {
      'clientId': clientId,
      'fileName': 'Document photo ${clientId.substring(0, 8)}.$extension',
      'mimeType': mimeType,
      'byteSize': sizeBytes,
    };
  }

  @override
  Future<({String storagePath, String? signedUrl, bool alreadyUploaded})>
  uploadUrl(
    String inspectionId,
    String roomId,
    String filename,
    String clientId, {
    String? mimeType,
    int? sizeBytes,
  }) async {
    _guardOwner();
    if (mimeType == null || sizeBytes == null) {
      throw StateError('Document upload metadata is missing.');
    }
    final base = await _base(inspectionId, roomId);
    final response = await _metadata(
      (cancel) => _dio.post<Map<String, dynamic>>(
        '$base/upload-url',
        data: _metadataBody(clientId, mimeType, sizeBytes),
        options: _options,
        cancelToken: cancel,
      ),
      _metadataDeadline,
    );
    final data = response.data!;
    return (
      storagePath: data['storagePath'] as String,
      signedUrl: data['signedUrl'] as String?,
      alreadyUploaded:
          data['alreadyUploaded'] == true || data['alreadyRegistered'] == true,
    );
  }

  @override
  Future<void> putBytes(
    String signedUrl,
    File file,
    String mimeType,
    String clientId,
  ) {
    _guardOwner();
    return HttpCaptureBackend(_dio)
        .putBytes(signedUrl, file, mimeType, clientId);
  }

  @override
  Future<({String id, bool annotationsApplied, bool itemApplied})>
  registerCapture({
    required String inspectionId,
    required String roomId,
    required String kind,
    required String storagePath,
    required String clientId,
    required String mimeType,
    required int sizeBytes,
    int? durationSec,
    String? itemId,
    String? note,
    Map<String, dynamic>? annotations,
  }) async {
    _guardOwner();
    final base = await _base(inspectionId, roomId);
    final response = await _metadata(
      (cancel) => _dio.post<Map<String, dynamic>>(
        '$base/files',
        data: _metadataBody(clientId, mimeType, sizeBytes),
        options: _options,
        cancelToken: cancel,
      ),
      _metadataDeadline,
    );
    return (
      id: response.data!['id'] as String,
      annotationsApplied: true,
      itemApplied: true,
    );
  }

  Never _immutable() =>
      throw StateError('Submitted supporting documents are immutable.');
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
    String clientId, {
    String? mimeType,
    int? sizeBytes,
  }) async {
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
  Future<({bool annotationsApplied, bool itemApplied, String id})>
  registerCapture({
    required String inspectionId,
    required String roomId,
    required String kind,
    required String storagePath,
    required String clientId,
    required String mimeType,
    required int sizeBytes,
    int? durationSec,
    String? itemId,
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
    return (
      id: response.data!['id'] as String,
      annotationsApplied: true,
      itemApplied: true,
    );
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

/// Queue rows for a photo on a draft report update: `addendum:<addendumId>` as the owner,
/// the entry id as the room.
const addendumQueueOwnerPrefix = 'addendum:';

/// The storage type of a queued update photo, from the file name the store gave it. The
/// server accepts JPEG, PNG and WebP, and the app only queues those.
String addendumPhotoMimeType(String filename) {
  final name = filename.toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

/// Photos on a draft update to a signed report, through the same endpoints the web uses.
/// Like maintenance evidence, a registered photo is not edited; it is removed from the
/// draft through the API instead.
class HttpAddendumPhotoBackend implements CaptureBackend {
  HttpAddendumPhotoBackend(this._dio);
  final Dio _dio;

  String _addendumId(String ownerId) =>
      ownerId.substring(addendumQueueOwnerPrefix.length);

  @override
  Future<({bool alreadyUploaded, String? signedUrl, String storagePath})>
  uploadUrl(
    String inspectionId,
    String roomId,
    String filename,
    String clientId, {
    String? mimeType,
    int? sizeBytes,
  }) async {
    final response = await _metadata(
      (cancel) => _dio.post<Map<String, dynamic>>(
        '/api/v1/addenda/${_addendumId(inspectionId)}/entries/$roomId/upload-url',
        data: {
          'clientId': clientId,
          'mimeType': addendumPhotoMimeType(filename),
        },
        cancelToken: cancel,
      ),
      _metadataDeadline,
    );
    final signedUrl = response.data!['signedUrl'] as String?;
    return (
      storagePath: response.data!['storagePath'] as String,
      signedUrl: signedUrl,
      alreadyUploaded: signedUrl == null,
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
  Future<({bool annotationsApplied, bool itemApplied, String id})>
  registerCapture({
    required String inspectionId,
    required String roomId,
    required String kind,
    required String storagePath,
    required String clientId,
    required String mimeType,
    required int sizeBytes,
    int? durationSec,
    String? itemId,
    String? note,
    Map<String, dynamic>? annotations,
  }) async {
    final response = await _metadata(
      (cancel) => _dio.post<Map<String, dynamic>>(
        '/api/v1/addenda/${_addendumId(inspectionId)}/entries/$roomId/photos',
        data: {
          'clientId': clientId,
          'mimeType': mimeType,
          'storagePath': storagePath,
          'sizeBytes': sizeBytes,
          'note': note,
        },
        cancelToken: cancel,
      ),
      _metadataDeadline,
    );
    return (
      id: response.data!['id'] as String,
      annotationsApplied: true,
      itemApplied: true,
    );
  }

  Never _immutable() => throw StateError(
    'An update photo is removed from the draft, not edited.',
  );
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

/// Finding originals use the same durable uploader as room captures. The namespace
/// retains the draft and optional existing finding across process death/retries.
class HttpFindingPhotoBackend implements CaptureBackend {
  HttpFindingPhotoBackend(this._dio);
  final Dio _dio;
  String? _ownerId;
  void bindOwner(String ownerId) {
    if (_ownerId != null && _ownerId != ownerId) {
      throw StateError('Uploader account changed.');
    }
    _ownerId = ownerId;
  }

  Options get _options =>
      Options(extra: {if (_ownerId != null) 'expectedOwnerId': _ownerId});
  void _guardOwner() {
    final current = _dio.options.extra['currentOwnerId'];
    if (_ownerId != null &&
        current is String? Function() &&
        current() != _ownerId) {
      throw const ApiFailure('Account changed. Open this page again.', 401);
    }
  }

  String _base(String owner) {
    final parts = owner.split(':');
    if (parts[0] == 'finding-draft' && parts.length >= 3) {
      return '/api/v1/inspections/${parts[1]}/finding-photo-drafts/${parts[2]}';
    }
    if (parts[0] == 'finding' && parts.length == 3) {
      return '/api/v1/inspections/${parts[1]}/findings/${parts[2]}';
    }
    throw StateError('Invalid finding photo owner');
  }

  @override
  Future<({String storagePath, String? signedUrl, bool alreadyUploaded})>
  uploadUrl(
    String inspectionId,
    String roomId,
    String filename,
    String clientId, {
    String? mimeType,
    int? sizeBytes,
  }) async {
    _guardOwner();
    final parts = inspectionId.split(':');
    final response = await _metadata(
      (cancel) => _dio.post<Map<String, dynamic>>(
        '${_base(inspectionId)}/upload-url',
        data: {
          'clientId': clientId,
          'mimeType': addendumPhotoMimeType(filename),
          if (parts.length > 3) 'findingId': parts[3],
        },
        cancelToken: cancel,
        options: _options,
      ),
      _metadataDeadline,
    );
    final data = response.data!;
    return (
      storagePath: data['storagePath'] as String,
      signedUrl: data['signedUrl'] as String?,
      alreadyUploaded:
          data['alreadyUploaded'] == true || data['alreadyRegistered'] == true,
    );
  }

  @override
  Future<void> putBytes(
    String signedUrl,
    File file,
    String mimeType,
    String clientId,
  ) async {
    _guardOwner();
    await HttpCaptureBackend(
      _dio,
    ).putBytes(signedUrl, file, mimeType, clientId);
  }

  @override
  Future<({String id, bool annotationsApplied, bool itemApplied})>
  registerCapture({
    required String inspectionId,
    required String roomId,
    required String kind,
    required String storagePath,
    required String clientId,
    required String mimeType,
    required int sizeBytes,
    int? durationSec,
    String? itemId,
    String? note,
    Map<String, dynamic>? annotations,
  }) async {
    _guardOwner();
    final response = await _metadata(
      (cancel) => _dio.post<Map<String, dynamic>>(
        '${_base(inspectionId)}/photos',
        data: {
          'clientId': clientId,
          'storagePath': storagePath,
          'mimeType': mimeType,
          'sizeBytes': sizeBytes,
          'note': note,
          'annotations': annotations,
        },
        cancelToken: cancel,
        options: _options,
      ),
      _metadataDeadline,
    );
    return (
      id: response.data!['id'] as String,
      annotationsApplied: response.data!['annotationsApplied'] == true,
      itemApplied: true,
    );
  }

  Future<void> _patch(
    String owner,
    String id,
    Map<String, dynamic> fields,
  ) async {
    _guardOwner();
    await _metadata(
      (cancel) => _dio.patch(
        '${_base(owner)}/photos/$id',
        data: fields,
        cancelToken: cancel,
        options: _options,
      ),
      _metadataDeadline,
    );
  }

  @override
  Future<void> updateNote(
    String inspectionId,
    String captureId,
    String? note,
  ) => _patch(inspectionId, captureId, {'note': note});

  @override
  Future<void> annotate(
    String inspectionId,
    String captureId,
    Map<String, dynamic>? annotations,
  ) => _patch(inspectionId, captureId, {'annotations': annotations});

  @override
  Future<void> deleteCapture(String inspectionId, String captureId) async {
    _guardOwner();
    await _metadata(
      (cancel) => _dio.delete(
        '${_base(inspectionId)}/photos/$captureId',
        cancelToken: cancel,
        options: _options,
      ),
      _metadataDeadline,
    );
  }
}
