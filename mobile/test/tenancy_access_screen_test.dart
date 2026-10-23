import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/models/maintenance.dart';
import 'package:kivilo/models/tenancy_access.dart';
import 'package:kivilo/screens/inspection_screen.dart';
import 'package:kivilo/screens/tenancy_access_screen.dart';
import 'package:kivilo/screens/tenancy_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/notification_route.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

const _lead = AccessAgent(id: 'jac', name: 'Jac', email: 'jac@example.test');
const _collaborator = TenancyCollaborator(
  stakeholderId: 'nimin',
  name: 'Nimin',
  email: 'nimin@example.test',
  addedAt: '2026-10-21T01:00:00.000Z',
);

class _FakeApi extends Api {
  _FakeApi({this.canManageAccess = true, this.shared = false})
    : super(attachAuth: false);

  final bool canManageAccess;
  bool shared;
  int reads = 0;
  final added = <String>[];
  final removed = <String>[];
  ApiFailure? failure;
  Completer<void>? saving;
  String role = 'AGENT';
  bool reportsOnly = false;
  String scope = 'TENANCY';
  String inspectionStatus = 'DRAFT';
  String? checkOutId;

  @override
  Future<TenancyAccess> tenancyAccess(String tenancyId) async {
    reads++;
    return TenancyAccess(
      tenancyId: tenancyId,
      visibility: shared || reportsOnly ? 'SHARED' : 'PRIVATE',
      canManageAccess: canManageAccess,
      askNames: canManageAccess ? const [] : const ['Jac'],
      leadAgent: _lead,
      collaborators: shared ? [_collaborator] : [],
      scope: scope,
      inspectionOnly: reportsOnly
          ? const [
              InspectionAccessPerson(
                stakeholderId: 'previous-agent',
                name: 'Previous agent',
                email: 'previous@example.test',
                inspectionIds: ['check-in-1'],
              ),
            ]
          : [],
    );
  }

  @override
  Future<InspectionDetail> inspection(String id) async =>
      InspectionDetail.fromJson({
        'id': id,
        'tenancyRecordId': 'tenancy-1',
        'kind': 'CHECK_IN',
        'status': inspectionStatus,
        'checkOutId': checkOutId,
        'property': '12 Green Road',
        'landlord': 'Landlord',
        'tenant': 'Tenant',
        'landlordId': 'landlord',
        'tenantId': 'tenant',
        'rooms': [],
        'signatures': [],
        'findings': [],
        'checkOutItems': [],
        'checkInItems': [],
        'assessmentDraftChanged': false,
        'access': {
          'tenancyId': 'tenancy-1',
          'visibility': 'PRIVATE',
          'canManageAccess': canManageAccess,
          'scope': scope,
          'leadAgent': {
            'id': 'jac',
            'name': 'Jac',
            'email': 'jac@example.test',
          },
          'collaborators': [],
        },
      });

  @override
  Future<List<MaintenanceCaseSummary>> maintenanceCases(
    String tenancyId,
  ) async => [];

  @override
  Future<List<PropertyAssetSummary>> propertyAssets(String propertyId) async =>
      [];

  @override
  Future<TenancyDetail> tenancy(String tenancyId) async => TenancyDetail(
    id: tenancyId,
    role: role,
    agentMayAgreeCosts: false,
    canEditMinorRepairCap: false,
    canEditAgentAuthority: false,
  );

  @override
  Future<void> addTenancyCollaborator(String tenancyId, String email) async {
    expect(tenancyId, 'tenancy-1');
    added.add(email);
    if (saving != null) await saving!.future;
    if (failure != null) throw failure!;
    shared = true;
  }

  @override
  Future<void> removeTenancyCollaborator(
    String tenancyId,
    String stakeholderId,
  ) async {
    expect(tenancyId, 'tenancy-1');
    removed.add(stakeholderId);
    if (saving != null) await saving!.future;
    if (failure != null) throw failure!;
    shared = false;
    reportsOnly = false;
  }
}

void main() {
  Future<void> open(WidgetTester tester, _FakeApi api) async {
    tester.view.physicalSize = const Size(390, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: TenancyAccessScreen(
          tenancyId: 'tenancy-1',
          property: '12 Green Road #03-01',
          api: api,
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('lead agent adds access and sees the refreshed names', (
    tester,
  ) async {
    final api = _FakeApi();
    await open(tester, api);
    expect(find.text('Private'), findsOneWidget);
    expect(find.text('Jac'), findsOneWidget);
    expect(find.textContaining('no access to other tenancies'), findsOneWidget);

    await tester.enterText(find.byType(TextField), ' NIMIN@example.test ');
    await tester.pump();
    await tester.tap(find.text('Add collaborator'));
    await tester.pumpAndSettle();

    expect(api.added, ['nimin@example.test']);
    expect(api.reads, 2);
    expect(find.text('Shared with Nimin'), findsOneWidget);
    expect(find.text('nimin@example.test'), findsOneWidget);
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      isEmpty,
    );
  });

  testWidgets(
    'collaborator sees every access action, and a locked one names who can',
    (tester) async {
      final api = _FakeApi(canManageAccess: false, shared: true);
      await open(tester, api);
      expect(find.text('Shared tenancy'), findsOneWidget);
      expect(find.text('Shared with Nimin'), findsNothing);
      expect(find.text('Jac'), findsOneWidget);
      expect(find.text('Nimin'), findsOneWidget);
      expect(find.byType(TextField), findsNothing);

      await tester.tap(find.text('Remove'));
      await tester.pumpAndSettle();
      expect(find.text('Remove Nimin'), findsOneWidget);
      expect(
        find.text('Only the lead agent can do this. Ask Jac.'),
        findsOneWidget,
      );
      await tester.tap(find.text('OK'));
      await tester.pumpAndSettle();

      await tester.ensureVisible(find.text('Add a collaborator'));
      await tester.tap(find.text('Add a collaborator'));
      await tester.pumpAndSettle();
      expect(
        find.text('Only the lead agent can do this. Ask Jac.'),
        findsOneWidget,
      );
      expect(api.removed, isEmpty);
      expect(api.added, isEmpty);
    },
  );

  testWidgets('failed add keeps the email and allows a retry', (tester) async {
    final api = _FakeApi()
      ..failure = const ApiFailure('Please try again.', 500);
    await open(tester, api);
    await tester.enterText(find.byType(TextField), 'nimin@example.test');
    await tester.pump();
    await tester.tap(find.text('Add collaborator'));
    await tester.pumpAndSettle();

    expect(find.text('Please try again.'), findsOneWidget);
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      'nimin@example.test',
    );
    expect(find.text('Private'), findsOneWidget);
    expect(api.reads, 1);

    api.failure = null;
    await tester.tap(find.text('Add collaborator'));
    await tester.pumpAndSettle();
    expect(api.added.length, 2);
    expect(find.text('Shared with Nimin'), findsOneWidget);
  });

  testWidgets('save disables draft edits and duplicate callbacks', (
    tester,
  ) async {
    final api = _FakeApi()..saving = Completer<void>();
    await open(tester, api);
    await tester.enterText(find.byType(TextField), 'nimin@example.test');
    await tester.pump();
    final submit = tester
        .widget<FilledButton>(
          find.widgetWithText(FilledButton, 'Add collaborator'),
        )
        .onPressed!;
    submit();
    submit();
    await tester.pump();

    expect(api.added, ['nimin@example.test']);
    expect(tester.widget<TextField>(find.byType(TextField)).enabled, isFalse);
    expect(
      tester
          .widget<FilledButton>(find.widgetWithText(FilledButton, 'Saving…'))
          .onPressed,
      isNull,
    );
    expect(
      tester.widget<PopScope<void>>(find.byType(PopScope<void>)).canPop,
      isFalse,
    );

    api.saving!.complete();
    await tester.pumpAndSettle();
    expect(find.text('Shared with Nimin'), findsOneWidget);
  });

  testWidgets('removal requires confirmation and updates access once', (
    tester,
  ) async {
    final api = _FakeApi(shared: true);
    await open(tester, api);
    await tester.tap(find.text('Remove'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(api.removed, isEmpty);

    api.saving = Completer<void>();
    await tester.tap(find.text('Remove'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Remove access'));
    await tester.pump(const Duration(milliseconds: 400));
    expect(api.removed, ['nimin']);
    expect(
      tester
          .widget<TextButton>(find.widgetWithText(TextButton, 'Remove'))
          .onPressed,
      isNull,
    );
    expect(tester.widget<TextField>(find.byType(TextField)).enabled, isFalse);

    api.saving!.complete();
    await tester.pumpAndSettle();
    expect(api.reads, 2);
    expect(find.text('Private'), findsOneWidget);
    expect(find.text('Remove'), findsNothing);
  });

  testWidgets('failed removal retains the person with an error', (
    tester,
  ) async {
    final api = _FakeApi(shared: true)..failure = ApiFailure.noConnection;
    await open(tester, api);
    await tester.tap(find.text('Remove'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Remove access'));
    await tester.pumpAndSettle();

    expect(find.text('Shared with Nimin'), findsOneWidget);
    expect(find.text(ApiFailure.noConnection.message), findsOneWidget);
    expect(find.text('Remove'), findsOneWidget);
  });

  testWidgets(
    'historical agents see their limited report access with no management controls',
    (tester) async {
      final api = _FakeApi(canManageAccess: false)
        ..reportsOnly = true
        ..scope = 'INSPECTION';
      await open(tester, api);
      expect(find.text('Access to previous reports'), findsNWidgets(2));
      expect(
        find.textContaining('Your access covers previous reports'),
        findsOneWidget,
      );
      expect(find.text('Previous reports only'), findsOneWidget);
      expect(find.text('1 previous report'), findsOneWidget);
      expect(find.text('Can work on this tenancy'), findsNothing);
      expect(find.text('Remove'), findsNothing);
      expect(find.byType(TextField), findsNothing);
    },
  );

  testWidgets(
    'lead agent can revoke previous report access without broadening it',
    (tester) async {
      final api = _FakeApi()..reportsOnly = true;
      await open(tester, api);
      expect(
        find.text('Previous reports shared with Previous agent'),
        findsOneWidget,
      );
      expect(find.text('Can work on this tenancy'), findsNothing);
      await tester.tap(find.text('Remove'));
      await tester.pumpAndSettle();
      expect(
        find.textContaining('lose access to their previous reports'),
        findsOneWidget,
      );
      await tester.tap(find.text('Remove access'));
      await tester.pumpAndSettle();
      expect(api.removed, ['previous-agent']);
      expect(find.text('Private'), findsOneWidget);
    },
  );

  testWidgets(
    'inspection access opens only when selected and returns to refresh',
    (tester) async {
      final api = _FakeApi();
      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          home: InspectionScreen(id: 'inspection-1', api: api),
        ),
      );
      await tester.pumpAndSettle();
      expect(api.reads, 0);
      expect(find.text('Private'), findsOneWidget);
      await tester.tap(find.text('Manage access'));
      await tester.pumpAndSettle();
      expect(api.reads, 1);
      expect(find.byType(TenancyAccessScreen), findsOneWidget);
      await tester.tap(find.byTooltip('Back'));
      await tester.pumpAndSettle();
      expect(find.byType(InspectionScreen), findsOneWidget);
      expect(find.byType(TenancyAccessScreen), findsNothing);
    },
  );

  for (final scope in ['TENANCY', 'INSPECTION']) {
    for (final hasCheckOut in [false, true]) {
      testWidgets(
        'completed check-in has scoped checkout controls for $scope, existing: $hasCheckOut',
        (tester) async {
          tester.view.devicePixelRatio = 1;
          tester.view.physicalSize = const Size(390, 4000);
          addTearDown(tester.view.reset);
          final api = _FakeApi(canManageAccess: false)
            ..inspectionStatus = 'COMPLETED'
            ..scope = scope
            ..checkOutId = hasCheckOut ? 'check-out-1' : null;
          await tester.pumpWidget(
            MaterialApp(
              theme: buildKiviloTheme(),
              home: InspectionScreen(id: 'inspection-1', api: api),
            ),
          );
          await tester.pumpAndSettle();
          expect(
            find.text('Start check-out'),
            scope == 'TENANCY' && !hasCheckOut ? findsOneWidget : findsNothing,
          );
          expect(
            find.text('Open check-out'),
            hasCheckOut ? findsOneWidget : findsNothing,
          );
        },
      );
    }
  }

  test('a shared-property notification opens its inspection', () async {
    final api = _FakeApi();
    final screen =
        await notificationScreen('/inspections/inspection-1', api)
            as InspectionScreen;
    expect(screen.id, 'inspection-1');
    expect(screen.api, same(api));
    expect(
      await notificationScreen('/inspections/inspection-1/access', api),
      isNull,
    );
  });

  for (final role in ['AGENT', 'LANDLORD', 'TENANT']) {
    testWidgets(
      'tenancy access is available for $role according to agent role',
      (tester) async {
        final api = _FakeApi()..role = role;
        await tester.pumpWidget(
          MaterialApp(
            theme: buildKiviloTheme(),
            home: TenancyScreen(
              api: api,
              tenancy: TenancySummary(
                id: 'tenancy-1',
                role: role,
                propertyId: 'property-1',
                property: '12 Green Road',
                postalCode: '123456',
                landlord: 'Landlord',
                tenant: 'Tenant',
                maintenanceCases: 0,
                inspections: 1,
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(api.reads, 0);
        expect(
          find.text('Property access'),
          role == 'AGENT' ? findsOneWidget : findsNothing,
        );
        if (role == 'AGENT') {
          await tester.tap(find.text('Property access'));
          await tester.pumpAndSettle();
          expect(api.reads, 1);
          expect(find.byType(TenancyAccessScreen), findsOneWidget);
        }
      },
    );
  }

  testWidgets(
    'small phone keeps the draft and save reachable above its keyboard',
    (tester) async {
      final api = _FakeApi(shared: true);
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(320, 568);
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(textScaler: const TextScaler.linear(1.5)),
            child: child!,
          ),
          home: TenancyAccessScreen(
            tenancyId: 'tenancy-1',
            property: '12 Green Road #03-01',
            api: api,
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.byType(TextField),
        250,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.enterText(find.byType(TextField), 'second@example.test');
      final draft = tester
          .widget<TextField>(find.byType(TextField))
          .controller!;
      tester.view.viewInsets = const FakeViewPadding(bottom: 260);
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Add collaborator'),
        150,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      final button = tester.getRect(
        find.widgetWithText(FilledButton, 'Add collaborator'),
      );
      expect(button.bottom, lessThanOrEqualTo(308));
      expect(button.right, lessThanOrEqualTo(320));
      expect(draft.text, 'second@example.test');
      expect(tester.takeException(), isNull);
    },
  );

  test(
    'API reads fresh access and sends only the email or selected identity',
    () async {
      final dio = Dio();
      final requests = <RequestOptions>[];
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            requests.add(options);
            handler.resolve(
              Response<Object>(
                requestOptions: options,
                data: {
                  'tenancyId': 'tenancy-1',
                  'visibility': 'PRIVATE',
                  'canManageAccess': true,
                  'leadAgent': {
                    'id': 'jac',
                    'name': 'Jac',
                    'email': 'jac@example.test',
                  },
                  'collaborators': <Object>[],
                },
              ),
            );
          },
        ),
      );
      final api = Api(dio: dio, attachAuth: false);
      expect((await api.tenancyAccess('tenancy-1')).leadAgent!.name, 'Jac');
      await api.addTenancyCollaborator('tenancy-1', ' NIMIN@example.test ');
      await api.removeTenancyCollaborator('tenancy-1', 'nimin');
      expect(requests.map((request) => request.method), [
        'GET',
        'POST',
        'DELETE',
      ]);
      expect(requests.first.path, '/api/v1/tenancies/tenancy-1/access');
      expect(requests[1].data, {'email': 'nimin@example.test'});
      expect(requests.last.path, '/api/v1/tenancies/tenancy-1/access/nimin');
      dio.close();
    },
  );
}
