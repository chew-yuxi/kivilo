import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/handover.dart';
import 'package:kivilo/models/maintenance.dart';
import 'package:kivilo/models/report.dart';
import 'package:kivilo/screens/maintenance_case_screen.dart';
import 'package:kivilo/screens/evidence_photo_screen.dart';
import 'package:kivilo/screens/new_maintenance_case_screen.dart';
import 'package:kivilo/screens/report_screen.dart';
import 'package:kivilo/screens/tenancy_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/capture_backend.dart';
import 'package:kivilo/services/capture_queue.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_format.dart';
import 'package:kivilo/ui/tenant_handover.dart';

import 'maintenance_case_screen_test.dart' show caseJson;
import 'report_addenda_test.dart' show addendumJson;
import 'report_test.dart' show reportJson;

final _handoverJson = <String, dynamic>{
  'tenancyId': 'tenancy-1',
  'url': 'https://kivilo.one/handover/check-in-1',
  'deadline': '2026-10-30',
  'windowDays': 30,
  'modules': [
    [true, false],
    [false, true],
  ],
};

const _window = MoveInDefectWindow(
  windowDays: 30,
  opensAt: '2026-10-01',
  deadline: '2026-10-30',
  canSubmit: true,
  canEditWindow: false,
  checkInId: 'check-in-1',
  targets: [],
);

Map<String, dynamic> _claim({String? status}) => {
  'wasPresentAtMoveIn': true,
  'canSubmit': status == null,
  'canRespond': status == 'PENDING',
  'addendumId': status == null ? null : 'addendum-1',
  'inspectionId': 'inspection-1',
  'status': status,
  'reportedAt': '2026-10-10T08:00:00Z',
  'deadline': '2026-10-30',
  'dispute': null,
  'targets': <Map<String, dynamic>>[],
};

class _MemoryCache extends ReadCache {
  final values = <String, Object?>{};
  @override
  Future<Object?> read(String key) async => values[key];
  @override
  Future<bool> write(String key, Object? value) async {
    values[key] = value;
    return true;
  }

  @override
  Future<void> remove(String key) async {
    values.remove(key);
  }
}

class _Api extends Api {
  _Api() : super(attachAuth: false);
  Map<String, dynamic>? created;
  Map<String, dynamic>? detail;
  Map<String, dynamic>? reportData;
  Map<String, dynamic>? terms;
  Map<String, dynamic>? updatedTerms;
  final accepted = <String>[];
  final disputes = <String>[];
  @override
  Future<TenantHandover?> handover(String inspectionId) async =>
      TenantHandover.fromJson(_handoverJson);
  @override
  Future<String> createMaintenanceCase(
    String tenancyId,
    Map<String, dynamic> body,
  ) async {
    created = body;
    return 'case-1';
  }

  @override
  Future<MaintenanceCaseDetail> maintenanceCase(String caseId) async =>
      MaintenanceCaseDetail.fromJson(detail!);
  @override
  Future<SignedReport> report(String inspectionId) async =>
      SignedReport.fromJson(reportData!);
  @override
  Future<TenancyDetail> tenancy(String tenancyId) async =>
      TenancyDetail.fromJson(terms!);
  @override
  Future<List<MaintenanceCaseSummary>> maintenanceCases(
    String tenancyId,
  ) async => [];
  @override
  Future<List<PropertyAssetSummary>> propertyAssets(String propertyId) async =>
      [];
  @override
  Future<void> updateTenancyTerms(
    String tenancyId,
    Map<String, dynamic> body,
  ) async {
    updatedTerms = body;
  }

  @override
  Future<void> acknowledgeAddendum(String addendumId) async {
    accepted.add(addendumId);
  }

  @override
  Future<void> disputeAddendum(String addendumId, String reason) async {
    disputes.add(reason);
  }
}

class _Adapter implements HttpClientAdapter {
  _Adapter({this.status = 200});
  final int status;
  final requests = <RequestOptions>[];
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<dynamic>? requestStream,
    Future<dynamic>? cancelFuture,
  ) async {
    requests.add(options);
    return ResponseBody.fromString(
      jsonEncode(options.method == 'GET' ? _handoverJson : {'ok': true}),
      status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

class _UnusedEvidenceBackend implements CaptureBackend {
  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw StateError('An empty photo queue must not contact its backend.');
}

void main() {
  test(
    'uses the authenticated handover and shared authorized mutations',
    () async {
      final adapter = _Adapter();
      final dio = Dio()..httpClientAdapter = adapter;
      final api = Api(dio: dio, attachAuth: false);
      final handover = await api.handover('inspection-1');
      expect(handover!.url, 'https://kivilo.one/handover/check-in-1');
      expect(handover.modules.first, [true, false]);
      await api.recordMoveInDefect('case-1', {
        'targetKey': 'item:item-1',
        'evidenceIds': ['before-1'],
      });
      await api.disputeAddendum('addendum-1', 'This chip happened later.');
      expect(adapter.requests.map((request) => request.path), [
        '/api/v1/inspections/inspection-1/handover',
        '/api/v1/maintenance/case-1/move-in-defect',
        '/api/v1/addenda/addendum-1/dispute',
      ]);
      expect(adapter.requests.last.data, {
        'reason': 'This chip happened later.',
      });
      dio.close();
    },
  );

  test('old cached tenancy and report models remain readable', () {
    final terms = TenancyDetail.fromJson({
      'id': 'tenancy-1',
      'role': 'TENANT',
      'minorRepairCap': null,
      'agentMayAgreeCosts': false,
      'capabilities': {
        'editMinorRepairCap': false,
        'editAgentAuthority': false,
      },
    });
    expect(terms.moveInDefects, isNull);
    expect(ReportAddendum.fromJson(addendumJson()).source, 'AGENT_UPDATE');
    expect(calendarDate('2026-10-30'), '30 Oct 2026');
  });

  test(
    'missing, unsigned or inaccessible handovers are unavailable; other failures remain errors',
    () async {
      final missing = Dio()..httpClientAdapter = _Adapter(status: 404);
      expect(
        await Api(dio: missing, attachAuth: false).handover('unsigned'),
        isNull,
      );
      missing.close();
      final broken = Dio()..httpClientAdapter = _Adapter(status: 500);
      await expectLater(
        Api(dio: broken, attachAuth: false).handover('unsigned'),
        throwsA(isA<ApiFailure>()),
      );
      broken.close();
    },
  );

  testWidgets(
    'handover shows the inclusive calendar deadline and copies only its sign-in link',
    (tester) async {
      String? copied;
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        (call) async {
          if (call.method == 'Clipboard.setData') {
            copied = (call.arguments as Map)['text'] as String;
          }
          return null;
        },
      );
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TenantHandoverView(inspectionId: 'inspection-1', api: _Api()),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(
        find.textContaining('30 Oct 2026 (Singapore time)'),
        findsOneWidget,
      );
      expect(
        find.bySemanticsLabel('QR code for the tenant sign-in link'),
        findsOneWidget,
      );
      await tester.tap(find.text('Copy sign-in link'));
      await tester.pumpAndSettle();
      expect(copied, _handoverJson['url']);
      expect(copied, isNot(contains('/reports/')));
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        null,
      );
    },
  );

  testWidgets(
    'move-in intent survives draft reopening and is submitted with the repair',
    (tester) async {
      final cache = _MemoryCache();
      final api = _Api();
      Widget screen() => MaterialApp(
        home: NewMaintenanceCaseScreen(
          tenancyId: 'tenancy-1',
          assets: const [],
          cache: cache,
          api: api,
          moveInDefects: _window,
        ),
      );
      await tester.pumpWidget(screen());
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.byType(CheckboxListTile),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.byType(CheckboxListTile));
      await tester.pumpAndSettle();
      await tester.pumpWidget(const SizedBox());
      await tester.pumpWidget(screen());
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.byType(CheckboxListTile),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(
        tester.widget<CheckboxListTile>(find.byType(CheckboxListTile)).value,
        true,
      );
      await tester.enterText(find.byType(TextField).at(0), 'Chipped basin');
      await tester.enterText(
        find.byType(TextField).at(1),
        'The chip was present at handover.',
      );
      await tester.scrollUntilVisible(
        find.text('Submit report'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.text('Submit report'));
      await tester.pumpAndSettle();
      expect(api.created?['wasPresentAtMoveIn'], true);
      expect(cache.values, isEmpty);
    },
  );

  testWidgets(
    'claims wait for an uploaded before photo and landlord response is on their own account',
    (tester) async {
      final api = _Api()
        ..detail = {
          ...caseJson(role: 'TENANT', status: 'REPORTED'),
          'moveInDefect': _claim(),
        };
      await tester.pumpWidget(
        MaterialApp(
          home: MaintenanceCaseScreen(caseId: 'case-1', api: api),
        ),
      );
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Record move-in condition'),
        200,
      );
      final button = tester.widget<FilledButton>(
        find.ancestor(
          of: find.text('Record move-in condition'),
          matching: find.byType(FilledButton),
        ),
      );
      expect(button.onPressed, isNull);
      expect(find.text('I agree this was present at move-in'), findsNothing);
      await tester.pumpWidget(const SizedBox());
      api.detail = {
        ...caseJson(role: 'LANDLORD', status: 'REPORTED'),
        'moveInDefect': _claim(status: 'PENDING'),
      };
      await tester.pumpWidget(
        MaterialApp(
          home: MaintenanceCaseScreen(caseId: 'case-1', api: api),
        ),
      );
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('I agree this was present at move-in'),
        200,
      );
      await tester.tap(find.text('I agree this was present at move-in'));
      await tester.pumpAndSettle();
      expect(api.accepted, ['addendum-1']);
    },
  );

  testWidgets(
    'evidence cannot be left before the durable photo store is ready',
    (tester) async {
      final prepared = Completer<Directory>();
      final root = Directory.systemTemp.createTempSync('evidence-ready-');
      final queue = CaptureQueue(NativeDatabase.memory());
      var loaded = false;
      addTearDown(() async {
        await queue.close();
        root.deleteSync(recursive: true);
      });
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => TextButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => EvidencePhotoScreen(
                    title: 'Before photos',
                    queueOwner: 'maintenance:case-1',
                    targetId: 'BEFORE',
                    kind: 'BEFORE',
                    ownerId: 'tenant',
                    currentOwnerId: () => 'tenant',
                    queue: queue,
                    supportDirectory: () => prepared.future,
                    backend: _UnusedEvidenceBackend(),
                    loadPhotos: () async {
                      loaded = true;
                      return const [];
                    },
                  ),
                ),
              ),
              child: const Text('Open photos'),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open photos'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(tester.widget<PopScope>(find.byType(PopScope)).canPop, false);
      expect(loaded, false);
      await tester.pageBack();
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.byType(EvidencePhotoScreen), findsOneWidget);
      prepared.complete(root);
      for (var attempt = 0; attempt < 20 && !loaded; attempt++) {
        await tester.runAsync(
          () => Future<void>.delayed(const Duration(milliseconds: 5)),
        );
        await tester.pump();
      }
      expect(loaded, true);
      await tester.pumpAndSettle();
      expect(tester.widget<PopScope>(find.byType(PopScope)).canPop, true);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('Open photos'), findsOneWidget);
      expect(find.byType(EvidencePhotoScreen), findsNothing);
    },
  );

  testWidgets(
    'a landlord cannot respond after the backend closes the claim capability',
    (tester) async {
      final api = _Api()
        ..detail = {
          ...caseJson(role: 'LANDLORD', status: 'REPORTED'),
          'moveInDefect': {..._claim(status: 'PENDING'), 'canRespond': false},
        };
      await tester.pumpWidget(
        MaterialApp(
          home: MaintenanceCaseScreen(caseId: 'case-1', api: api),
        ),
      );
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('View dated condition notice'),
        200,
      );
      expect(find.text('I agree this was present at move-in'), findsNothing);
      expect(find.text('Dispute move-in condition'), findsNothing);
    },
  );

  testWidgets('defect window configuration can be disabled before signing', (
    tester,
  ) async {
    final api = _Api()
      ..terms = {
        'id': 'tenancy-1',
        'role': 'AGENT',
        'minorRepairCap': null,
        'agentMayAgreeCosts': false,
        'capabilities': {
          'editMinorRepairCap': false,
          'editAgentAuthority': false,
        },
        'moveInDefects': {
          'windowDays': 30,
          'opensAt': '2026-10-01',
          'deadline': '2026-10-30',
          'canSubmit': false,
          'canEditWindow': true,
          'checkInId': null,
          'targets': [],
        },
      };
    await tester.pumpWidget(
      MaterialApp(
        home: TenancyScreen(
          tenancy: const TenancySummary(
            id: 'tenancy-1',
            role: 'AGENT',
            propertyId: 'property-1',
            property: 'Unit 1',
            postalCode: '123456',
            landlord: 'Landlord',
            tenant: 'Tenant',
            maintenanceCases: 0,
            inspections: 1,
          ),
          api: api,
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Edit').hitTestable(), 200);
    await tester.tap(find.text('Edit'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField), '0');
    await tester.pumpAndSettle();
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();
    expect(api.updatedTerms, {'defectWindowDays': 0});
  });

  testWidgets(
    'report calls the claim a condition notice and requires a reason to dispute',
    (tester) async {
      final api = _Api()
        ..reportData = {
          ...reportJson(status: 'COMPLETED'),
          'addenda': [
            {
              ...addendumJson(acknowledgeAs: 'LANDLORD'),
              'source': 'MOVE_IN_DEFECT',
              'moveInDefect': {
                'caseId': 'case-1',
                'reportedAt': '2026-10-10T08:00:00Z',
                'deadline': '2026-10-30',
              },
              'disputeAs': 'LANDLORD',
              'acknowledgeInPerson': true,
            },
          ],
        };
      await tester.pumpWidget(
        MaterialApp(
          home: ReportScreen(id: 'inspection-1', api: api),
        ),
      );
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Dispute move-in condition'),
        350,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('Condition reported: Dishwasher'), findsOneWidget);
      expect(find.text('Replaced: Dishwasher'), findsNothing);
      expect(find.text('I agree this was present at move-in'), findsOneWidget);
      expect(find.textContaining('In person:'), findsNothing);
      await tester.ensureVisible(find.text('Dispute move-in condition'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Dispute move-in condition'));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<FilledButton>(
              find.ancestor(
                of: find.text('Record dispute'),
                matching: find.byType(FilledButton),
              ),
            )
            .onPressed,
        isNull,
      );
      await tester.enterText(
        find.byType(TextField),
        'This happened after handover.',
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Record dispute'));
      await tester.pumpAndSettle();
      expect(api.disputes, ['This happened after handover.']);
    },
  );
}
