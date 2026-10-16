import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/screens/inspection_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

/// A report awaiting signature: the landlord was emailed the link, the tenant has no
/// address on file. The agent can email the landlord again from the signature tile.
class _FakeApi extends Api {
  _FakeApi({this.withParties = true})
    : super(attachAuth: false, cache: ReadCache());
  final bool withParties;
  final emailed = <String>[];

  @override
  Future<InspectionDetail> inspection(String id) async =>
      InspectionDetail.fromJson({
        'id': id,
        'tenancyRecordId': 'tenancy-1',
        'kind': 'CHECK_IN',
        'status': 'AWAITING_SIGNATURE',
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
        'maintenanceHistory': <Map<String, dynamic>>[],
        if (withParties)
          'signingParties': [
            {
              'stakeholderId': 'landlord-1',
              'role': 'LANDLORD',
              'email': 'lena@example.com',
              'signedAt': null,
              'signingEmail': {
                'state': emailed.isEmpty ? 'SENT' : 'QUEUED',
                'at': '2026-10-16T02:00:00.000Z',
              },
            },
            {
              'stakeholderId': 'tenant-1',
              'role': 'TENANT',
              'email': null,
              'signedAt': null,
              'signingEmail': null,
            },
          ],
      });

  @override
  Future<void> emailSigningLink(
    String inspectionId,
    String stakeholderId,
  ) async {
    emailed.add(stakeholderId);
  }
}

Future<void> _pump(WidgetTester tester, _FakeApi api) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: buildKiviloTheme(),
      home: InspectionScreen(id: 'inspection-1', api: api),
    ),
  );
  await tester.pumpAndSettle();
  await tester.scrollUntilVisible(
    find.text('Tenant · Awaiting signature'),
    300,
  );
}

void main() {
  testWidgets('shows each party\'s signing email and resends the link', (
    tester,
  ) async {
    final api = _FakeApi();
    await _pump(tester, api);

    expect(find.text('Signing link emailed 16 Oct 2026'), findsOneWidget);
    expect(find.text('No email on file'), findsOneWidget);
    // Only the party with an address gets a button.
    expect(find.text('Resend'), findsOneWidget);
    expect(find.text('Email signing link'), findsNothing);

    await tester.tap(find.text('Resend'));
    await tester.pumpAndSettle();

    expect(api.emailed, ['landlord-1']);
    expect(
      find.text('Signing link on its way to Lena Landlord'),
      findsOneWidget,
    );
    // Refreshed: the new request is waiting to go, so it cannot be doubled.
    expect(find.text('Emailing the signing link'), findsOneWidget);
    final resend = tester.widget<TextButton>(
      find.ancestor(of: find.text('Resend'), matching: find.byType(TextButton)),
    );
    expect(resend.onPressed, isNull);
  });

  testWidgets('a server without signing emails shows the tiles as before', (
    tester,
  ) async {
    await _pump(tester, _FakeApi(withParties: false));

    expect(find.text('Landlord · Awaiting signature'), findsOneWidget);
    expect(find.text('No email on file'), findsNothing);
    expect(find.byIcon(Icons.mail_outline), findsNothing);
  });
}
