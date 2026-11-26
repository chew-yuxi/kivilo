import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/handover.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/models/maintenance.dart';
import 'package:kivilo/models/property_work.dart';
import 'package:kivilo/models/report.dart';
import 'package:kivilo/models/supporting_documents.dart';
import 'package:kivilo/screens/new_inspection_screen.dart';
import 'package:kivilo/screens/report_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_format.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

import 'report_test.dart' show reportJson;

/// A Malaysian property in the app: its money in ringgit wherever it is shown, its
/// address written the Malaysian way, and none of Singapore's HDB or CEA checks.

class _NoDraft extends ReadCache {
  @override
  Future<Object?> read(String key) async => null;
  @override
  Future<bool> write(String key, Object? value) async => true;
}

class _CheckInApi extends Api {
  _CheckInApi() : super(attachAuth: false);
  final created = <Map<String, dynamic>>[];
  var lookups = 0;

  @override
  Future<List<AddressMatch>> searchAddresses(String query) async {
    lookups++;
    return const [];
  }

  @override
  Future<String> createInspection(Map<String, dynamic> body) async {
    created.add(body);
    return 'inspection-1';
  }
}

class _ReportApi extends Api {
  _ReportApi(this.json) : super(attachAuth: false, cache: ReadCache());
  final Map<String, dynamic> json;

  @override
  Future<SignedReport> report(String inspectionId) async =>
      SignedReport.fromJson(json);
}

Future<_CheckInApi> _newCheckIn(
  WidgetTester tester, {
  String country = 'SG',
  bool offerVerification = true,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(400, 900);
  addTearDown(tester.view.reset);
  final api = _CheckInApi();
  await tester.pumpWidget(
    MaterialApp(
      theme: buildKiviloTheme(),
      home: NewInspectionScreen(
        api: api,
        cache: _NoDraft(),
        country: country,
        offerVerification: offerVerification,
      ),
    ),
  );
  await tester.pumpAndSettle();
  return api;
}

/// Scrolls down to [finder], or up with a negative [by].
Future<void> _reveal(
  WidgetTester tester,
  Finder finder, {
  double by = 200,
}) async {
  await tester.scrollUntilVisible(
    finder,
    by,
    scrollable: find.byType(Scrollable).first,
  );
  await tester.pumpAndSettle();
}

void main() {
  test('amounts are written in the property currency', () {
    expect(money(1200, 'SGD'), 'S\$1200.00');
    expect(money(1200, 'MYR'), 'RM1200.00');
    expect(currencySymbol('MYR'), 'RM');
    expect(currencyFor('MY'), 'MYR');
    expect(currencyFor('SG'), 'SGD');
    expect(countryName('MY'), 'Malaysia');
  });

  test(
    'models read the currency, and a copy saved before it existed is Singapore',
    () {
      final malaysian = SignedReport.fromJson({
        ...reportJson(),
        'currency': 'MYR',
      });
      expect(malaysian.currency, 'MYR');
      expect(SignedReport.fromJson(reportJson()).currency, 'SGD');

      Map<String, dynamic> me([Map<String, dynamic> extra = const {}]) => {
        'id': 'agent',
        'name': 'Agent',
        'roles': ['AGENT'],
        ...extra,
      };
      expect(UserProfile.fromJson(me({'country': 'MY'})).country, 'MY');
      // Asked once: a server that sends null has not had an answer yet.
      expect(UserProfile.fromJson(me({'country': null})).country, isNull);
      // A copy saved before countries existed is a Singapore account's.
      expect(UserProfile.fromJson(me()).country, 'SG');

      final property = StartableProperty.fromJson({
        'id': 'property-1',
        'address': 'A-12-3, Jalan Ampang, 50450 Malaysia',
        'propertyType': 'PRIVATE_NON_LANDED',
        'country': 'MY',
        'lastTenant': 'Tenant',
        'lastEndDate': '2027-01-01',
      });
      expect(property.country, 'MY');
      // The new check-in draft keeps it across a restart.
      expect(StartableProperty.fromJson(property.toJson()).country, 'MY');

      final handover = TenantHandover.fromJson({
        'tenancyId': 't',
        'url': 'https://my.kivilo.app/handover/x',
        'windowDays': 30,
        'deadline': '2026-12-30',
        'modules': <dynamic>[],
      });
      expect(handover.country, 'SG');

      final documents = SupportingDocuments.fromJson({
        'tenancyId': 't',
        'propertyLabel': 'A-12-3, Jalan Ampang, 50450 Malaysia',
        'tenantName': 'Tenant',
        'startDate': '2026-12-01T00:00:00.000Z',
        'endDate': '2027-11-30T00:00:00.000Z',
        'role': 'agent',
        'canRequest': true,
        'canUpload': false,
        'currency': 'MYR',
        'agreement': {
          'requestId': null,
          'files': <dynamic>[],
          'currentFileId': null,
          'canUpload': true,
          'canReview': true,
          'terms': {
            'fileId': 'f',
            'page': 2,
            'quote': 'The tenant shall pay the first RM200 for each repair.',
            'rule': 'FIRST_AMOUNT',
            'tenantCap': '200.00',
            'confirmedAt': '2026-12-02T00:00:00.000Z',
            'confirmedBy': {'id': 'agent', 'name': 'Agent'},
          },
          'termsMatchCurrentFile': true,
        },
        'requests': <dynamic>[],
      });
      expect(
        documents.agreement.terms!.summary(documents.currency),
        'Tenant pays the first RM200.00 per repair',
      );
      expect(
        describeProposal(
          arrangedBy: 'LANDLORD',
          payer: 'SHARED',
          tenantCap: '200.00',
          currency: documents.currency,
        ),
        'Tenant pays the first RM200.00, landlord pays the rest. '
        'Landlord arranges the repair.',
      );
    },
  );

  test('an inspection carries its country and currency', () {
    final inspection = InspectionDetail.fromJson({
      'id': 'inspection-1',
      'kind': 'CHECK_OUT',
      'status': 'COMPLETED',
      'property': 'A-12-3, Jalan Ampang, 50450 Malaysia',
      'landlord': 'Landlord',
      'tenant': 'Tenant',
      'landlordId': 'l',
      'tenantId': 't',
      'summary': null,
      'country': 'MY',
      'currency': 'MYR',
      'rooms': <dynamic>[],
      'signatures': <dynamic>[],
      'findings': <dynamic>[],
      'baselineId': null,
      'checkOutId': null,
      'shareToken': null,
      'shareUrl': null,
      'latestAssessment': null,
      'assessmentDraftChanged': false,
      'checkOutItems': <dynamic>[],
      'checkInItems': <dynamic>[],
    });
    expect(inspection.country, 'MY');
    expect(inspection.currency, 'MYR');
  });

  testWidgets('a Malaysian agent’s new property asks for a Malaysian address', (
    tester,
  ) async {
    final api = await _newCheckIn(tester, country: 'MY');
    // The country is the agent's, never chosen per property.
    expect(find.text('Malaysia'), findsNothing);
    // No OneMap, which knows Singapore only.
    expect(
      find.widgetWithText(TextField, 'Find the address (optional)'),
      findsNothing,
    );
    expect(find.text('Postcode (required)'), findsOneWidget);
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Address (required)'),
      'Residensi Sentral, Jalan Tun Sambanthan, Kuala Lumpur',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Postcode (required)'),
      '504700',
    );

    // Condominium, landed and commercial: no HDB in Malaysia.
    await _reveal(tester, find.text('Condominium'));
    await tester.ensureVisible(find.text('Condominium'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Condominium'));
    await tester.pumpAndSettle();
    expect(find.text('HDB'), findsNothing);
    expect(find.text('Landed'), findsWidgets);
    await tester.tap(find.text('Condominium').last);
    await tester.pumpAndSettle();

    await _reveal(tester, find.text('Fully furnished'));
    await tester.tap(find.text('Fully furnished'));
    await tester.pumpAndSettle();
    for (final (label, value) in [
      ('Landlord name (required)', 'Aminah Binti Yusof'),
      ('Tenant name (required)', 'Lim Wei Jie'),
    ]) {
      final field = find.widgetWithText(TextFormField, label);
      await _reveal(tester, field);
      await tester.enterText(field, value);
    }
    // CEA due diligence is Singapore's, so it is not offered here.
    expect(find.text('Verify both parties (CEA)'), findsNothing);
    await _reveal(tester, find.text('Monthly rent (MYR) (optional)'));
    expect(find.text('Deposit (MYR) (optional)'), findsOneWidget);

    final postcode = find.widgetWithText(TextFormField, 'Postcode (required)');
    await _reveal(tester, postcode, by: -200);
    await tester.tap(find.text('Create check-in'));
    await tester.pumpAndSettle();
    expect(api.created, isEmpty);
    expect(find.text('A Malaysian postcode has 5 digits'), findsOneWidget);
    await tester.enterText(postcode, '50470');
    await tester.tap(find.text('Create check-in'));
    await tester.pumpAndSettle();

    expect(api.created, hasLength(1));
    expect(api.created.single, containsPair('country', 'MY'));
    expect(api.created.single, containsPair('postalCode', '50470'));
    expect(
      api.created.single,
      containsPair('propertyType', 'PRIVATE_NON_LANDED'),
    );
    expect(api.created.single.containsKey('verifyParties'), isFalse);
    expect(api.lookups, 0);
  });

  testWidgets('a Singapore agent’s New check-in is as it was', (tester) async {
    final api = await _newCheckIn(tester);
    expect(find.text('Malaysia'), findsNothing);
    expect(find.text('Singapore'), findsNothing);
    expect(
      find.widgetWithText(TextField, 'Find the address (optional)'),
      findsOneWidget,
    );
    expect(find.text('Postal code (required)'), findsOneWidget);
    await _reveal(tester, find.text('Private, non-landed'));
    await tester.ensureVisible(find.text('Private, non-landed'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Private, non-landed'));
    await tester.pumpAndSettle();
    expect(find.text('HDB'), findsOneWidget);
    await tester.tap(find.text('HDB').last);
    await tester.pumpAndSettle();
    await _reveal(tester, find.text('Verify both parties (CEA)'));
    await _reveal(tester, find.text('Monthly rent (SGD) (optional)'));
    expect(api.created, isEmpty);
  });

  testWidgets('a Malaysian report states its deposit in ringgit', (
    tester,
  ) async {
    final api = _ReportApi({
      ...reportJson(status: 'COMPLETED'),
      'kind': 'CHECK_OUT',
      'property': 'A-12-3, Residensi Sentral, Kuala Lumpur, 50470 Malaysia',
      'deposit': '5000',
      'currency': 'MYR',
      'assessment': {
        'version': 1,
        'publishedAt': '2026-12-19T02:00:00.000Z',
        'summary': null,
        'findings': [
          {
            'id': 'finding-1',
            'itemLabel': 'Kitchen, Worktop',
            'verdict': 'TENANT_LIABLE',
            'estimatedCost': '320.10',
            'rationale': 'Burn mark',
            'maintenanceTitle': null,
            'evidence': <dynamic>[],
          },
        ],
        'statement': {
          'deposit': 5000,
          'deductions': 320.1,
          'toReturn': 4679.9,
          'deductedCount': 1,
          'responses': <dynamic>[],
          'answerAs': null,
          'answerInPerson': <dynamic>[],
        },
      },
    });
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: ReportScreen(id: 'inspection-1', api: api),
      ),
    );
    await tester.pumpAndSettle();
    await _reveal(tester, find.text('Deposit statement'));
    expect(find.text('RM5000.00'), findsOneWidget);
    expect(find.text('-RM320.10'), findsOneWidget);
    expect(find.text('RM4679.90'), findsOneWidget);
    expect(find.textContaining('S\$'), findsNothing);
  });
}
