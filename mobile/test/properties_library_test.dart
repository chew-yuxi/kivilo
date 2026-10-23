import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/agency.dart';
import 'package:kivilo/models/property_work.dart';
import 'package:kivilo/models/renewal.dart';
import 'package:kivilo/screens/properties_screen.dart';
import 'package:kivilo/screens/property_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

PropertyWorkItem _property(
  String id,
  String address,
  String tenant,
  String stage,
  String label, {
  String state = 'ACTIVE',
}) => PropertyWorkItem(
  id: id,
  address: address,
  state: state,
  tenant: tenant,
  stage: stage,
  stageLabel: label,
  reports: 1,
  nextInspectionId: 'report-$id',
  nextInspectionKind: 'CHECK_IN',
);

final _active = [
  _property(
    'draft',
    '12 Bayview Road',
    'Alice Tan',
    'CHECK_IN_IN_PROGRESS',
    'Check-in in progress',
  ),
  _property(
    'review',
    '8 Orchard Lane',
    'Ben Lim',
    'CHECK_OUT_IN_PROGRESS',
    'Check-out in progress',
  ),
  _property(
    'awaiting',
    '24 Bayview Road',
    'Chandra Singh',
    'CHECK_IN_AWAITING',
    'Check-in awaiting signatures',
  ),
  _property(
    'due',
    '3 Emerald Hill',
    'Dana Lee',
    'CHECK_OUT_DUE',
    'Check-out due',
  ),
  _property(
    'running',
    '9 Holland Close',
    'Eve Ong',
    'RUNNING',
    'Tenancy running',
  ),
];

class _LibraryApi extends Api {
  _LibraryApi({List<PropertyWorkItem>? active, this.canOpenDocuments = false})
    : active = active ?? _active,
      super(attachAuth: false, cache: ReadCache());

  final List<PropertyWorkItem> active;
  final bool canOpenDocuments;
  final states = <String>[];

  @override
  Future<AgencyIndex> agencies() async =>
      const AgencyIndex(agencies: [], invitations: []);
  @override
  Future<String?> workspacePreference() async => null;
  @override
  Future<void> saveWorkspacePreference(String? value) async {}
  @override
  Future<List<RenewalReminder>> renewals() async => [];
  @override
  Future<List<PropertyWorkItem>> propertyWork({
    String? agencyId,
    String? assigneeId,
    bool personal = false,
    String state = 'active',
  }) async {
    if (readingSavedCopy) throw StateError('nothing saved');
    states.add(state);
    return switch (state) {
      'archived' => [
        _property(
          'old',
          '1 Archive Walk',
          'Fay Goh',
          'ENDED',
          'Ended',
          state: 'ARCHIVED',
        ),
      ],
      'trash' => [],
      _ => active,
    };
  }

  @override
  Future<PropertyOverview> propertyOverview(String id) async =>
      PropertyOverview(
        id: id,
        address: '12 Bayview Road',
        state: 'ACTIVE',
        stage: 'CHECK_IN_IN_PROGRESS',
        stageLabel: 'Check-in in progress',
        canOpenTimeline: false,
        nextInspectionId: 'report-draft',
        nextInspectionKind: 'CHECK_IN',
        terms: [
          PropertyTerm(
            canOpenDocuments: canOpenDocuments,
            tenancyId: 't',
            startDate: '2026-01-01T00:00:00.000Z',
            endDate: '2027-12-31T00:00:00.000Z',
            tenant: 'Alice Tan',
            landlord: 'Landlord',
            reports: [
              PropertyReport(
                id: 'report-draft',
                kind: 'CHECK_IN',
                status: 'DRAFT',
                createdAt: '2026-01-01T00:00:00.000Z',
              ),
            ],
          ),
        ],
      );
}

Future<void> _open(WidgetTester tester, _LibraryApi api) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(390, 1600);
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      theme: buildKiviloTheme(),
      home: PropertiesScreen(api: api),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _chip(WidgetTester tester, String label) async {
  await tester.ensureVisible(find.text(label));
  await tester.tap(find.text(label));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('per-term documents use their own permission before repairs are available', (tester) async {
    for (final allowed in [false, true]) {
      await tester.pumpWidget(MaterialApp(
        key: ValueKey(allowed),
        theme: buildKiviloTheme(),
        home: PropertyScreen(propertyId: 'property-1', api: _LibraryApi(canOpenDocuments: allowed)),
      ));
      await tester.pumpAndSettle();
      expect(find.text('Repairs and assets'), findsNothing);
      expect(find.text('Documents'), allowed ? findsOneWidget : findsNothing);
    }
    expect(PropertyTerm.fromJson({
      'tenancyId': 'old', 'startDate': '2024-01-01', 'endDate': '2025-01-01',
      'tenant': 'Previous tenant', 'landlord': 'Owner', 'reports': [],
      'canOpenDocuments': true,
    }).canOpenDocuments, isTrue);
  });
  testWidgets(
    'lists each property once with its stage, and searches address, tenant and stage',
    (tester) async {
      final api = _LibraryApi();
      await _open(tester, api);
      expect(find.text('Properties'), findsOneWidget);
      expect(find.text('Check-in awaiting signatures'), findsOneWidget);
      expect(find.text('5 properties'), findsOneWidget);

      await tester.enterText(find.byType(TextField), '  BAYVIEW  ');
      await tester.pumpAndSettle();
      expect(find.text('12 Bayview Road'), findsOneWidget);
      expect(find.text('24 Bayview Road'), findsOneWidget);
      expect(find.text('8 Orchard Lane'), findsNothing);
      expect(find.text('2 properties found'), findsOneWidget);

      await tester.enterText(find.byType(TextField), 'check out');
      await tester.pumpAndSettle();
      expect(find.text('8 Orchard Lane'), findsOneWidget);
      expect(find.text('3 Emerald Hill'), findsOneWidget);
      expect(api.states, ['active']);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'stage filters separate work, signatures, due check-outs and running terms',
    (tester) async {
      await _open(tester, _LibraryApi());
      await _chip(tester, 'In progress · 2');
      expect(find.text('12 Bayview Road'), findsOneWidget);
      expect(find.text('8 Orchard Lane'), findsOneWidget);
      expect(find.text('24 Bayview Road'), findsNothing);

      await _chip(tester, 'Awaiting signatures · 1');
      expect(find.text('24 Bayview Road'), findsOneWidget);
      expect(find.text('12 Bayview Road'), findsNothing);

      await _chip(tester, 'Check-out due · 1');
      expect(find.text('3 Emerald Hill'), findsOneWidget);
      expect(find.text('9 Holland Close'), findsNothing);

      await _chip(tester, 'Running · 1');
      expect(find.text('9 Holland Close'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('archived and recently deleted are fetched when chosen', (
    tester,
  ) async {
    final api = _LibraryApi();
    await _open(tester, api);
    await _chip(tester, 'Archived');
    expect(api.states.last, 'archived');
    expect(find.text('1 Archive Walk'), findsOneWidget);
    expect(find.text('Archived · Ended'), findsOneWidget);
    expect(find.text('12 Bayview Road'), findsNothing);

    await _chip(tester, 'Recently deleted');
    expect(api.states.last, 'trash');
    expect(find.text('Nothing in Recently deleted'), findsOneWidget);

    await _chip(tester, 'All');
    expect(api.states.last, 'active');
    expect(find.text('12 Bayview Road'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('combines search and filters and recovers from no results', (
    tester,
  ) async {
    await _open(tester, _LibraryApi());
    await tester.enterText(find.byType(TextField), 'bayview');
    await _chip(tester, 'Running · 1');
    expect(find.text('No matching properties'), findsOneWidget);
    expect(find.text('0 properties found'), findsOneWidget);

    await tester.tap(find.text('Show all properties'));
    await tester.pumpAndSettle();
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      '',
    );
    expect(find.text('5 properties'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('opening a property shows its reports by tenancy', (
    tester,
  ) async {
    await _open(tester, _LibraryApi());
    await tester.tap(find.text('12 Bayview Road'));
    await tester.pumpAndSettle();
    expect(find.byType(PropertyScreen), findsOneWidget);
    expect(find.text('Current tenancy'), findsOneWidget);
    expect(find.text('Open check-in'), findsOneWidget);
    expect(find.text('History'), findsOneWidget);
    expect(find.text('Settings and danger zone'), findsOneWidget);
    // An old-report grant or ended term has no repairs screen to open.
    expect(find.text('Repairs and assets'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('an empty list explains the first check-in', (tester) async {
    await _open(tester, _LibraryApi(active: []));
    expect(find.text('No properties yet'), findsOneWidget);
    expect(find.text('Start check-in'), findsOneWidget);
    expect(find.byType(TextField), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
