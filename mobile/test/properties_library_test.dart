import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/agency.dart';
import 'package:kivilo/models/cdd.dart';
import 'package:kivilo/models/maintenance.dart';
import 'package:kivilo/models/property_work.dart';
import 'package:kivilo/models/renewal.dart';
import 'package:kivilo/screens/cdd_screen.dart';
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
  _LibraryApi({
    List<PropertyWorkItem>? active,
    this.canOpenDocuments = false,
    this.includeCare = false,
    this.canEditDetails = true,
    this.reportStatus = 'DRAFT',
    this.reportKind = 'CHECK_IN',
    this.assets = const [],
    this.verification,
  }) : active = active ?? _active,
       super(attachAuth: false, cache: ReadCache());

  final List<PropertyWorkItem> active;
  final TenancyVerification? verification;
  final verifyRequests = <(String, List<String>?)>[];

  @override
  Future<CddCase> cddCase(String id) async => CddCase.fromJson({
    'id': id,
    'status': 'WAITING_FOR_CLIENT',
    'clientRole': 'TENANT',
    'client': {'id': 'tenant', 'name': 'Alice Tan', 'email': null},
    'particulars': null,
    'screeningRuns': [],
  });

  @override
  Future<List<({String role, String caseId})>> verifyTenancy(String tenancyId, {List<String>? roles}) async {
    verifyRequests.add((tenancyId, roles));
    return [(role: roles!.single, caseId: 'case-new')];
  }

  final bool canOpenDocuments;
  final bool includeCare;
  final bool canEditDetails;
  final String reportStatus;
  final String reportKind;
  final List<PropertyAssetSummary> assets;
  final states = <String>[];
  Map<String, dynamic>? updatedDetails;
  Map<String, dynamic>? updatedAsset;
  String? retiredAssetId;

  @override
  Future<UserProfile> me() async {
    if (readingSavedCopy) throw StateError('nothing saved');
    return const UserProfile(id: 'agent', name: 'Agent', roles: ['AGENT']);
  }

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
  Future<PropertyOverview> propertyOverview(
    String id,
  ) async => PropertyOverview(
    id: id,
    address: '12 Bayview Road',
    line1: '12 Bayview Road',
    unit: '#02-03',
    postalCode: '123456',
    propertyType: 'PRIVATE_NON_LANDED',
    state: 'ACTIVE',
    stage: 'CHECK_IN_IN_PROGRESS',
    stageLabel: 'Check-in in progress',
    canOpenTimeline: false,
    canEditPropertyDetails: canEditDetails,
    propertyDetailsLockedReason: canEditDetails
        ? null
        : 'Property details are fixed because a report was sent for signature.',
    nextInspectionId: 'report-draft',
    nextInspectionKind: 'CHECK_IN',
    terms: [
      PropertyTerm(
        canOpenDocuments: canOpenDocuments,
        verification: verification,
        tenancyId: 't',
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2027-12-31T00:00:00.000Z',
        tenant: 'Alice Tan',
        landlord: 'Landlord',
        monthlyRent: '3200',
        deposit: '6400',
        canEditDetails: canEditDetails,
        detailsLockedReason: canEditDetails
            ? null
            : 'These details are fixed because a report was sent for signature.',
        tenancy: includeCare
            ? const TenancySummary(
                id: 't',
                role: 'AGENT',
                propertyId: 'property-1',
                property: '12 Bayview Road',
                postalCode: '123456',
                landlord: 'Landlord',
                tenant: 'Alice Tan',
                maintenanceCases: 0,
                inspections: 1,
              )
            : null,
        reports: [
          PropertyReport(
            id: 'report-draft',
            kind: reportKind,
            status: reportStatus,
            createdAt: '2026-01-01T00:00:00.000Z',
          ),
        ],
      ),
    ],
  );

  @override
  Future<List<MaintenanceCaseSummary>> maintenanceCases(
    String tenancyId,
  ) async => const [];

  @override
  Future<List<PropertyAssetSummary>> propertyAssets(String propertyId) async =>
      retiredAssetId == null ? assets : const [];

  @override
  Future<void> updatePropertyAsset(
    String propertyId,
    String assetId,
    Map<String, dynamic> body,
  ) async {
    updatedAsset = body;
  }

  @override
  Future<void> retirePropertyAsset(String propertyId, String assetId) async {
    retiredAssetId = assetId;
  }

  @override
  Future<TenancyDetail> tenancy(String tenancyId) async => const TenancyDetail(
    id: 't',
    role: 'AGENT',
    agentMayAgreeCosts: false,
    canEditMinorRepairCap: true,
    canEditAgentAuthority: false,
  );

  @override
  Future<void> updateTenancyDetails(
    String tenancyId,
    Map<String, dynamic> body,
  ) async {
    updatedDetails = body;
  }
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
  testWidgets('report actions distinguish work, signatures and completed reports', (
    tester,
  ) async {
    for (final kind in ['CHECK_IN', 'CHECK_OUT']) {
      final label = kind == 'CHECK_IN' ? 'check-in' : 'check-out';
      for (final status in ['DRAFT', 'AWAITING_SIGNATURE', 'COMPLETED']) {
        await tester.pumpWidget(
          MaterialApp(
            key: ValueKey('$kind-$status'),
            theme: buildKiviloTheme(),
            home: PropertyScreen(
              propertyId: 'property-1',
              api: _LibraryApi(reportStatus: status, reportKind: kind),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(
          find.text('Continue $label'),
          status == 'DRAFT' ? findsOneWidget : findsNothing,
        );
        if (status == 'AWAITING_SIGNATURE') {
          expect(find.text('View $label signatures'), findsOneWidget);
        } else if (status == 'COMPLETED') {
          expect(find.text('View $label report'), findsOneWidget);
        }
        expect(tester.takeException(), isNull);
      }
    }
  });

  testWidgets('unavailable party emails do not look like missing data', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: PropertyScreen(
          propertyId: 'property-1',
          api: _LibraryApi(canEditDetails: false),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.textContaining('email not provided'), findsNothing);
    expect(find.text('People, dates, rent and deposit'), findsOneWidget);
  });

  testWidgets(
    'per-term documents use their own permission before repairs are available',
    (tester) async {
      for (final allowed in [false, true]) {
        await tester.pumpWidget(
          MaterialApp(
            key: ValueKey(allowed),
            theme: buildKiviloTheme(),
            home: PropertyScreen(
              propertyId: 'property-1',
              api: _LibraryApi(canOpenDocuments: allowed),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text('Repairs and assets'), findsNothing);
        expect(find.text('Documents'), allowed ? findsOneWidget : findsNothing);
      }
      expect(
        PropertyTerm.fromJson({
          'tenancyId': 'old',
          'startDate': '2024-01-01',
          'endDate': '2025-01-01',
          'tenant': 'Previous tenant',
          'landlord': 'Owner',
          'reports': [],
          'canOpenDocuments': true,
        }).canOpenDocuments,
        isTrue,
      );
    },
  );
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

  testWidgets(
    'opening a property shows active work and current tenancy details',
    (tester) async {
      await _open(tester, _LibraryApi());
      await tester.tap(find.text('12 Bayview Road'));
      await tester.pumpAndSettle();
      expect(find.byType(PropertyScreen), findsOneWidget);
      expect(find.text('Reports and documents'), findsOneWidget);
      expect(find.text('Tenancy details'), findsOneWidget);
      expect(find.text('Continue check-in'), findsOneWidget);
      expect(find.text('Change log'), findsOneWidget);
      expect(find.text('Archive or delete property'), findsOneWidget);
      // An old-report grant or ended term has no repairs screen to open.
      expect(find.text('Repairs and assets'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'property page contains repairs and assets without another page',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(390, 4000);
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          home: PropertyScreen(
            propertyId: 'property-1',
            api: _LibraryApi(includeCare: true),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(Scaffold), findsOneWidget);
      expect(find.text('Reports and documents'), findsOneWidget);
      expect(find.text('Repairs and assets'), findsNothing);
      expect(find.text('Property care'), findsOneWidget);
      expect(find.text('Maintenance'), findsOneWidget);
      expect(find.text('Property assets'), findsOneWidget);
      expect(find.text('Tenancy access'), findsOneWidget);
      expect(find.text('Continue check-in'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('adds party emails from the current tenancy card', (
    tester,
  ) async {
    final api = _LibraryApi();
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(390, 1600);
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: PropertyScreen(propertyId: 'property-1', api: api),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      find.text('Landlord email not provided · Tenant email not provided'),
      findsOneWidget,
    );
    await tester.tap(find.text('Tenancy details'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Address'),
      '14 Bayview Road',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Landlord name'),
      'Corrected Owner',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Landlord email (optional)'),
      'OWNER@EXAMPLE.COM',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Tenant email (optional)'),
      'tenant@example.com',
    );
    await tester.tap(find.text('Save details'));
    await tester.pumpAndSettle();

    expect(find.text('Save tenancy changes?'), findsOneWidget);
    await tester.tap(find.text('Save changes'));
    await tester.pumpAndSettle();

    expect(
      api.updatedDetails,
      containsPair('landlordEmail', 'owner@example.com'),
    );
    expect(api.updatedDetails, containsPair('line1', '14 Bayview Road'));
    expect(api.updatedDetails, containsPair('landlordName', 'Corrected Owner'));
    expect(
      api.updatedDetails,
      containsPair('tenantEmail', 'tenant@example.com'),
    );
    expect(api.updatedDetails, containsPair('monthlyRent', '3200'));
    expect(tester.takeException(), isNull);
  });

  testWidgets('opens fixed tenancy details in a readable view', (tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(390, 1600);
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: PropertyScreen(
          propertyId: 'property-1',
          api: _LibraryApi(canEditDetails: false),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Tenancy details'));
    await tester.pumpAndSettle();

    expect(
      find.text(
        'These details are fixed because a report was sent for signature.',
      ),
      findsOneWidget,
    );
    expect(find.text('Landlord name'), findsOneWidget);
    expect(find.text('Tenant name'), findsOneWidget);
    expect(find.text('3200'), findsOneWidget);
    expect(find.text('6400'), findsOneWidget);
    expect(find.text('Save details'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'edits and retires a property asset while keeping history explicit',
    (tester) async {
      final api = _LibraryApi(
        includeCare: true,
        assets: const [
          PropertyAssetSummary(
            id: 'asset-1',
            name: 'Washer',
            category: 'APPLIANCE',
            roomLabel: 'Kitchen',
            identifier: 'WM-OLD',
            repairVisitsLast365Days: 1,
          ),
        ],
      );
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(390, 4000);
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          home: PropertyScreen(propertyId: 'property-1', api: api),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Washer'));
      await tester.pumpAndSettle();
      expect(find.text('Edit property asset'), findsOneWidget);
      await tester.enterText(
        find.widgetWithText(TextField, 'Name'),
        'Laundry washer',
      );
      await tester.tap(find.text('Save'));
      await tester.pumpAndSettle();
      expect(api.updatedAsset, containsPair('name', 'Laundry washer'));

      await tester.tap(find.text('Washer'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Retire asset'));
      await tester.pumpAndSettle();
      expect(find.text('Retire this asset?'), findsOneWidget);
      await tester.tap(find.widgetWithText(FilledButton, 'Retire asset'));
      await tester.pumpAndSettle();
      expect(api.retiredAssetId, 'asset-1');
      expect(find.text('Washer'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('groups the current report, tenancy details and documents', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(390, 1600);
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: PropertyScreen(
          propertyId: 'property-1',
          api: _LibraryApi(canOpenDocuments: true),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final actions = find.ancestor(
      of: find.text('Tenancy details'),
      matching: find.byType(Card),
    );
    expect(actions, findsOneWidget);
    expect(
      find.descendant(of: actions, matching: find.text('Continue check-in')),
      findsOneWidget,
    );
    expect(
      find.descendant(of: actions, matching: find.text('Documents')),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('an empty list explains the first check-in', (tester) async {
    await _open(tester, _LibraryApi(active: []));
    expect(find.text('No properties yet'), findsOneWidget);
    expect(find.text('Start check-in'), findsOneWidget);
    expect(find.byType(TextField), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('each party’s CEA check shows on the tenancy, and an unverified one starts in a tap', (tester) async {
    final api = _LibraryApi(
      verification: TenancyVerification(
        landlord: PartyCheck(caseId: 'case-landlord', status: 'COMPLETE', completedAt: DateTime(2026, 10, 31)),
      ),
    );
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(390, 1600);
    addTearDown(tester.view.reset);
    await tester.pumpWidget(MaterialApp(theme: buildKiviloTheme(), home: PropertyScreen(propertyId: 'property-1', api: api)));
    await tester.pumpAndSettle();

    expect(find.text('Landlord identity · Landlord'), findsOneWidget);
    expect(find.textContaining('Verified'), findsOneWidget);
    expect(find.text('Tenant identity · Alice Tan'), findsOneWidget);
    expect(find.text('Not verified yet · CEA requires it before signing'), findsOneWidget);

    await tester.tap(find.text('Tenant identity · Alice Tan'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Verify'));
    await tester.pumpAndSettle();
    expect(api.verifyRequests.single.$1, 't');
    expect(api.verifyRequests.single.$2, ['TENANT']);
    expect(find.byType(CddCaseScreen), findsOneWidget);
  });

  testWidgets('outside the preview a tenancy shows no identity checks', (tester) async {
    final api = _LibraryApi();
    await tester.pumpWidget(MaterialApp(theme: buildKiviloTheme(), home: PropertyScreen(propertyId: 'property-1', api: api)));
    await tester.pumpAndSettle();
    expect(find.textContaining('identity ·'), findsNothing);
  });
}
