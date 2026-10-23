import 'dart:io';

import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/maintenance.dart';
import 'package:kivilo/models/supporting_documents.dart';
import 'package:kivilo/screens/agreement_terms_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/capture_backend.dart';
import 'package:kivilo/services/capture_queue.dart';
import 'package:kivilo/services/capture_store.dart';
import 'package:kivilo/services/uploader.dart';
import 'package:kivilo/ui/agreement_terms_view.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

const _file = SupportingDocumentFile(
  id: 'file-agreement',
  clientId: 'client',
  fileName: 'Tenancy agreement.pdf',
  mimeType: 'application/pdf',
  byteSize: 200,
  submittedAt: '2026-10-23T11:00:00Z',
  submittedBy: 'Alex',
);
const _agreement = TenancyAgreement(
  requestId: 'agreement-request',
  files: [_file],
  currentFileId: 'file-agreement',
  canUpload: true,
  canReview: true,
  termsMatchCurrentFile: false,
);
const _workspace = SupportingDocuments(
  tenancyId: 'tenancy-1',
  propertyLabel: 'Home',
  tenantName: 'Priya',
  startDate: '2026-10-01T00:00:00Z',
  endDate: '2027-09-30T00:00:00Z',
  role: 'agent',
  canRequest: true,
  canUpload: false,
  requests: [],
  agreement: _agreement,
);

class _Api extends Api {
  _Api() : super(attachAuth: false);
  bool failSave = false;
  final bodies = <Map<String, dynamic>>[];
  @override
  String? get currentOwnerId => 'owner-1';
  @override
  Future<AgreementClauseAnalysis> agreementClauseAnalysis(
    String tenancyId,
    String fileId, {
    required String? ownerId,
  }) async => const AgreementClauseAnalysis(
    fileId: 'file-agreement',
    status: 'TEXT',
    candidates: [
      AgreementClauseCandidate(
        page: 3,
        text:
            'The tenant bears the first S\$150 for each repair. The landlord pays the balance.',
        suggestedTenantCap: '150.00',
      ),
    ],
  );
  @override
  Future<SupportingDocuments> confirmAgreementTerms(
    String tenancyId,
    Map<String, dynamic> body, {
    required String? ownerId,
  }) async {
    bodies.add(body);
    if (failSave) {
      failSave = false;
      throw const ApiFailure('No signal', null);
    }
    return _workspace;
  }
}

Future<void> _confirm(WidgetTester tester) async {
  tester.testTextInput.hide();
  await tester.pumpAndSettle();
  await tester.scrollUntilVisible(
    find.text('Confirm repair terms'),
    200,
    scrollable: find.byType(Scrollable).first,
  );
  await tester.pumpAndSettle();
  await tester.ensureVisible(find.text('Confirm repair terms'));
  await tester.pumpAndSettle();
  await tester.tap(find.text('Confirm repair terms'));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'clause extraction waits for explicit rule confirmation and preserves a failed draft',
    (tester) async {
      final api = _Api()..failSave = true;
      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          home: AgreementTermsScreen(
            tenancyId: 'tenancy-1',
            agreement: _agreement,
            api: api,
            ownerId: 'owner-1',
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(api.bodies, isEmpty);
      await tester.tap(find.text('Page 3'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('First amount'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('First amount'));
      await tester.pumpAndSettle();
      final cap = tester
          .widget<TextField>(
            find.widgetWithText(TextField, 'Tenant pays the first'),
          )
          .controller!;
      expect(cap.text, '150.00');
      await _confirm(tester);
      expect(api.bodies.single['fileId'], 'file-agreement');
      expect(api.bodies.single['page'], 3);
      expect(api.bodies.single['rule'], 'FIRST_AMOUNT');
      expect(api.bodies.single['tenantCap'], '150.00');
      expect(cap.text, '150.00');
      await _confirm(tester);
      expect(api.bodies, hasLength(2));
      expect(api.bodies.last, api.bodies.first);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('another rule needs notes and never sends a first-amount cap', (
    tester,
  ) async {
    final api = _Api();
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: AgreementTermsScreen(
          tenancyId: 'tenancy-1',
          agreement: _agreement,
          api: api,
          ownerId: 'owner-1',
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Page 3'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Another rule'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Another rule'));
    await tester.pumpAndSettle();
    await _confirm(tester);
    expect(api.bodies, isEmpty);
    await tester.enterText(
      find.widgetWithText(TextField, 'Explain the repair rule'),
      'The parties must agree responsibility for each repair.',
    );
    await _confirm(tester);
    expect(api.bodies.single['rule'], 'OTHER');
    expect(api.bodies.single['tenantCap'], isNull);
    expect(api.bodies.single['notes'], contains('each repair'));
  });

  testWidgets(
    'saved source notes and previous-agreement provenance stay visible',
    (tester) async {
      final terms = AgreementTerms.fromJson({
        'fileId': 'old-file',
        'page': 4,
        'quote': 'Costs depend on the cause of the fault.',
        'rule': 'OTHER',
        'tenantCap': null,
        'notes': 'Agree each repair separately.',
        'confirmedAt': '2026-10-23T11:00:00Z',
        'confirmedBy': {'id': 'agent', 'name': 'Alex'},
        'sourceFileName': 'Previous agreement.pdf',
        'matchesCurrentAgreement': false,
      });
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: AgreementTermsView(terms: terms)),
        ),
      );
      expect(find.text('Agree each repair separately.'), findsOneWidget);
      expect(
        find.textContaining('Previous agreement.pdf · Page 4'),
        findsOneWidget,
      );
      expect(find.textContaining('previous agreement'), findsOneWidget);
      expect(find.textContaining('Tenant pays the first'), findsNothing);
      await tester.tap(find.text('Show source clause'));
      await tester.pump();
      expect(find.text(terms.quote), findsOneWidget);
      final responsibility = Responsibility.fromJson({
        'arrangedBy': 'LANDLORD',
        'minorRepairCap': null,
        'agreement': null,
        'pending': null,
        'history': [],
        'shares': null,
        'canPropose': true,
        'canAnswer': false,
        'canWithdraw': false,
        'maintenanceTerms': {
          'fileId': 'old-file',
          'page': 4,
          'quote': terms.quote,
          'rule': 'OTHER',
          'tenantCap': null,
          'notes': terms.notes,
          'confirmedAt': terms.confirmedAt,
          'confirmedBy': {'id': 'agent', 'name': 'Alex'},
          'matchesCurrentAgreement': false,
        },
      });
      expect(responsibility.maintenanceTerms!.matchesCurrentAgreement, isFalse);
      expect(responsibility.minorRepairCap, isNull);
    },
  );

  test(
    'agreement queue creates its slot on retry and keeps upload confirmation on that slot',
    () async {
      final root = await Directory.systemTemp.createTemp(
        'kivilo-agreement-queue-',
      );
      final queue = CaptureQueue(NativeDatabase.memory());
      addTearDown(() async {
        await queue.close();
        await root.delete(recursive: true);
      });
      final source = File('${root.path}/agreement.png');
      await source.writeAsBytes([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
      final id = await CaptureStore(queue: queue, root: root).save(
        source: source,
        ownerId: 'owner-1',
        inspectionId: 'supporting-documents:tenancy-1',
        roomId: agreementQueueTarget,
        kind: 'DOCUMENT',
        extension: 'png',
        mimeType: 'image/png',
      );
      final calls = <RequestOptions>[];
      var offline = true;
      final dio = Dio(
        BaseOptions(
          baseUrl: 'https://kivilo.example',
          extra: {'currentOwnerId': () => 'owner-1'},
        ),
      );
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            calls.add(options);
            if (offline) {
              handler.reject(
                DioException(
                  requestOptions: options,
                  type: DioExceptionType.connectionError,
                ),
              );
              return;
            }
            handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: options.path.endsWith('/agreement')
                    ? {
                        'agreement': {'requestId': 'agreement-request'},
                      }
                    : options.path.endsWith('/upload-url')
                    ? {
                        'storagePath':
                            'supporting-documents/tenancy-1/agreement-request/file.png',
                        'alreadyUploaded': true,
                      }
                    : {'id': 'file-agreement'},
              ),
            );
          },
        ),
      );
      final uploader = Uploader(
        queue: queue,
        backend: RoutingEvidenceBackend(dio),
        root: root,
        ownerId: 'owner-1',
      );
      await uploader.drain();
      expect(await queue.byId(id), isNotNull);
      expect(
        calls.single.path,
        '/api/v1/tenancies/tenancy-1/documents/agreement',
      );
      offline = false;
      await uploader.drain();
      expect(await queue.byId(id), isNull);
      expect(
        calls
            .map((call) => call.path)
            .where((path) => path.endsWith('/files'))
            .single,
        '/api/v1/tenancies/tenancy-1/documents/agreement-request/files',
      );
      expect(
        calls.every((call) => call.extra['expectedOwnerId'] == 'owner-1'),
        isTrue,
      );
    },
  );
}
