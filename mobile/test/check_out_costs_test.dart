import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/screens/inspection_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

class _FakeApi extends Api {
  _FakeApi(this.kind) : super(attachAuth: false, cache: ReadCache());
  final String kind;

  @override
  Future<InspectionDetail> inspection(String id) async =>
      InspectionDetail.fromJson({
        'id': id,
        'tenancyRecordId': 'tenancy-1',
        'kind': kind,
        'status': 'CAPTURING',
        'property': '2 Marina Boulevard',
        'landlord': 'Lena Landlord',
        'landlordId': 'landlord-1',
        'tenant': 'Taylor Tenant',
        'tenantId': 'tenant-1',
        'summary': null,
        'baselineId': null,
        'checkOutId': null,
        'shareToken': null,
        'shareUrl': null,
        'checkOutItems': <Map<String, dynamic>>[],
        'checkInItems': <Map<String, dynamic>>[],
        'latestAssessment': null,
        'assessmentDraftChanged': false,
        'signatures': <Map<String, dynamic>>[],
        'findings': <Map<String, dynamic>>[],
        'rooms': <Map<String, dynamic>>[],
        'maintenanceHistory': [
          _record(
            'Cracked basin',
            'RESOLVED',
            'AGREED',
            'Tenant pays. Tenant arranges the repair.',
          ),
          _record('Aircon leak', 'RESOLVED', 'NOT_PROPOSED', null),
          _record('Door lock', 'ACKNOWLEDGED', 'DISPUTED', null),
          _record('Duplicate report', 'CLOSED_NO_ACTION', null, null),
        ],
      });
}

Map<String, dynamic> _record(
  String title,
  String status,
  String? standing,
  String? agreement,
) => {
  'id': title,
  'title': title,
  'status': status,
  'asset': null,
  'repairAttempts': 1,
  'evidence': 0,
  'createdAt': '2026-09-01T08:00:00Z',
  'costStanding': standing,
  'costAgreement': agreement,
};

Future<void> pump(WidgetTester tester, String kind) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: buildKiviloTheme(),
      home: InspectionScreen(id: 'inspection-1', api: _FakeApi(kind)),
    ),
  );
  await tester.pumpAndSettle();
  await tester.scrollUntilVisible(find.text('Duplicate report'), 300);
}

void main() {
  testWidgets('check-out flags repairs whose cost nobody agreed', (
    tester,
  ) async {
    await pump(tester, 'CHECK_OUT');
    expect(find.text('2 repairs have no agreed cost'), findsOneWidget);
    expect(
      find.textContaining('Cost agreed: Tenant pays. Tenant arranges'),
      findsOneWidget,
    );
    expect(find.textContaining('Nobody has proposed who pays'), findsOneWidget);
    expect(find.textContaining('Cost disputed'), findsOneWidget);
  });

  testWidgets('a check-in lists the cost standing without the warning', (
    tester,
  ) async {
    await pump(tester, 'CHECK_IN');
    expect(find.textContaining('have no agreed cost'), findsNothing);
    expect(find.textContaining('Cost disputed'), findsOneWidget);
  });
}
