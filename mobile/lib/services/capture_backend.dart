import 'dart:io';

import 'package:background_downloader/background_downloader.dart';
import 'package:dio/dio.dart';

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

  Future<void> finishRoom(String inspectionId, String roomId);
}

class HttpCaptureBackend implements CaptureBackend {
  HttpCaptureBackend(this._dio);

  final Dio _dio;
  static Future<void>? _downloaderReady;

  @override
  Future<({String storagePath, String? signedUrl, bool alreadyUploaded})>
  uploadUrl(
    String inspectionId,
    String roomId,
    String filename,
    String clientId,
  ) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/api/v1/inspections/$inspectionId/rooms/$roomId/upload-url',
      data: {'filename': filename, 'clientId': clientId},
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
    await (_downloaderReady ??= FileDownloader().start(
      autoCleanDatabase: false,
      markDownloadedComplete: false,
    ));
    final downloader = FileDownloader();
    var canNotify = true;
    if (Platform.isAndroid) {
      var permission = await downloader.permissions.status(
        PermissionType.notifications,
      );
      if (permission != PermissionStatus.granted) {
        permission = await downloader.permissions.request(
          PermissionType.notifications,
        );
      }
      canNotify = permission == PermissionStatus.granted;
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
        if (canNotify) TransferHint.userInitiated,
        TransferHint.largeFile,
      },
      notificationConfig: TaskNotificationConfig(
        running: const TaskNotification(
          'Uploading Kivilo evidence',
          '{displayName} · {progress}',
        ),
        progressBar: true,
      ),
      displayName: 'Kivilo evidence',
    );
    final transfer = await downloader.transfers.getOrStart(task);
    final result = await transfer.result;
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
    final response = await _dio.post<Map<String, dynamic>>(
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
  ) => _dio.patch<void>(
    '/api/v1/inspections/$inspectionId/captures/$captureId',
    data: {'note': note},
  );

  @override
  Future<void> annotate(
    String inspectionId,
    String captureId,
    Map<String, dynamic>? annotations,
  ) => _dio.put<void>(
    '/api/v1/inspections/$inspectionId/captures/$captureId/annotations',
    data: {'annotations': annotations},
  );

  @override
  Future<void> deleteCapture(String inspectionId, String captureId) => _dio
      .delete<void>('/api/v1/inspections/$inspectionId/captures/$captureId');

  @override
  Future<void> finishRoom(String inspectionId, String roomId) =>
      _dio.post<void>('/api/v1/inspections/$inspectionId/rooms/$roomId/finish');
}
