import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/maintenance.dart';
import 'package:kivilo/screens/maintenance_case_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

import 'responsibility_card_test.dart' show proposalJson;

class _FakeApi extends Api {
  _FakeApi(this.detail) : super(attachAuth: false, cache: ReadCache());
  final Map<String, dynamic> detail;

  @override
  Future<MaintenanceCaseDetail> maintenanceCase(String caseId) async =>
      MaintenanceCaseDetail.fromJson(detail);
}

Map<String, dynamic> caseJson({
  required String role,
  required String status,
  bool canManage = false,
  bool canLogVisit = false,
  bool canVerify = false,
  Map<String, dynamic>? agreement,
  List<Map<String, dynamic>> visits = const [],
}) => {
  'id': 'case-1',
  'title': 'Cracked basin',
  'description': 'The kitchen basin cracked along the drain.',
  'status': status,
  'priority': 'ROUTINE',
  'category': 'PLUMBING',
  'property': 'Blk 12 Holland Ave #04-11',
  'reportedBy': {'id': 'tenant-1', 'name': 'Taylor Tenant'},
  'createdAt': '2026-10-10T08:00:00Z',
  'resolutionReason': null,
  'role': role,
  'canManage': canManage,
  'canLogVisit': canLogVisit,
  'canVerify': canVerify,
  'responsibility': {
    'arrangedBy': agreement?['arrangedBy'] ?? 'LANDLORD',
    'minorRepairCap': '150',
    'agreement': agreement,
    'pending': null,
    'history': [?agreement],
    'shares': null,
    'canPropose': true,
    'canAnswer': false,
    'canWithdraw': false,
  },
  'visits': visits,
  'evidence': <Map<String, dynamic>>[],
  'events': [
    {
      'id': 'event-1',
      'kind': 'REPORTED',
      'body': 'The kitchen basin cracked along the drain.',
      'metadata': null,
      'actor': {'id': 'tenant-1', 'name': 'Taylor Tenant'},
      'createdAt': '2026-10-10T08:00:00Z',
    },
    {
      'id': 'event-2',
      'kind': 'STATUS_CHANGED',
      'body': null,
      'metadata': {'from': 'REPORTED', 'to': 'ACKNOWLEDGED'},
      'actor': {'id': 'agent-1', 'name': 'Avery Agent'},
      'createdAt': '2026-10-11T08:00:00Z',
    },
  ],
};

Future<void> pumpCase(WidgetTester tester, Map<String, dynamic> detail) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: buildKiviloTheme(),
      home: MaintenanceCaseScreen(caseId: 'case-1', api: _FakeApi(detail)),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('a tenant who agreed to arrange the repair records it', (
    tester,
  ) async {
    await pumpCase(
      tester,
      caseJson(
        role: 'TENANT',
        status: 'ACKNOWLEDGED',
        canLogVisit: true,
        agreement: {
          ...proposalJson(status: 'ACCEPTED'),
          'arrangedBy': 'TENANT',
          'payer': 'TENANT',
          'tenantCap': null,
        },
      ),
    );
    expect(find.text('PLUMBING'), findsOneWidget);
    expect(find.text('Acknowledged'), findsWidgets);
    expect(find.text('Record the repair once it is done'), findsOneWidget);
    expect(find.text('Record completed repair'), findsOneWidget);
    expect(find.text('Acknowledge report'), findsNothing);
    expect(find.text('Close without action'), findsNothing);
    await tester.scrollUntilVisible(
      find.text('Avery Agent · 11 Oct 2026'),
      300,
    );
    expect(find.text('Taylor Tenant · 10 Oct 2026'), findsOneWidget);
  });

  testWidgets('the landlord side confirms a repair the tenant recorded', (
    tester,
  ) async {
    await pumpCase(
      tester,
      caseJson(
        role: 'AGENT',
        status: 'AWAITING_CONFIRMATION',
        canManage: true,
        canVerify: true,
        visits: [
          {
            'id': 'visit-1',
            'scheduledAt': null,
            'completedAt': '2026-10-12T09:00:00Z',
            'notes': 'Replaced the basin',
            'cost': '95.00',
            'verification': null,
          },
        ],
      ),
    );
    expect(find.text('Repaired 12 Oct 2026 · S\$95.00'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Did the repair work?'), 200);
    expect(find.text('Fixed'), findsOneWidget);
    expect(find.text('Not fixed'), findsOneWidget);
    expect(find.text('Record completed repair'), findsNothing);
  });
}
