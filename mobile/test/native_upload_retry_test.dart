import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:background_downloader/background_downloader.dart';
import 'package:dio/dio.dart';
import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/services/api_failure.dart';
import 'package:kivilo/services/capture_backend.dart';
import 'package:kivilo/services/capture_queue.dart';
import 'package:kivilo/services/error_reporter.dart';
import 'package:kivilo/services/uploader.dart';

/// Real plugin transfer tracking without its disk database or native worker.
class _TransferStorage implements PersistentStorage {
  final records = <String, TaskRecord>{};

  @override
  Future<void> initialize() async {}
  @override
  (String, int) get currentDatabaseVersion => ('', 0);
  @override
  Future<(String, int)> get storedDatabaseVersion async => ('', 0);
  @override
  Future<void> storeTaskRecord(TaskRecord record) async {
    records[record.taskId] = record;
  }

  @override
  Future<TaskRecord?> retrieveTaskRecord(String taskId) async =>
      records[taskId];
  @override
  Future<List<TaskRecord>> retrieveAllTaskRecords() async =>
      records.values.toList();
  @override
  Future<void> removeTaskRecord(String? taskId) async {
    if (taskId == null) {
      records.clear();
    } else {
      records.remove(taskId);
    }
  }

  @override
  Future<void> storePausedTask(Task task) async =>
      throw StateError('This test does not pause transfers');
  @override
  Future<void> storeResumeData(ResumeData resumeData) async =>
      throw StateError('This test does not resume partial transfers');
  @override
  Future<void> removePausedTask(String? taskId) async {}
  @override
  Future<void> removeResumeData(String? taskId) async {}
  @override
  Future<List<Task>> retrieveAllPausedTasks() async => [];
  @override
  Future<List<ResumeData>> retrieveAllResumeData() async => [];
  @override
  Future<Task?> retrievePausedTask(String taskId) async => null;
  @override
  Future<ResumeData?> retrieveResumeData(String taskId) async => null;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  final storage = _TransferStorage();
  final nativeTasks = <UploadTask>[];
  late TaskStatusUpdate Function(UploadTask) nativeResult;
  late Directory suiteRoot;
  late Directory root;
  late CaptureQueue queue;
  late Dio dio;
  late HttpCaptureBackend backend;
  late ErrorReporter reporter;
  final credentials = <Map<String, dynamic>>[];
  final registrations = <Map<String, dynamic>>[];
  final registeredIds = <String, String>{};
  final errorReports = <Map<String, dynamic>>[];
  var stored = false;
  var loseRegistrationResponse = false;
  var sequence = 0;

  setUpAll(() async {
    suiteRoot = await Directory.systemTemp.createTemp('kivilo-native-upload-');
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    messenger.setMockMethodCallHandler(
      const MethodChannel('plugins.flutter.io/path_provider'),
      (_) async => suiteRoot.path,
    );
    messenger.setMockMethodCallHandler(
      const MethodChannel('dev.fluttercommunity.plus/connectivity'),
      (_) async => ['wifi'],
    );
    messenger.setMockMethodCallHandler(
      const MethodChannel('dev.fluttercommunity.plus/connectivity_status'),
      (_) async => null,
    );
    messenger.setMockMethodCallHandler(
      const MethodChannel('com.bbflight.background_downloader'),
      (call) async {
        switch (call.method) {
          case 'enqueue':
            final task = UploadTask.fromJson(
              jsonDecode(call.arguments[0] as String) as Map<String, dynamic>,
            );
            nativeTasks.add(task);
            // Deliver the actual plugin result after enqueue returns, as the
            // Android worker does. HttpCaptureBackend still owns task creation,
            // transfer registration, result handling and durable retry behavior.
            unawaited(
              Future<void>(() {
                FileDownloader().downloaderForTesting.processStatusUpdate(
                  nativeResult(task),
                );
              }),
            );
            return true;
          case 'allTasks':
            return <dynamic>[];
          case 'popResumeData':
          case 'popStatusUpdates':
          case 'popProgressUpdates':
            return '{}';
          case 'reset':
            return 0;
          case 'platformVersion':
            return '34';
          case 'cancelTasksWithIds':
            return true;
          default:
            return null;
        }
      },
    );
    await FileDownloader(persistentStorage: storage).ready;
  });

  tearDownAll(() async {
    FileDownloader().destroy();
    debugDefaultTargetPlatformOverride = null;
    for (final channel in [
      'plugins.flutter.io/path_provider',
      'dev.fluttercommunity.plus/connectivity',
      'dev.fluttercommunity.plus/connectivity_status',
      'com.bbflight.background_downloader',
    ]) {
      messenger.setMockMethodCallHandler(MethodChannel(channel), null);
    }
    await suiteRoot.delete(recursive: true);
  });

  setUp(() async {
    root = await suiteRoot.createTemp('case-');
    queue = CaptureQueue(NativeDatabase.memory());
    FileDownloader().transfers.clear();
    storage.records.clear();
    nativeTasks.clear();
    credentials.clear();
    registrations.clear();
    registeredIds.clear();
    errorReports.clear();
    stored = false;
    loseRegistrationResponse = false;
    nativeResult = (task) {
      stored = true;
      return TaskStatusUpdate(task, TaskStatus.complete);
    };
    dio = Dio(BaseOptions(baseUrl: 'https://api.example.invalid'));
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final body = Map<String, dynamic>.from(options.data as Map);
          if (options.path.endsWith('/upload-url')) {
            credentials.add(body);
            handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: {
                  'storagePath': 'room-1/${body['clientId']}.jpg',
                  'signedUrl': stored
                      ? null
                      : 'https://storage.example.invalid/upload/${credentials.length}',
                  'alreadyUploaded': stored,
                },
              ),
            );
          } else if (options.path.endsWith('/captures')) {
            registrations.add(body);
            final id = registeredIds.putIfAbsent(
              body['clientId'] as String,
              () => 'capture-${registeredIds.length + 1}',
            );
            if (loseRegistrationResponse) {
              loseRegistrationResponse = false;
              handler.reject(
                DioException(
                  requestOptions: options,
                  type: DioExceptionType.connectionError,
                ),
              );
            } else {
              handler.resolve(
                Response(
                  requestOptions: options,
                  statusCode: 200,
                  data: {
                    'id': id,
                    'annotationsApplied': true,
                    'itemApplied': true,
                  },
                ),
              );
            }
          } else if (options.path == '/api/v1/errors') {
            errorReports.addAll(
              (body['errors'] as List).cast<Map<String, dynamic>>(),
            );
            handler.resolve(
              Response(requestOptions: options, statusCode: 200, data: {}),
            );
          } else {
            handler.reject(
              DioException(
                requestOptions: options,
                error: StateError('Unexpected test request: ${options.path}'),
              ),
            );
          }
        },
      ),
    );
    backend = HttpCaptureBackend(dio);
    reporter = ErrorReporter(
      dio: dio,
      file: File('${root.path}/errors.json'),
      source: 'ANDROID',
      release: 'native-transfer-test',
    );
    ErrorReporter.current = reporter;
  });

  tearDown(() async {
    await pumpEventQueue();
    await reporter.flush();
    ErrorReporter.current = null;
    await queue.close();
    dio.close();
    await root.delete(recursive: true);
  });

  Future<({int id, String clientId, File file})> queued() async {
    final clientId = 'native-client-${++sequence}';
    final file = File('${root.path}/captures/$clientId.jpg');
    await file.parent.create(recursive: true);
    await file.writeAsBytes([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]);
    final id = await queue.enqueue(
      PendingCapturesCompanion.insert(
        ownerId: const Value('owner-1'),
        clientId: Value(clientId),
        inspectionId: 'inspection-1',
        roomId: 'room-1',
        itemId: const Value('item-1'),
        kind: 'PHOTO',
        relativePath: 'captures/$clientId.jpg',
        filename: '$clientId.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: await file.length(),
        createdAt: DateTime(2026, 10, 27),
        note: const Value('Keep this evidence'),
      ),
    );
    return (id: id, clientId: clientId, file: file);
  }

  Uploader uploader() =>
      Uploader(queue: queue, backend: backend, root: root, ownerId: 'owner-1');

  for (final status in [408, 429, 500, 502, 503, 504]) {
    test(
      'native HTTP $status is retryable without a programmer error report',
      () async {
        final capture = await queued();
        nativeResult = (task) => TaskStatusUpdate(
          task,
          TaskStatus.failed,
          TaskHttpException('Storage failed', status),
        );
        await expectLater(
          backend.putBytes(
            'https://storage.example.invalid/upload',
            capture.file,
            'image/jpeg',
            capture.clientId,
          ),
          throwsA(
            isA<ApiFailure>()
                .having((e) => e.statusCode, 'HTTP status', status)
                .having(
                  (e) => e.message,
                  'retry guidance',
                  contains('saved on this phone'),
                )
                .having(ErrorReporter.isBug, 'reported as a bug', isFalse),
          ),
        );
        expect(nativeTasks.single.taskId, capture.clientId);
        expect(await capture.file.exists(), isTrue);
      },
    );
  }

  test(
    'native response code also classifies a storage gateway timeout',
    () async {
      final capture = await queued();
      nativeResult = (task) =>
          TaskStatusUpdate(task, TaskStatus.failed, null, null, null, 504);
      await expectLater(
        backend.putBytes(
          'https://storage.example.invalid/upload',
          capture.file,
          'image/jpeg',
          capture.clientId,
        ),
        throwsA(
          isA<ApiFailure>().having((e) => e.statusCode, 'HTTP status', 504),
        ),
      );
    },
  );

  test(
    'unknown exception code falls back to the native HTTP response code',
    () async {
      final capture = await queued();
      nativeResult = (task) => TaskStatusUpdate(
        task,
        TaskStatus.failed,
        TaskHttpException('Storage failed', -1),
        null,
        null,
        504,
      );
      await expectLater(
        backend.putBytes(
          'https://storage.example.invalid/upload',
          capture.file,
          'image/jpeg',
          capture.clientId,
        ),
        throwsA(
          isA<ApiFailure>().having((e) => e.statusCode, 'HTTP status', 504),
        ),
      );
    },
  );

  test(
    'native 504 retains bytes and ownership, then retries with a fresh credential',
    () async {
      final capture = await queued();
      final bytes = await capture.file.readAsBytes();
      nativeResult = (task) => TaskStatusUpdate(
        task,
        TaskStatus.failed,
        TaskHttpException('Gateway timeout', 504),
      );
      final uploads = uploader();
      expect(await uploads.drain(), isFalse);
      final pending = (await queue.byId(capture.id))!;
      expect(pending.clientId, capture.clientId);
      expect(pending.ownerId, 'owner-1');
      expect(pending.itemId, 'item-1');
      expect(pending.note, 'Keep this evidence');
      expect(pending.attempts, 1);
      expect(pending.claimedAt, isNull);
      expect(pending.leaseId, isNull);
      expect(pending.registrationPrepared, isFalse);
      expect(pending.lastError, contains('temporarily delayed'));
      expect(await capture.file.readAsBytes(), bytes);
      expect(registrations, isEmpty);
      await reporter.flush();
      expect(errorReports, isEmpty);

      nativeResult = (task) {
        stored = true;
        return TaskStatusUpdate(task, TaskStatus.complete);
      };
      expect(await uploads.drain(), isTrue);
      expect(credentials.map((body) => body['clientId']), [
        capture.clientId,
        capture.clientId,
      ]);
      expect(nativeTasks.map((task) => task.taskId), [
        capture.clientId,
        capture.clientId,
      ]);
      expect(nativeTasks.map((task) => task.url), [
        'https://storage.example.invalid/upload/1',
        'https://storage.example.invalid/upload/2',
      ]);
      expect(registeredIds, {capture.clientId: 'capture-1'});
      expect(registrations.single['itemId'], 'item-1');
      expect(registrations.single['note'], 'Keep this evidence');
      expect(await queue.byId(capture.id), isNull);
      expect(await capture.file.exists(), isFalse);
    },
  );

  test(
    '504 after storage accepted bytes never uploads twice or duplicates registration',
    () async {
      final capture = await queued();
      nativeResult = (task) {
        stored =
            true; // The gateway lost the response after storage accepted it.
        return TaskStatusUpdate(
          task,
          TaskStatus.failed,
          TaskHttpException('Gateway timeout', 504),
        );
      };
      final uploads = uploader();
      expect(await uploads.drain(), isFalse);
      expect(await capture.file.exists(), isTrue);

      loseRegistrationResponse = true;
      expect(await uploads.drain(), isFalse);
      expect(nativeTasks, hasLength(1));
      expect(credentials, hasLength(2));
      expect((await queue.byId(capture.id))!.registrationPrepared, isTrue);
      expect(await capture.file.exists(), isTrue);

      expect(await uploads.drain(), isTrue);
      expect(
        credentials,
        hasLength(2),
      ); // Prepared registration is retried directly.
      expect(nativeTasks, hasLength(1));
      expect(registrations.map((body) => body['clientId']), [
        capture.clientId,
        capture.clientId,
      ]);
      expect(registeredIds, {capture.clientId: 'capture-1'});
      expect(await queue.byId(capture.id), isNull);
      expect(await capture.file.exists(), isFalse);
      await reporter.flush();
      expect(errorReports, isEmpty);
    },
  );

  test(
    'native permanent 403 retains evidence and still reports the unexpected failure',
    () async {
      final capture = await queued();
      nativeResult = (task) => TaskStatusUpdate(
        task,
        TaskStatus.failed,
        TaskHttpException('Forbidden', 403),
      );
      await expectLater(
        backend.putBytes(
          'https://storage.example.invalid/direct',
          capture.file,
          'image/jpeg',
          'direct-forbidden',
        ),
        throwsA(
          isA<StateError>().having(
            ErrorReporter.isBug,
            'reported as a bug',
            isTrue,
          ),
        ),
      );
      expect(await uploader().drain(), isFalse);
      await pumpEventQueue();
      await reporter.flush();
      final pending = (await queue.byId(capture.id))!;
      expect(pending.attempts, 1);
      expect(pending.lastError, 'Something went wrong. Please try again.');
      expect(await capture.file.exists(), isTrue);
      expect(registrations, isEmpty);
      expect(errorReports, hasLength(1));
      expect(errorReports.single['name'], 'StateError');
      expect(errorReports.single['message'], contains('403'));
    },
  );
}
