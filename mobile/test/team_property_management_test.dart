import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/agency.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/models/property_settings.dart';
import 'package:kivilo/models/renewal.dart';
import 'package:kivilo/models/tenancy_access.dart';
import 'package:kivilo/models/property_work.dart';
import 'package:kivilo/screens/properties_screen.dart';
import 'package:kivilo/screens/property_settings_screen.dart';
import 'package:kivilo/screens/team_screen.dart';
import 'package:kivilo/screens/tenancy_access_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/notification_route.dart';
import 'package:kivilo/ui/kivilo_components.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

const _owner = AgencyMember(
  id: 'owner-member',
  stakeholderId: 'owner',
  name: 'Lead Owner',
  email: 'owner@example.test',
  role: 'OWNER',
  status: 'ACTIVE',
  assignedTenancies: 0,
);
const _agent = AgencyMember(
  id: 'agent-member',
  stakeholderId: 'agent',
  name: 'Working Agent',
  email: 'agent@example.test',
  role: 'AGENT',
  status: 'ACTIVE',
  assignedTenancies: 2,
);
const _agency = AgencySummary(
  id: 'team',
  name: 'Green Agency',
  role: 'OWNER',
  memberCount: 2,
);

class _ManagementApi extends Api {
  _ManagementApi() : super(attachAuth: false);
  bool invitation = true;
  bool canManage = true;
  bool canDelete = true;
  String state = 'ACTIVE';
  bool removed = false;
  bool accessRemoved = false;
  List<Map<String, dynamic>> propertyTenancies = const [];
  Completer<void>? saving;
  ApiFailure? accessFailure;
  ApiFailure? workFailure;
  Completer<List<InspectionSummary>>? workPending;
  Completer<List<PropertyEntry>>? propertiesPending;
  List<InspectionSummary> personalReports = const [];
  String? preferredWorkspace;
  @override
  Future<String?> workspacePreference() async => preferredWorkspace;
  @override
  Future<void> saveWorkspacePreference(String? value) async {
    preferredWorkspace = value;
  }

  @override
  Future<List<RenewalReminder>> renewalWork({
    String? agencyId,
    bool personal = false,
  }) => renewals();
  final changes = <Map<String, dynamic>>[];
  final answers = <bool>[];
  final assignments = <Map<String, dynamic>>[];
  final queries = <(String?, String?)>[];
  final memberChanges = <Map<String, dynamic>>[];
  final invitations = <(String, String)>[];

  @override
  Future<void> inviteAgencyMember(String id, String email, String role) async =>
      invitations.add((email, role));

  @override
  Future<AgencyIndex> agencies() async => AgencyIndex(
    agencies: const [_agency],
    invitations: invitation
        ? const [
            AgencyInvitation(
              id: 'invite',
              agencyId: 'team',
              agencyName: 'Green Agency',
              role: 'AGENT',
              expiresAt: '2026-11-01T00:00:00Z',
            ),
          ]
        : [],
  );
  @override
  Future<void> answerAgencyInvitation(
    String id,
    String invitationId, {
    required bool accept,
  }) async {
    expect(id, 'team');
    expect(invitationId, 'invite');
    answers.add(accept);
    if (saving != null) await saving!.future;
    invitation = false;
  }

  @override
  Future<AgencyDetail> agency(String id) async => AgencyDetail(
    id: id,
    name: 'Green Agency',
    role: canManage ? 'OWNER' : 'AGENT',
    canManage: canManage,
    members: [_owner, if (!removed) _agent],
    tenancies: const [],
    activity: const [],
  );
  @override
  Future<bool> changeAgencyMember(
    String id,
    String memberId,
    Map<String, dynamic> data,
  ) async {
    memberChanges.add(data);
    removed = true;
    return false;
  }

  @override
  Future<PropertySettings> propertySettings(String id) async =>
      PropertySettings(
        id: id,
        label: '12 Green Road',
        state: state,
        canManage: canManage,
        canDelete: canDelete,
        confirmationLabel: '12 Green Road',
        counts: const {'tenancies': 1, 'inspections': 2, 'photos': 3},
        tenancies: propertyTenancies,
        deleteBlockedReason: canDelete
            ? null
            : 'Signed reports must be preserved. Archive this property.',
        trashExpiresAt: state == 'TRASHED' ? '2026-11-21T00:00:00Z' : null,
        askNames: canManage ? const [] : const ['Lead Owner'],
      );
  @override
  Future<PropertySettings> changePropertyState(
    String id,
    String action, {
    String? confirmation,
  }) async {
    changes.add({'action': action, 'confirmation': confirmation});
    state = action == 'trash'
        ? 'TRASHED'
        : action == 'archive'
        ? 'ARCHIVED'
        : 'ACTIVE';
    return propertySettings(id);
  }

  @override
  Future<List<PropertyEntry>> properties({String state = 'active'}) async {
    if (state != 'active' && propertiesPending != null) {
      return propertiesPending!.future;
    }
    return [
      PropertyEntry(
        id: 'property',
        label: '12 Green Road',
        state: state.toUpperCase(),
        canManage: true,
        tenancyCount: 1,
        inspectionCount: 2,
      ),
    ];
  }

  @override
  Future<TenancyAccess> tenancyAccess(String id) async {
    if (accessFailure != null) throw accessFailure!;
    return const TenancyAccess(
      tenancyId: 'tenancy',
      visibility: 'PRIVATE',
      canManageAccess: true,
      leadAgent: AccessAgent(
        id: 'owner',
        name: 'Lead Owner',
        email: 'owner@example.test',
      ),
      collaborators: [],
      agency: {'id': 'team', 'name': 'Green Agency', 'role': 'OWNER'},
      canManageAssignment: true,
      availableMembers: [
        AccessAgent(
          id: 'owner',
          name: 'Lead Owner',
          email: 'owner@example.test',
        ),
        AccessAgent(
          id: 'agent',
          name: 'Working Agent',
          email: 'agent@example.test',
        ),
      ],
    );
  }

  @override
  Future<bool> assignTenancy(String id, Map<String, dynamic> data) async {
    assignments.add(data);
    return accessRemoved;
  }

  @override
  Future<List<InspectionSummary>> inspections() async => personalReports;

  Completer<List<PropertyWorkItem>>? trashPending;

  /// The Properties tab reads one row per property; this fake derives them from the
  /// same inspection data and scoping the tests already describe.
  @override
  Future<List<PropertyWorkItem>> propertyWork({
    String? agencyId,
    String? assigneeId,
    bool personal = false,
    String state = 'active',
  }) async {
    if (state == 'trash' && trashPending != null) return trashPending!.future;
    final rows = agencyId == null && !personal
        ? await inspections()
        : await inspectionWork(
            agencyId: agencyId,
            assigneeId: assigneeId,
            personal: personal,
          );
    return [
      for (final row in rows)
        PropertyWorkItem(
          id: row.id,
          address: row.property,
          state: 'ACTIVE',
          tenant: row.tenant,
          stage: 'CHECK_IN_IN_PROGRESS',
          stageLabel: 'Check-in in progress',
          reports: 1,
        ),
    ];
  }
  @override
  Future<List<InspectionSummary>> inspectionWork({
    String? agencyId,
    String? assigneeId,
    bool personal = false,
  }) async {
    queries.add((agencyId, assigneeId));
    if (workFailure != null) throw workFailure!;
    if (workPending != null) return workPending!.future;
    return const [];
  }

  @override
  Future<List<RenewalReminder>> renewals() async => const [];
}

Future<void> _open(
  WidgetTester tester,
  Widget home, {
  Size size = const Size(390, 1000),
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = size;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(MaterialApp(theme: buildKiviloTheme(), home: home));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'joining uses the selected invitation and prevents duplicate submission',
    (tester) async {
      final api = _ManagementApi()..saving = Completer<void>();
      await _open(tester, TeamScreen(api: api));
      final action = tester
          .widget<FilledButton>(find.widgetWithText(FilledButton, 'Join team'))
          .onPressed!;
      action();
      action();
      await tester.pump();
      expect(api.answers, [true]);
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Join team'),
            )
            .onPressed,
        isNull,
      );
      api.saving!.complete();
      await tester.pumpAndSettle();
      expect(find.text('Join team'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'ordinary agents see every team action, and a locked one names who can',
    (tester) async {
      final api = _ManagementApi()..canManage = false;
      await _open(tester, TeamDetailScreen(id: 'team', api: api));
      expect(find.text('Working Agent'), findsOneWidget);

      await tester.tap(find.text('Invite member'));
      await tester.pumpAndSettle();
      expect(
        find.text('Only a team owner or manager can do this. Ask Lead Owner.'),
        findsOneWidget,
      );
      expect(find.byType(TextField), findsNothing);
      await tester.tap(find.text('OK'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Lead Owner'));
      await tester.pumpAndSettle();
      expect(find.text('Manage Lead Owner'), findsOneWidget);
      expect(
        find.text('Only a team owner can do this. Ask Lead Owner.'),
        findsOneWidget,
      );
      await tester.tap(find.text('OK'));
      await tester.pumpAndSettle();
      expect(find.text('Rename team'), findsOneWidget);
      expect(api.invitations, isEmpty);
      expect(api.memberChanges, isEmpty);
    },
  );

  testWidgets('invite role is chosen in place inside the drawer', (
    tester,
  ) async {
    final api = _ManagementApi();
    await _open(tester, TeamDetailScreen(id: 'team', api: api));
    await tester.tap(find.text('Invite member'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'New@Example.com');
    await tester.tap(find.text('Manager'));
    await tester.pumpAndSettle();
    expect(
      find.text(
        'Managers can see team tenancies, assign work and manage members.',
      ),
      findsOneWidget,
    );
    await tester.tap(find.widgetWithText(FilledButton, 'Send invitation'));
    await tester.pumpAndSettle();
    expect(api.invitations, [('new@example.com', 'MANAGER')]);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'offboarding requires an explicit replacement for assigned work',
    (tester) async {
      final api = _ManagementApi();
      await _open(tester, TeamDetailScreen(id: 'team', api: api));
      await tester.tap(find.text('Working Agent'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(OutlinedButton, 'Remove member'));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Remove member'),
            )
            .onPressed,
        isNull,
      );
      await tester.tap(find.byType(KiviloSelectField<String?>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Lead Owner').last);
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Remove member'));
      await tester.pumpAndSettle();
      expect(api.memberChanges, [
        {'action': 'remove', 'reassignToId': 'owner'},
      ]);
      expect(find.text('Working Agent'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'property deletion requires the full address and supports recovery',
    (tester) async {
      final api = _ManagementApi();
      await _open(
        tester,
        PropertySettingsScreen(propertyId: 'property', api: api),
      );
      await tester.ensureVisible(find.text('Delete property'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Delete property'));
      await tester.pumpAndSettle();
      expect(find.textContaining('2 inspections and 3 photos'), findsOneWidget);
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Move to trash'),
            )
            .onPressed,
        isNull,
      );
      await tester.enterText(find.byType(TextField), '12 green road');
      await tester.pump();
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Move to trash'),
            )
            .onPressed,
        isNull,
      );
      await tester.enterText(find.byType(TextField), '12 Green Road');
      await tester.pump();
      await tester.tap(find.widgetWithText(FilledButton, 'Move to trash'));
      await tester.pumpAndSettle();
      expect(api.changes, [
        {'action': 'trash', 'confirmation': '12 Green Road'},
      ]);
      expect(find.text('In trash'), findsOneWidget);
      await tester.tap(find.text('Restore property'));
      await tester.pumpAndSettle();
      await tester.tap(
        find.widgetWithText(FilledButton, 'Restore property').last,
      );
      await tester.pumpAndSettle();
      expect(api.changes.last['action'], 'restore');
      expect(find.text('Active property'), findsOneWidget);
    },
  );

  testWidgets('signed history explains disabled deletion and retains archive', (
    tester,
  ) async {
    final api = _ManagementApi()..canDelete = false;
    await _open(
      tester,
      PropertySettingsScreen(propertyId: 'property', api: api),
    );
    await tester.ensureVisible(find.text('Delete property'));
    await tester.pumpAndSettle();
    expect(
      find.textContaining('Signed reports must be preserved'),
      findsOneWidget,
    );
    expect(
      tester
          .widget<OutlinedButton>(
            find.widgetWithText(OutlinedButton, 'Delete property'),
          )
          .onPressed,
      isNull,
    );
    await tester.tap(find.text('Archive property'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Archive property'));
    await tester.pumpAndSettle();
    expect(api.changes, [
      {'action': 'archive', 'confirmation': null},
    ]);
    expect(find.text('Archived'), findsOneWidget);
  });

  testWidgets(
    'collaborators see the danger zone, and its actions name who can act',
    (tester) async {
      final api = _ManagementApi()..canManage = false;
      await _open(
        tester,
        PropertySettingsScreen(propertyId: 'property', api: api),
      );
      expect(find.text('Danger zone'), findsOneWidget);
      const explanation =
          'Only the responsible agent or a team owner or manager for every '
          'tenancy here can do this. Ask Lead Owner.';
      await tester.ensureVisible(find.text('Archive property'));
      await tester.tap(find.text('Archive property'));
      await tester.pumpAndSettle();
      expect(find.text(explanation), findsOneWidget);
      await tester.tap(find.text('OK'));
      await tester.pumpAndSettle();

      await tester.ensureVisible(find.text('Delete property'));
      await tester.tap(find.text('Delete property'));
      await tester.pumpAndSettle();
      expect(find.text(explanation), findsOneWidget);
      // A permission problem is not mistaken for preserved history.
      expect(
        find.text('Signed reports must be preserved. Archive this property.'),
        findsNothing,
      );
      expect(api.changes, isEmpty);
    },
  );

  testWidgets(
    'named assignment reflects manager access and sends selected identities',
    (tester) async {
      final api = _ManagementApi();
      await _open(
        tester,
        TenancyAccessScreen(
          tenancyId: 'tenancy',
          property: '12 Green Road',
          api: api,
        ),
      );
      expect(find.text('Private'), findsNothing);
      expect(
        find.textContaining('Team owners and managers oversee'),
        findsOneWidget,
      );
      await tester.tap(find.text('Assign team members'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(CheckboxListTile, 'Working Agent'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Save assignment'));
      await tester.pumpAndSettle();
      expect(api.assignments, [
        {
          'leadAgentId': 'owner',
          'memberIds': ['agent'],
        },
      ]);
    },
  );

  testWidgets(
    'team work fetches server-scoped data and applies assignee filters',
    (tester) async {
      final api = _ManagementApi()..preferredWorkspace = 'team';
      await _open(tester, PropertiesScreen(api: api));
      expect(api.queries, [('team', null)]);
      await tester.tap(find.byType(KiviloSelectField<String?>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Working Agent').last);
      await tester.pumpAndSettle();
      expect(api.queries.last, ('team', 'agent'));
      api.canManage = false;
      await tester.widget<RefreshIndicator>(find.byType(RefreshIndicator)).onRefresh();
      await tester.pumpAndSettle();
      expect(api.queries.last, ('team', null));
      expect(find.byType(KiviloSelectField<String>), findsOneWidget);
      expect(find.byType(KiviloSelectField<String?>), findsNothing);
    },
  );

  testWidgets('archive keeps an obvious route to preserved report history', (
    tester,
  ) async {
    final api = _ManagementApi()
      ..state = 'ARCHIVED'
      ..propertyTenancies = [
        {
          'id': 'tenancy',
          'leadAgentName': 'Lead Owner',
          'agencyName': 'Green Agency',
          'inspections': [
            {'id': 'inspection', 'kind': 'CHECK_IN', 'status': 'COMPLETED'},
          ],
        },
      ];
    await _open(
      tester,
      PropertySettingsScreen(propertyId: 'property', api: api),
    );
    expect(
      find.widgetWithText(OutlinedButton, 'Open check-in report'),
      findsOneWidget,
    );
    expect(find.text('Restore to active properties'), findsOneWidget);
  });

  testWidgets(
    'handing away the last assignment returns to a safe root screen',
    (tester) async {
      final api = _ManagementApi()..accessRemoved = true;
      await _open(
        tester,
        Builder(
          builder: (context) => Scaffold(
            body: FilledButton(
              onPressed: () => Navigator.of(context).push<void>(
                MaterialPageRoute(
                  builder: (_) => TenancyAccessScreen(
                    tenancyId: 'tenancy',
                    property: '12 Green Road',
                    api: api,
                  ),
                ),
              ),
              child: const Text('Open assignment'),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open assignment'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Assign team members'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Save assignment'));
      await tester.pumpAndSettle();
      expect(find.text('Open assignment'), findsOneWidget);
      expect(find.text('Assign team members'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'small phone keeps deletion confirmation reachable above keyboard',
    (tester) async {
      final api = _ManagementApi();
      await _open(
        tester,
        PropertySettingsScreen(propertyId: 'property', api: api),
        size: const Size(320, 640),
      );
      await tester.ensureVisible(find.text('Delete property'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Delete property'));
      await tester.pumpAndSettle();
      tester.view.viewInsets = const FakeViewPadding(bottom: 250);
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), '12 Green Road');
      await tester.pump();
      expect(
        tester
            .getBottomRight(find.widgetWithText(FilledButton, 'Move to trash'))
            .dy,
        lessThanOrEqualTo(390),
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'revoked Team work can return to All properties without retrying the revoked team',
    (tester) async {
      final api = _ManagementApi()
        ..preferredWorkspace = 'team'
        ..workFailure = const ApiFailure('Team access was removed.', 404);
      await _open(tester, PropertiesScreen(api: api));
      expect(find.text('Team access was removed.'), findsOneWidget);
      await tester.tap(find.text('Show all properties'));
      await tester.pumpAndSettle();
      expect(find.text('All properties'), findsOneWidget);
      expect(find.text('Team access was removed.'), findsNothing);
      expect(api.queries, [('team', null)]);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'changing work scope hides prior-scope reports until the new result arrives',
    (tester) async {
      final api = _ManagementApi()
        ..preferredWorkspace = 'all'
        ..personalReports = const [
          InspectionSummary(
            id: 'mine',
            kind: 'CHECK_IN',
            status: 'DRAFT',
            property: 'Personal home',
            tenant: 'Tenant',
            rooms: 0,
          ),
        ]
        ..workPending = Completer<List<InspectionSummary>>();
      await _open(tester, PropertiesScreen(api: api));
      expect(find.text('Personal home'), findsOneWidget);
      await tester.tap(find.byType(KiviloSelectField<String>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Green Agency'));
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.text('Personal home'), findsNothing);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      api.workPending!.complete(const [
        InspectionSummary(
          id: 'team-report',
          kind: 'CHECK_IN',
          status: 'DRAFT',
          property: 'Agency home',
          tenant: 'Tenant',
          rooms: 0,
        ),
      ]);
      await tester.pumpAndSettle();
      expect(find.text('Agency home'), findsOneWidget);
      expect(find.text('Personal home'), findsNothing);
    },
  );

  for (final status in [401, 404]) {
    testWidgets(
      'fresh $status refusal clears the previous tenancy roster and management controls',
      (tester) async {
        final api = _ManagementApi();
        await _open(
          tester,
          TenancyAccessScreen(
            tenancyId: 'tenancy',
            property: '12 Green Road',
            api: api,
          ),
        );
        expect(find.text('Lead Owner'), findsOneWidget);
        api.accessFailure = ApiFailure('Access no longer available.', status);
        final refresh = tester.widget<RefreshIndicator>(
          find.byType(RefreshIndicator),
        );
        await refresh.onRefresh();
        await tester.pumpAndSettle();
        expect(find.text('Access no longer available.'), findsOneWidget);
        expect(find.text('Lead Owner'), findsNothing);
        expect(find.text('Assign team members'), findsNothing);
        expect(find.text('Add collaborator'), findsNothing);
      },
    );
  }

  testWidgets(
    'switching to Recently deleted hides active rows while its list loads',
    (tester) async {
      final api = _ManagementApi()
        ..personalReports = const [
          InspectionSummary(
            id: 'green',
            kind: 'CHECK_IN',
            status: 'DRAFT',
            property: '12 Green Road',
            tenant: 'Tenant',
            rooms: 0,
          ),
        ]
        ..trashPending = Completer<List<PropertyWorkItem>>();
      await _open(tester, PropertiesScreen(api: api));
      expect(find.text('12 Green Road'), findsOneWidget);
      await tester.ensureVisible(find.text('Recently deleted'));
      await tester.tap(find.text('Recently deleted'));
      await tester.pump();
      expect(find.text('12 Green Road'), findsNothing);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      api.trashPending!.complete(const []);
      await tester.pumpAndSettle();
      expect(find.text('Nothing in Recently deleted'), findsOneWidget);
    },
  );

  testWidgets(
    'secondary buttons, text or outlined, share one filled look and a 50 point target',
    (tester) async {
      await _open(
        tester,
        Scaffold(
          body: Column(
            children: [
              TextButton(onPressed: () {}, child: const Text('Add photo')),
              OutlinedButton(onPressed: () {}, child: const Text('Cancel')),
            ],
          ),
        ),
      );
      final theme = Theme.of(tester.element(find.byType(TextButton)));
      for (final style in [
        theme.textButtonTheme.style!,
        theme.outlinedButtonTheme.style!,
      ]) {
        // A fill, not bare text, so it reads as a button.
        expect(style.backgroundColor!.resolve({}), KiviloColors.pinkSoft);
        expect(style.foregroundColor!.resolve({}), KiviloColors.pinkDark);
        expect(style.minimumSize!.resolve({})!.height, 50);
      }
      expect(tester.getSize(find.byType(TextButton)).height, 50);
      expect(tester.getSize(find.byType(OutlinedButton)).height, 50);
    },
  );

  test('team invitations open the native membership screen', () async {
    expect(
      await notificationScreen('/team', _ManagementApi()),
      isA<TeamScreen>(),
    );
  });

  test(
    'management API sends exact endpoints and preserves safe conflict messages',
    () async {
      final requests = <RequestOptions>[];
      final dio = Dio(BaseOptions(baseUrl: 'https://example.test'));
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            requests.add(options);
            handler.resolve(
              Response(requestOptions: options, data: {'accessRemoved': true}),
            );
          },
        ),
      );
      final api = Api(dio: dio, attachAuth: false);
      expect(
        await api.assignTenancy('tenancy', {'leadAgentId': 'agent'}),
        isTrue,
      );
      expect(
        await api.changeAgencyMember('team', 'member', {
          'action': 'remove',
          'reassignToId': 'agent',
        }),
        isTrue,
      );
      await api.answerAgencyInvitation('team', 'member', accept: true);
      expect(requests.map((request) => request.path), [
        '/api/v1/tenancies/tenancy/assignment',
        '/api/v1/agencies/team/members/member',
        '/api/v1/agencies/team/invitations/member',
      ]);
      expect(requests.last.data, {'action': 'accept'});
      final error = ApiFailure.fromDio(
        DioException(
          requestOptions: RequestOptions(),
          response: Response(
            requestOptions: RequestOptions(),
            statusCode: 409,
            data: {
              'error': 'agency_conflict',
              'message': 'Keep at least one team owner.',
            },
          ),
        ),
      );
      expect(error.message, 'Keep at least one team owner.');
    },
  );
}
