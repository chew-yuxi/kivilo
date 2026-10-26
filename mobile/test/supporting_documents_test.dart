import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';
import 'package:kivilo/models/supporting_documents.dart';
import 'package:kivilo/screens/supporting_documents_screen.dart';
import 'package:kivilo/screens/maintenance_evidence_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/capture_backend.dart';
import 'package:kivilo/services/capture_queue.dart';
import 'package:kivilo/services/notification_route.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/services/supporting_document_photos.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

Map<String, dynamic> _workspace({String role = 'tenant', bool file = true}) => {
  'tenancyId': 'tenancy-1',
  'propertyLabel': 'Harbour View · #12-34',
  'tenantName': 'Priya',
  'startDate': '2026-10-01T00:00:00Z',
  'endDate': '2027-09-30T00:00:00Z',
  'role': role,
  'canRequest': role == 'agent',
  'canUpload': role == 'tenant',
  'currentMinorRepairCap': null,
  'agreement': {
    'requestId': null,
    'files': <Map<String, dynamic>>[],
    'currentFileId': null,
    'canUpload': true,
    'canReview': role != 'tenant',
    'terms': null,
    'termsMatchCurrentFile': false,
  },
  'requests': [
    {
      'id': 'request-1',
      'canUpload': role == 'tenant',
      'title': 'Payment proof',
      'requestedAt': '2026-10-23T09:00:00Z',
      'requestedBy': {'id': 'agent-1', 'name': 'Alex'},
      'files': [
        if (file)
          {
            'id': 'file-1',
            'clientId': 'file-client',
            'fileName': 'Receipt.pdf',
            'mimeType': 'application/pdf',
            'byteSize': 2345,
            'submittedAt': '2026-10-23T10:15:00Z',
            'submittedBy': {'id': 'tenant-1', 'name': 'Priya'},
          },
      ],
    },
  ],
};

class _Api extends Api {
  _Api({this.role = 'tenant', this.workspace})
    : super(
        attachAuth: false,
        dio: Dio(BaseOptions(baseUrl: 'https://kivilo.example')),
      );
  final String role;
  final Map<String, dynamic>? workspace;
  int requests = 0;
  final clientIds = <String>[];
  bool failRequest = false;
  final downloads = <String>[];
  @override
  String? get currentOwnerId => 'owner-1';
  @override
  Future<SupportingDocuments> supportingDocuments(
    String tenancyId, {
    String? ownerId,
  }) async => SupportingDocuments.fromJson(workspace ?? _workspace(role: role));
  @override
  Future<SupportingDocuments> requestSupportingDocument(
    String tenancyId, {
    required String clientId,
    required String title,
    String? ownerId,
  }) async {
    clientIds.add(clientId);
    if (failRequest) {
      failRequest = false;
      throw const ApiFailure('No signal', null);
    }
    requests++;
    return SupportingDocuments.fromJson(_workspace(role: role));
  }

  @override
  Future<String> supportingDocumentUrl(
    String tenancyId,
    String requestId,
    String fileId, {
    String? ownerId,
  }) async {
    downloads.add('$tenancyId/$requestId/$fileId');
    return 'https://storage.example/private-document?token=short-lived';
  }
}

class _Photos extends SupportingDocumentPhotos {
  _Photos(Api api) : super(api: api, tenancyId: 'tenancy-1');
  final added = <ImageSource>[];
  Map<String, List<PendingCapture>> queued = {};
  @override
  Future<void> recover() async {}
  @override
  Future<Map<String, List<PendingCapture>>> pending(
    Iterable<String> ids,
  ) async => queued;
  @override
  Future<bool?> add(String requestId, ImageSource source) async {
    added.add(source);
    return true;
  }
}

class _Picker extends ImagePicker {
  _Picker(this.file, {this.beforeReturn});
  final File file;
  final void Function()? beforeReturn;
  int recovered = 0;
  int picked = 0;
  @override
  Future<LostDataResponse> retrieveLostData() async {
    recovered++;
    return LostDataResponse(
      files: [XFile(file.path)],
      type: RetrieveType.image,
    );
  }

  @override
  Future<XFile?> pickImage({
    required ImageSource source,
    double? maxWidth,
    double? maxHeight,
    int? imageQuality,
    CameraDevice preferredCameraDevice = CameraDevice.rear,
    bool requestFullMetadata = true,
  }) async {
    picked++;
    beforeReturn?.call();
    return XFile(file.path);
  }
}

class _Cache extends ReadCache {
  String owner = 'owner-1';
  @override
  String? get ownerId => owner;
}

class _Backend implements CaptureBackend {
  bool offline = true;
  bool loseResponse = false;
  final registered = <String>{};
  final bytes = <int>[];
  String? owner;
  int? requestedBytes;
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
    owner = inspectionId;
    requestedBytes = sizeBytes;
    if (offline) throw const ApiFailure('No signal', null);
    return (
      storagePath: 'supporting-documents/$roomId/$clientId.png',
      signedUrl: 'https://storage.example/upload',
      alreadyUploaded: false,
    );
  }

  @override
  Future<void> putBytes(
    String signedUrl,
    File file,
    String mimeType,
    String clientId,
  ) async {
    bytes.addAll(await file.readAsBytes());
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
    registered.add(clientId);
    if (loseResponse) {
      loseResponse = false;
      throw const ApiFailure('Response lost', null);
    }
    return (id: clientId, annotationsApplied: true, itemApplied: true);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets(
    'maintenance cannot consume or overwrite a document picker result',
    (tester) async {
      final root = Directory.systemTemp.createTempSync(
        'kivilo-document-maintenance-',
      );
      final queue = CaptureQueue(NativeDatabase.memory());
      addTearDown(() async {
        await queue.close();
        root.deleteSync(recursive: true);
      });
      final journal = File('${root.path}/$supportingDocumentPickerFilename');
      journal.writeAsStringSync(
        jsonEncode({
          'ownerId': 'owner-1',
          'tenancyId': 'tenancy-1',
          'requestId': 'request-original',
          'clientId': newCaptureId(),
        }),
      );
      final picker = _Picker(File('${root.path}/receipt.png'));
      await tester.runAsync(() async {
        await tester.pumpWidget(
          MaterialApp(
            theme: buildKiviloTheme(),
            home: MaintenanceEvidenceScreen(
              caseId: 'case-1',
              purpose: 'BEFORE',
              api: _Api(),
              queue: queue,
              picker: picker,
              supportDirectory: () async => root,
              canRecoverLostData: true,
            ),
          ),
        );
        await Future<void>.delayed(const Duration(milliseconds: 50));
      });
      await tester.pumpAndSettle();
      expect(picker.recovered, 0);
      await tester.runAsync(() async {
        await tester.tap(find.text('Take photo'));
        await Future<void>.delayed(const Duration(milliseconds: 50));
      });
      await tester.pumpAndSettle();
      expect(
        find.textContaining('Reopen Supporting documents'),
        findsOneWidget,
      );
      expect(picker.picked, 0);
      expect(journal.existsSync(), isTrue);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets(
    'tenant opens private files, adds a photo and uses an authenticated browser path for PDFs',
    (tester) async {
      final api = _Api();
      final photos = _Photos(api);
      final urls = <Uri>[];
      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          home: SupportingDocumentsScreen(
            tenancyId: 'tenancy-1',
            api: api,
            photos: photos,
            openUrl: (uri) async => urls.add(uri),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Payment proof'), findsNothing);
      expect(find.text('Request another document'), findsNothing);
      await tester.tap(find.text('Upload PDF in browser'));
      await tester.pumpAndSettle();
      expect(
        urls.last.toString(),
        'https://kivilo.example/tenancies/tenancy-1/documents#tenancy-agreement',
      );
      await tester.ensureVisible(find.text('Other documents (1)'));
      await tester.tap(find.text('Other documents (1)'));
      await tester.pumpAndSettle();
      expect(find.text('Payment proof'), findsOneWidget);
      expect(find.textContaining('Priya · 23 Oct 2026'), findsOneWidget);
      await tester.ensureVisible(find.text('Receipt.pdf'));
      await tester.tap(find.text('Receipt.pdf'));
      await tester.pumpAndSettle();
      expect(api.downloads, ['tenancy-1/request-1/file-1']);
      await tester.ensureVisible(find.text('Choose photo').last);
      await tester.tap(find.text('Choose photo').last);
      await tester.pumpAndSettle();
      expect(photos.added, [ImageSource.gallery]);
      await tester.ensureVisible(find.text('Upload PDF in browser').last);
      await tester.tap(find.text('Upload PDF in browser').last);
      await tester.pumpAndSettle();
      expect(
        urls.last.toString(),
        'https://kivilo.example/tenancies/tenancy-1/documents?requestId=request-1',
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'agent uploads agreements while supporting requests remain tenant-only',
    (tester) async {
      final api = _Api(role: 'agent')..failRequest = true;
      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          home: SupportingDocumentsScreen(
            tenancyId: 'tenancy-1',
            api: api,
            photos: _Photos(api),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Choose photo'), findsOneWidget);
      await tester.ensureVisible(find.text('Other documents (1)'));
      await tester.tap(find.text('Other documents (1)'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Request another document'));
      await tester.tap(find.text('Request another document'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Request'));
      await tester.pumpAndSettle();
      expect(find.text('No signal'), findsOneWidget);
      expect(find.text('Payment proof'), findsWidgets);
      await tester.tap(find.text('Request'));
      await tester.pumpAndSettle();
      await tester.pump(const Duration(milliseconds: 400));
      expect(api.requests, 1);
      expect(api.clientIds.toSet(), hasLength(1));
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'current agreement leads while previous agreements and optional documents stay folded',
    (tester) async {
      tester.view.physicalSize = const Size(393, 852);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final workspace = _workspace();
      final receipt = Map<String, dynamic>.from(
        (workspace['requests'] as List).single['files'][0] as Map,
      );
      workspace['agreement'] = {
        ...(workspace['agreement'] as Map<String, dynamic>),
        'requestId': 'agreement-request',
        'currentFileId': 'current-file',
        // Current identity wins even if files arrive in a different display order.
        'files': [
          {
            ...receipt,
            'id': 'previous-file',
            'fileName': 'Previous signed agreement.pdf',
          },
          {
            ...receipt,
            'id': 'current-file',
            'fileName': 'Current signed agreement.pdf',
          },
        ],
      };
      final api = _Api(workspace: workspace);
      final photos = _Photos(api)
        ..queued = {
          'request-1': [
            PendingCapture(
              id: 1,
              roomId: 'request-1',
              inspectionId: 'supporting-documents:tenancy-1',
              kind: 'DOCUMENT',
              awaitingMarkup: false,
              relativePath: 'receipt.jpg',
              filename: 'receipt.jpg',
              mimeType: 'image/jpeg',
              sizeBytes: 100,
              registrationPrepared: false,
              registrationAnnotationsApplied: false,
              registrationItemApplied: false,
              deleteRequested: false,
              attempts: 1,
              createdAt: DateTime(2026, 10, 23),
            ),
          ],
        };
      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          home: SupportingDocumentsScreen(
            tenancyId: 'tenancy-1',
            api: api,
            photos: photos,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Current agreement'), findsOneWidget);
      expect(find.text('Current signed agreement.pdf'), findsOneWidget);
      expect(find.text('Previous signed agreement.pdf'), findsNothing);
      expect(find.text('Payment proof'), findsNothing);
      expect(
        find.text('1 photo saved on this phone, waiting to upload.'),
        findsOneWidget,
      );
      await tester.tap(find.text('Previous agreements (1)'));
      await tester.pumpAndSettle();
      expect(find.text('Previous signed agreement.pdf'), findsOneWidget);
      await tester.tap(find.text('Hide previous agreements (1)'));
      await tester.pumpAndSettle();
      expect(find.text('Previous signed agreement.pdf'), findsNothing);
      expect(find.text('Current signed agreement.pdf'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  test(
    'notification opens exactly the private tenancy document page',
    () async {
      final screen = await notificationScreen(
        '/tenancies/tenancy-1/documents',
        _Api(),
      );
      expect(screen, isA<SupportingDocumentsScreen>());
      expect((screen! as SupportingDocumentsScreen).tenancyId, 'tenancy-1');
      final requested = await notificationScreen(
        '/tenancies/tenancy-1/documents?requestId=request-2',
        _Api(),
      );
      expect(
        (requested! as SupportingDocumentsScreen).initialRequestId,
        'request-2',
      );
      expect(
        await notificationScreen(
          '/tenancies/tenancy-1/documents/other',
          _Api(),
        ),
        isNull,
      );
    },
  );

  testWidgets(
    'request notification focuses its exact document and preserves PDF destination',
    (tester) async {
      tester.view.physicalSize = const Size(393, 852);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      final workspace = _workspace(file: false);
      final request = Map<String, dynamic>.from(
        (workspace['requests'] as List).single as Map,
      );
      workspace['requests'] = [
        {...request, 'id': 'unrelated', 'title': 'Earlier request'},
        {...request, 'id': 'requested', 'title': 'Rent receipt'},
      ];
      final api = _Api(workspace: workspace);
      final urls = <Uri>[];
      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          home: SupportingDocumentsScreen(
            tenancyId: 'tenancy-1',
            initialRequestId: 'requested',
            api: api,
            photos: _Photos(api),
            openUrl: (url) async => urls.add(url),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Rent receipt').hitTestable(), findsOneWidget);
      expect(
        find.textContaining('Priya · 1 Oct 2026 to 30 Sep 2027'),
        findsOneWidget,
      );
      expect(find.text('Waiting for the tenant to upload'), findsNothing);
      expect(find.text('Review maintenance clause'), findsNothing);
      final target = find.ancestor(
        of: find.text('Rent receipt'),
        matching: find.byType(Card),
      );
      final upload = find.descendant(
        of: target,
        matching: find.text('Upload PDF in browser').last,
      );
      await tester.ensureVisible(upload);
      await tester.tap(upload);
      await tester.pumpAndSettle();
      expect(
        urls.single.toString(),
        'https://kivilo.example/tenancies/tenancy-1/documents?requestId=requested',
      );
      expect(tester.takeException(), isNull);
    },
  );

  test(
    'queued receipt survives offline and ambiguous registration, without blocking an inspection',
    () async {
      final root = await Directory.systemTemp.createTemp('kivilo-documents-');
      final queue = CaptureQueue(NativeDatabase.memory());
      addTearDown(() async {
        await queue.close();
        await root.delete(recursive: true);
      });
      final source = File('${root.path}/receipt.heic');
      const original = [0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4, 5, 6, 7, 8];
      await source.writeAsBytes(original);
      final backend = _Backend();
      SupportingDocumentPhotos service() => SupportingDocumentPhotos(
        api: _Api(),
        tenancyId: 'tenancy-1',
        root: root,
        queue: queue,
        picker: _Picker(source),
        backend: backend,
        currentOwner: () => 'owner-1',
      );
      expect(await service().add('request-1', ImageSource.gallery), isFalse);
      final pending = (await service().pending([
        'request-1',
      ]))['request-1']!.single;
      expect(pending.kind, 'DOCUMENT');
      expect(pending.attempts, 1);
      expect(pending.inspectionId, 'supporting-documents:tenancy-1');
      expect(
        await File('${root.path}/${pending.relativePath}').readAsBytes(),
        original,
      );
      expect(await queue.pendingForInspection('inspection-1', 'owner-1'), (
        captures: 0,
        edits: 0,
      ));
      expect(
        (await SupportingDocumentPhotos(
          api: _Api(),
          tenancyId: 'other',
          root: root,
          queue: queue,
          currentOwner: () => 'owner-1',
        ).pending(['request-1']))['request-1'],
        isEmpty,
      );
      backend
        ..offline = false
        ..loseResponse = true;
      await service().retry();
      expect(await queue.byId(pending.id), isNotNull);
      expect(backend.registered, hasLength(1));
      await service().retry();
      expect(await queue.byId(pending.id), isNull);
      expect(backend.registered, {pending.clientId});
      expect(backend.bytes, original);
      expect(backend.requestedBytes, original.length);
    },
  );

  test(
    'switching account while the picker is open preserves the original owner and refuses upload',
    () async {
      final root = await Directory.systemTemp.createTemp(
        'kivilo-documents-owner-',
      );
      final queue = CaptureQueue(NativeDatabase.memory());
      addTearDown(() async {
        await queue.close();
        await root.delete(recursive: true);
      });
      final source = File('${root.path}/receipt.png');
      await source.writeAsBytes([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
      var owner = 'owner-1';
      final backend = _Backend()..offline = false;
      final service = SupportingDocumentPhotos(
        api: _Api(),
        tenancyId: 'tenancy-1',
        root: root,
        queue: queue,
        backend: backend,
        currentOwner: () => owner,
        picker: _Picker(source, beforeReturn: () => owner = 'owner-2'),
      );
      await expectLater(
        service.add('request-1', ImageSource.camera),
        throwsA(isA<ApiFailure>()),
      );
      expect(await queue.forRoom('request-1', 'owner-1'), hasLength(1));
      expect(await queue.forRoom('request-1', 'owner-2'), isEmpty);
      expect(backend.registered, isEmpty);
    },
  );

  test(
    'document upload and confirmation carry identical metadata and enforce account ownership',
    () async {
      var owner = 'owner-1';
      final dio = Dio(
        BaseOptions(
          baseUrl: 'https://kivilo.example',
          extra: {'currentOwnerId': () => owner},
        ),
      );
      final calls = <RequestOptions>[];
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            calls.add(options);
            handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: options.path.endsWith('upload-url')
                    ? {
                        'storagePath':
                            'supporting-documents/tenancy-1/request-1/client.png',
                        'alreadyRegistered': true,
                      }
                    : {'id': 'file-1'},
              ),
            );
          },
        ),
      );
      final backend = RoutingEvidenceBackend(dio)..bindOwner('owner-1');
      final clientId = newCaptureId();
      final url = await backend.uploadUrl(
        'supporting-documents:tenancy-1',
        'request-1',
        '$clientId.png',
        clientId,
        mimeType: 'image/png',
        sizeBytes: 123,
      );
      expect(url.alreadyUploaded, isTrue);
      await backend.registerCapture(
        inspectionId: 'supporting-documents:tenancy-1',
        roomId: 'request-1',
        kind: 'DOCUMENT',
        storagePath: url.storagePath,
        clientId: clientId,
        mimeType: 'image/png',
        sizeBytes: 123,
      );
      expect(calls.map((call) => call.path), [
        '/api/v1/tenancies/tenancy-1/documents/request-1/upload-url',
        '/api/v1/tenancies/tenancy-1/documents/request-1/files',
      ]);
      expect(calls.first.data, calls.last.data);
      expect(calls.last.data['byteSize'], 123);
      expect(calls.last.extra['expectedOwnerId'], 'owner-1');
      owner = 'owner-2';
      await expectLater(
        backend.uploadUrl(
          'supporting-documents:tenancy-1',
          'request-1',
          '$clientId.png',
          clientId,
          mimeType: 'image/png',
          sizeBytes: 123,
        ),
        throwsA(isA<ApiFailure>()),
      );
      expect(calls, hasLength(2));
    },
  );

  test(
    'Android lost picker result retains its original request and account after restart',
    () async {
      final root = await Directory.systemTemp.createTemp(
        'kivilo-document-recovery-',
      );
      final queue = CaptureQueue(NativeDatabase.memory());
      addTearDown(() async {
        await queue.close();
        await root.delete(recursive: true);
      });
      final source = File('${root.path}/receipt.png');
      await source.writeAsBytes([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
      final clientId = newCaptureId();
      final journal = File('${root.path}/$supportingDocumentPickerFilename');
      await journal.writeAsString(
        jsonEncode({
          'ownerId': 'owner-1',
          'tenancyId': 'tenancy-1',
          'requestId': 'request-original',
          'clientId': clientId,
        }),
      );
      final picker = _Picker(source);
      SupportingDocumentPhotos service(String owner, String tenancy) =>
          SupportingDocumentPhotos(
            api: _Api(),
            tenancyId: tenancy,
            root: root,
            queue: queue,
            picker: picker,
            supportsLostData: true,
            currentOwner: () => owner,
          );
      await service('owner-2', 'tenancy-1').recover();
      await service('owner-1', 'tenancy-other').recover();
      expect(picker.recovered, 0);
      expect(await journal.exists(), isTrue);
      await service('owner-1', 'tenancy-1').recover();
      final row = (await queue.forRoom('request-original', 'owner-1')).single;
      expect(row.clientId, clientId);
      expect(row.inspectionId, 'supporting-documents:tenancy-1');
      expect(row.kind, 'DOCUMENT');
      expect(picker.recovered, 1);
      expect(await journal.exists(), isFalse);
      await service('owner-1', 'tenancy-1').recover();
      expect(await queue.forRoom('request-original', 'owner-1'), hasLength(1));
    },
  );

  test(
    'document API pins reads, requests, clause review and file opening to the initial account',
    () async {
      final cache = _Cache();
      final calls = <RequestOptions>[];
      final dio = Dio(BaseOptions(baseUrl: 'https://kivilo.example'));
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            calls.add(options);
            handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: options.path.endsWith('/file-1')
                    ? {'url': 'https://private.example/file'}
                    : options.path.endsWith('/analysis')
                    ? {
                        'fileId': 'file-1',
                        'status': 'NO_TEXT',
                        'candidates': [],
                      }
                    : _workspace(),
              ),
            );
          },
        ),
      );
      final api = Api(dio: dio, cache: cache, attachAuth: false);
      final data = await api.supportingDocuments(
        'tenancy-1',
        ownerId: 'owner-1',
      );
      expect(data.requests.single.files.single.byteSize, 2345);
      await api.requestSupportingDocument(
        'tenancy-1',
        clientId: newCaptureId(),
        title: 'Payment proof',
        ownerId: 'owner-1',
      );
      await api.supportingDocumentUrl(
        'tenancy-1',
        'request-1',
        'file-1',
        ownerId: 'owner-1',
      );
      await api.agreementClauseAnalysis(
        'tenancy-1',
        'file-1',
        ownerId: 'owner-1',
      );
      await api.confirmAgreementTerms('tenancy-1', {
        'fileId': 'file-1',
      }, ownerId: 'owner-1');
      expect(
        calls.every((call) => call.extra['expectedOwnerId'] == 'owner-1'),
        isTrue,
      );
      cache.owner = 'owner-2';
      await expectLater(
        api.supportingDocuments('tenancy-1', ownerId: 'owner-1'),
        throwsA(isA<ApiFailure>()),
      );
      await expectLater(
        api.requestSupportingDocument(
          'tenancy-1',
          clientId: newCaptureId(),
          title: 'Payment proof',
          ownerId: 'owner-1',
        ),
        throwsA(isA<ApiFailure>()),
      );
      await expectLater(
        api.supportingDocumentUrl(
          'tenancy-1',
          'request-1',
          'file-1',
          ownerId: 'owner-1',
        ),
        throwsA(isA<ApiFailure>()),
      );
      await expectLater(
        api.agreementClauseAnalysis('tenancy-1', 'file-1', ownerId: 'owner-1'),
        throwsA(isA<ApiFailure>()),
      );
      await expectLater(
        api.confirmAgreementTerms('tenancy-1', {
          'fileId': 'file-1',
        }, ownerId: 'owner-1'),
        throwsA(isA<ApiFailure>()),
      );
      expect(calls, hasLength(5));
    },
  );
}
