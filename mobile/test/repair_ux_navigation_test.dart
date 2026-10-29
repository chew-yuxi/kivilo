import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/agency.dart';
import 'package:kivilo/models/handover.dart';
import 'package:kivilo/models/maintenance.dart';
import 'package:kivilo/models/report.dart';
import 'package:kivilo/models/supporting_documents.dart';
import 'package:kivilo/screens/agreement_terms_screen.dart';
import 'package:kivilo/screens/party_homes_screen.dart';
import 'package:kivilo/screens/report_screen.dart';
import 'package:kivilo/screens/supporting_documents_screen.dart';
import 'package:kivilo/screens/tenancy_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/workspace.dart';
import 'package:kivilo/ui/kivilo_theme.dart';
import 'package:kivilo/ui/tenant_handover.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'report_test.dart' show reportJson;

const _terms = AgreementTerms(
  fileId: 'old-agreement',
  page: 3,
  quote: 'Tenant pays the first S\$150 per repair.',
  rule: 'FIRST_AMOUNT',
  tenantCap: '150.00',
  confirmedAt: '2026-10-23T11:00:00Z',
  confirmedBy: 'Alex',
);

TenancySummary _tenancy({bool awaiting = false}) => TenancySummary(
  id: 'tenancy-1',
  role: 'TENANT',
  propertyId: 'property-1',
  property: '12 Holland Avenue #04-11',
  postalCode: '278991',
  landlord: 'Lena Landlord',
  tenant: 'Taylor Tenant',
  maintenanceCases: 0,
  inspections: 1,
  latestReportId: 'report-1',
  latestReportKind: 'CHECK_IN',
  latestReportStatus: awaiting ? 'AWAITING_SIGNATURE' : 'COMPLETED',
  awaitingMySignature: awaiting,
);

class _Api extends Api {
  _Api({this.awaiting = false, this.hasAgreement = true})
    : super(attachAuth: false);

  final bool awaiting;
  final bool hasAgreement;
  bool failDocuments = false;
  bool signed = false;
  int handoverReads = 0;
  final documentOwners = <String?>[];

  @override
  String? get currentOwnerId => 'owner-1';

  @override
  Future<UserProfile> me() async => const UserProfile(
    id: 'owner-1',
    name: 'Taylor Tenant',
    roles: ['TENANT'],
  );

  @override
  Future<AgencyIndex> agencies() async =>
      const AgencyIndex(agencies: [], invitations: []);

  @override
  Future<String?> workspacePreference() async => 'tenant';

  @override
  Future<List<TenancySummary>> tenancyWork({
    String? agencyId,
    bool personal = false,
    String? party,
  }) async => [_tenancy(awaiting: awaiting)];

  @override
  Future<List<MaintenanceCaseSummary>> maintenanceCases(
    String tenancyId,
  ) async => [];

  @override
  Future<List<PropertyAssetSummary>> propertyAssets(String propertyId) async =>
      [];

  @override
  Future<TenancyDetail> tenancy(String tenancyId) async => const TenancyDetail(
    id: 'tenancy-1',
    role: 'LANDLORD',
    agentMayAgreeCosts: false,
    canEditMinorRepairCap: true,
    canEditAgentAuthority: true,
    minorRepairCap: '150',
    maintenanceTerms: _terms,
  );

  @override
  Future<SupportingDocuments> supportingDocuments(
    String tenancyId, {
    required String? ownerId,
  }) async {
    documentOwners.add(ownerId);
    if (failDocuments) throw const ApiFailure('No signal. Try again.', null);
    return SupportingDocuments(
      tenancyId: tenancyId,
      propertyLabel: '12 Holland Avenue #04-11',
      tenantName: 'Taylor Tenant',
      startDate: '2026-10-01',
      endDate: '2027-09-30',
      role: 'landlord',
      canRequest: false,
      canUpload: true,
      requests: [],
      agreement: TenancyAgreement(
        requestId: hasAgreement ? 'agreement-slot' : null,
        files: [],
        currentFileId: hasAgreement ? 'latest-agreement' : null,
        canUpload: true,
        canReview: true,
        termsMatchCurrentFile: false,
        terms: _terms,
      ),
    );
  }

  @override
  Future<AgreementClauseAnalysis> agreementClauseAnalysis(
    String tenancyId,
    String fileId, {
    required String? ownerId,
  }) async => AgreementClauseAnalysis(
    fileId: fileId,
    status: 'TEXT',
    candidates: const [],
  );

  @override
  Future<SignedReport> report(String inspectionId) async =>
      SignedReport.fromJson({
        ...reportJson(signAs: signed ? null : 'TENANT'),
        'rooms': <Map<String, dynamic>>[],
        'signatures': <Map<String, dynamic>>[],
      });

  @override
  Future<void> signOwnReport(String inspectionId, String imageData) async {
    signed = true;
  }

  @override
  Future<TenantHandover?> handover(String inspectionId) async {
    handoverReads++;
    return null;
  }
}

class _AuthStorage extends GotrueAsyncStorage {
  @override
  Future<String?> getItem({required String key}) async => null;
  @override
  Future<void> setItem({required String key, required String value}) async {}
  @override
  Future<void> removeItem({required String key}) async {}
}

Future<void> _pump(WidgetTester tester, Widget child) async {
  await tester.pumpWidget(MaterialApp(theme: buildKiviloTheme(), home: child));
  await tester.pumpAndSettle();
}

Future<void> _openRepairTerms(WidgetTester tester, _Api api) async {
  await _pump(tester, TenancyScreen(tenancy: _tenancy(), api: api));
  await tester.scrollUntilVisible(find.text('Review repair terms'), 300);
  await tester.ensureVisible(find.text('Review repair terms'));
  await tester.tap(find.text('Review repair terms'));
  if (api.hasAgreement) {
    await tester.pumpAndSettle();
  } else {
    // Assert the navigation without waiting for Documents' independent disk queue.
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async {
    await Supabase.initialize(
      url: 'https://kivilo.test',
      publishableKey: 'publishable',
      authOptions: FlutterAuthClientOptions(
        localStorage: const EmptyLocalStorage(),
        pkceAsyncStorage: _AuthStorage(),
        detectSessionInUri: false,
        autoRefreshToken: false,
      ),
    );
    final expiresAt = DateTime.now().millisecondsSinceEpoch ~/ 1000 + 3600;
    final payload = base64Url.encode(
      utf8.encode(jsonEncode({'exp': expiresAt})),
    );
    await Supabase.instance.client.auth.recoverSession(
      jsonEncode({
        'access_token': 'e30.$payload.signature',
        'token_type': 'bearer',
        'expires_at': expiresAt,
        'refresh_token': 'fake-refresh',
        'user': {
          'id': 'owner-1',
          'aud': 'authenticated',
          'app_metadata': <String, dynamic>{},
          'user_metadata': <String, dynamic>{},
          'created_at': '2026-10-01T00:00:00Z',
        },
      }),
    );
  });
  tearDownAll(() => Supabase.instance.dispose());

  for (final awaiting in [false, true]) {
    testWidgets('party card has one property destination, awaiting=$awaiting', (
      tester,
    ) async {
      final api = _Api(awaiting: awaiting);
      final workspace = Workspace(api);
      await workspace.refresh();
      await _pump(tester, PartyHomesScreen(api: api, workspace: workspace));
      expect(find.text('View property'), findsOneWidget);
      expect(find.text('Repairs'), findsNothing);
      expect(
        find.text('Review and sign'),
        awaiting ? findsOneWidget : findsNothing,
      );
      expect(find.text('Check-in report'), findsNothing);
      await tester.tap(find.text('View property'));
      await tester.pumpAndSettle();
      expect(find.byType(TenancyScreen), findsOneWidget);
      expect(find.text('Documents'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets(
    'repair terms opens the latest agreement directly under the same account',
    (tester) async {
      final api = _Api();
      await _openRepairTerms(tester, api);
      expect(find.byType(SupportingDocumentsScreen), findsNothing);
      final screen = tester.widget<AgreementTermsScreen>(
        find.byType(AgreementTermsScreen),
      );
      expect(screen.agreement.currentFileId, 'latest-agreement');
      expect(screen.ownerId, 'owner-1');
      expect(api.documentOwners, ['owner-1']);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'repair terms falls back to Documents when no current agreement exists',
    (tester) async {
      final api = _Api(hasAgreement: false);
      await _openRepairTerms(tester, api);
      expect(find.byType(SupportingDocumentsScreen), findsOneWidget);
      expect(find.byType(AgreementTermsScreen), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'failed repair-terms lookup stays on the property and can retry',
    (tester) async {
      final api = _Api()..failDocuments = true;
      await _openRepairTerms(tester, api);
      expect(find.byType(TenancyScreen), findsOneWidget);
      expect(find.text('No signal. Try again.'), findsOneWidget);
      api.failDocuments = false;
      await tester.tap(find.text('Review repair terms'));
      await tester.pumpAndSettle();
      expect(find.byType(AgreementTermsScreen), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'own-account signing returns to the report without a sign-in QR detour',
    (tester) async {
      FlutterSecureStorage.setMockInitialValues({
        'kivilo.signature.owner-1':
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      });
      final api = _Api();
      await _pump(tester, ReportScreen(id: 'report-1', api: api));
      await tester.tap(find.text('Sign as tenant'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Use this signature'));
      await tester.pumpAndSettle();
      expect(api.signed, isTrue);
      expect(find.byType(ReportScreen), findsOneWidget);
      expect(find.text('Sign as tenant'), findsNothing);
      expect(find.byType(TenantHandoverView), findsNothing);
      expect(api.handoverReads, 0);
      expect(tester.takeException(), isNull);
    },
  );
}
