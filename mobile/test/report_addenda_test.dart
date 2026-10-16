import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/addenda.dart';
import 'package:kivilo/models/maintenance.dart';
import 'package:kivilo/models/report.dart';
import 'package:kivilo/screens/maintenance_case_screen.dart';
import 'package:kivilo/screens/report_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

import 'maintenance_case_screen_test.dart' show caseJson;
import 'report_test.dart' show reportJson;

Map<String, dynamic> addendumJson({
  String? acknowledgeAs,
  String? landlordAt,
  String? tenantAt,
}) => {
  'id': 'addendum-1',
  'schemaVersion': 1,
  'number': 1,
  'title': 'New dishwasher',
  'reason': 'The old one failed',
  'effectiveDate': '2026-10-10T00:00:00.000Z',
  'publishedAt': '2026-10-11T02:00:00.000Z',
  'publishedBy': 'Jocelyn Ng',
  'contentHash': 'hash',
  'acknowledgedAt': landlordAt != null && tenantAt != null ? tenantAt : null,
  'acknowledgeAs': acknowledgeAs,
  'acknowledgements': [
    {'role': 'Landlord', 'name': 'Tan Wei Ming', 'acknowledgedAt': landlordAt},
    {'role': 'Tenant', 'name': 'Priya Raman', 'acknowledgedAt': tenantAt},
  ],
  'entries': [
    {
      'id': 'entry-1',
      'change': 'REPLACED',
      'roomName': 'Kitchen',
      'notes': 'Installed by the landlord',
      'target': {
        'key': 'item:item-9',
        'name': 'Dishwasher',
        'condition': 'POOR',
        'quantity': 1,
        'identifier': 'Bosch SMS2',
        'notes': null,
      },
      'line': {
        'key': 'entry:entry-1',
        'name': 'Dishwasher',
        'category': 'APPLIANCE',
        'condition': 'NEW',
        'quantity': 1,
        'identifier': 'Miele G7100 SN 4471',
        'notes': 'Installed by the landlord',
        'propertyAssetId': null,
      },
      'maintenanceCase': null,
      'photos': [
        {
          'id': 'photo-1',
          'url': 'https://storage.test/a.jpg',
          'mimeType': 'image/jpeg',
          'note': 'Rating plate',
          'label': 'After',
        },
      ],
    },
  ],
};

/// Serves the report, and records the tenant's acknowledgement the way the server does:
/// the next read shows it.
class _FakeApi extends Api {
  _FakeApi() : super(attachAuth: false, cache: ReadCache());
  final acknowledged = <String>[];

  @override
  Future<SignedReport> report(String inspectionId) async =>
      SignedReport.fromJson({
        ...reportJson(status: 'COMPLETED'),
        'addenda': [
          acknowledged.isEmpty
              ? addendumJson(
                  acknowledgeAs: 'TENANT',
                  landlordAt: '2026-10-11T03:00:00.000Z',
                )
              : addendumJson(
                  landlordAt: '2026-10-11T03:00:00.000Z',
                  tenantAt: '2026-10-12T03:00:00.000Z',
                ),
        ],
      });

  @override
  Future<void> acknowledgeAddendum(String addendumId) async =>
      acknowledged.add(addendumId);
}

class _FakeMaintenanceApi extends Api {
  _FakeMaintenanceApi(this.detail)
    : super(attachAuth: false, cache: ReadCache());
  final Map<String, dynamic> detail;
  final added = <String>[];

  @override
  Future<MaintenanceCaseDetail> maintenanceCase(String caseId) async =>
      MaintenanceCaseDetail.fromJson(detail);

  @override
  Future<String> addendumFromMaintenanceCase(String caseId) async {
    added.add(caseId);
    return 'inspection-1';
  }

  /// The draft it opens is the authoring screen's own test; here it only has to open.
  final opened = <String>[];
  @override
  Future<AddendaWorkspace> addenda(String inspectionId) {
    opened.add(inspectionId);
    return Completer<AddendaWorkspace>().future;
  }
}

/// The agent's view of a report with an update both parties still owe, recording one
/// in person the way the server does.
class _AgentApi extends Api {
  _AgentApi() : super(attachAuth: false, cache: ReadCache());
  final inPerson = <String>[];

  @override
  Future<SignedReport> report(String inspectionId) async =>
      SignedReport.fromJson({
        ...reportJson(status: 'COMPLETED'),
        'addenda': [
          {
            ...addendumJson(),
            'acknowledgeInPerson': true,
            'acknowledgements': [
              {
                'role': 'Landlord',
                'name': 'Tan Wei Ming',
                'stakeholderId': 'landlord-1',
                'acknowledgedAt': inPerson.isEmpty
                    ? null
                    : '2026-10-12T03:00:00.000Z',
                'inPerson': inPerson.isNotEmpty,
              },
              {
                'role': 'Tenant',
                'name': 'Priya Raman',
                'stakeholderId': 'tenant-1',
                'acknowledgedAt': null,
                'inPerson': false,
              },
            ],
          },
        ],
      });

  @override
  Future<void> acknowledgeAddendumInPerson(
    String addendumId,
    String stakeholderId,
  ) async => inPerson.add('$addendumId:$stakeholderId');
}

void main() {
  test('a report cached before updates existed still parses', () {
    final report = SignedReport.fromJson(reportJson(status: 'COMPLETED'));
    expect(report.addenda, isEmpty);
  });

  testWidgets(
    'shows an update after the signatures and lets the tenant acknowledge it',
    (tester) async {
      final api = _FakeApi();
      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          home: ReportScreen(id: 'inspection-1', api: api),
        ),
      );
      await tester.pumpAndSettle();

      final acknowledge = find.text('I acknowledge this update');
      await tester.scrollUntilVisible(
        acknowledge,
        300,
        scrollable: find.byType(Scrollable).first,
      );
      expect(
        find.text('Updated 10 Oct 2026 · Update 1 · Pending acknowledgement'),
        findsOneWidget,
      );
      expect(find.text('New dishwasher'), findsOneWidget);
      expect(find.text('Replaced: Dishwasher with Dishwasher'), findsOneWidget);
      expect(find.text('Miele G7100 SN 4471'), findsOneWidget);
      expect(
        find.text('Tenant Priya Raman: pending acknowledgement'),
        findsOneWidget,
      );

      await tester.ensureVisible(acknowledge);
      await tester.pumpAndSettle();
      await tester.tap(acknowledge);
      await tester.pumpAndSettle();

      expect(api.acknowledged, ['addendum-1']);
      expect(find.text('I acknowledge this update'), findsNothing);
      expect(find.text('Updated 10 Oct 2026 · Update 1'), findsOneWidget);
      expect(
        find.text('Tenant Priya Raman: acknowledged 12 Oct 2026'),
        findsOneWidget,
      );
    },
  );

  testWidgets(
    'an agent sees the status of an update but cannot acknowledge it',
    (tester) async {
      final api = _FakeApi()..acknowledged.add('already');
      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          home: ReportScreen(id: 'inspection-1', api: api),
        ),
      );
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Landlord Tan Wei Ming: acknowledged 11 Oct 2026'),
        300,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('I acknowledge this update'), findsNothing);
    },
  );

  testWidgets('an agent adds a resolved repair to the report as an update', (
    tester,
  ) async {
    final api = _FakeMaintenanceApi(
      caseJson(role: 'AGENT', status: 'RESOLVED', canManage: true),
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: MaintenanceCaseScreen(caseId: 'case-1', api: api),
      ),
    );
    await tester.pumpAndSettle();

    final button = find.text('Add to the report as an update');
    await tester.scrollUntilVisible(button, 300);
    await tester.ensureVisible(button);
    await tester.pumpAndSettle();
    await tester.tap(button);
    // Not pumpAndSettle: the draft's loading spinner never settles.
    for (var frame = 0; frame < 10; frame++) {
      await tester.pump(const Duration(milliseconds: 100));
    }

    expect(api.added, ['case-1']);
    // Straight into the draft, to finish and publish on the phone.
    expect(find.text('Updates since signing'), findsOneWidget);
    expect(api.opened, ['inspection-1']);
  });

  testWidgets(
    'the landlord acknowledges in person on the agent\'s phone, and it says so',
    (tester) async {
      final api = _AgentApi();
      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          home: ReportScreen(id: 'inspection-1', api: api),
        ),
      );
      await tester.pumpAndSettle();

      final landlord = find.text('In person: Landlord Tan Wei Ming');
      await tester.scrollUntilVisible(
        landlord,
        300,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('In person: Tenant Priya Raman'), findsOneWidget);
      // The agent is no party, so there is no button to acknowledge as themselves.
      expect(find.text('I acknowledge this update'), findsNothing);

      await tester.ensureVisible(landlord);
      await tester.pumpAndSettle();
      await tester.tap(landlord);
      await tester.pumpAndSettle();
      expect(find.text('Hand the phone to Tan Wei Ming'), findsOneWidget);
      await tester.tap(find.text('I acknowledge this update'));
      await tester.pumpAndSettle();

      expect(api.inPerson, ['addendum-1:landlord-1']);
      await tester.scrollUntilVisible(
        find.text('Landlord Tan Wei Ming: acknowledged in person 12 Oct 2026'),
        300,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('In person: Landlord Tan Wei Ming'), findsNothing);
      expect(find.text('In person: Tenant Priya Raman'), findsOneWidget);
    },
  );

  testWidgets('a tenant is not offered to add a repair to the report', (
    tester,
  ) async {
    final api = _FakeMaintenanceApi(
      caseJson(role: 'TENANT', status: 'RESOLVED'),
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: MaintenanceCaseScreen(caseId: 'case-1', api: api),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Add to the report as an update'), findsNothing);
  });
}
