import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/agency.dart';
import 'package:kivilo/models/home_tasks.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/models/maintenance.dart';
import 'package:kivilo/models/renewal.dart';
import 'package:kivilo/screens/home_screen.dart';
import 'package:kivilo/models/property_work.dart';
import 'package:kivilo/screens/properties_screen.dart';
import 'package:kivilo/screens/new_inspection_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/services/workspace.dart';
import 'package:kivilo/ui/kivilo_components.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

const _team = AgencySummary(
  id: 'team',
  name: 'Jac and Nimin',
  role: 'AGENT',
  memberCount: 2,
);

class _WorkspaceApi extends Api {
  _WorkspaceApi() : super(attachAuth: false);
  List<AgencySummary> teams = [_team];
  String? preference;
  ApiFailure? directoryFailure;
  Completer<AgencyIndex>? directoryPending;
  final scopes = <(String?, bool)>[];
  final saved = <Map<String, dynamic>>[];
  @override
  Future<String?> workspacePreference() async => preference;
  @override
  Future<void> saveWorkspacePreference(String? value) async {
    preference = value;
  }

  @override
  Future<AgencyIndex> agencies() async {
    if (directoryFailure != null) throw directoryFailure!;
    if (directoryPending != null) return directoryPending!.future;
    return AgencyIndex(agencies: teams, invitations: const []);
  }

  @override
  Future<AgencyDetail> agency(String id) async => const AgencyDetail(
    id: 'team',
    name: 'Jac and Nimin',
    role: 'AGENT',
    canManage: false,
    members: [],
    tenancies: [],
    activity: [],
  );
  @override
  Future<UserProfile> me() async =>
      const UserProfile(id: 'jac', name: 'Jac', roles: ['AGENT']);
  @override
  Future<List<InspectionSummary>> inspections() async => [];
  @override
  Future<List<TenancySummary>> tenancies() async => [];
  @override
  Future<HomeTasks> homeTasks({
    required String context,
    String? agencyId,
    bool personal = false,
  }) async {
    if (readingSavedCopy) throw StateError('nothing saved');
    scopes.add((agencyId, personal));
    return const HomeTasks(tasks: []);
  }
  @override
  Future<List<PropertyWorkItem>> propertyWork({
    String? agencyId,
    String? assigneeId,
    bool personal = false,
    String state = 'active',
  }) async {
    if (readingSavedCopy) throw StateError('nothing saved');
    scopes.add((agencyId, personal));
    return [];
  }
  @override
  Future<List<InspectionSummary>> inspectionWork({
    String? agencyId,
    String? assigneeId,
    bool personal = false,
  }) async {
    scopes.add((agencyId, personal));
    return [];
  }

  @override
  Future<List<TenancySummary>> tenancyWork({
    String? agencyId,
    bool personal = false,
    String? party,
  }) async => [];
  @override
  Future<List<RenewalReminder>> renewalWork({
    String? agencyId,
    bool personal = false,
  }) async => [];
  @override
  Future<String> createInspection(Map<String, dynamic> data) async {
    saved.add(data);
    return 'new-inspection';
  }
}

class _MemoryCache extends ReadCache {
  String owner = 'jac';
  final values = <String, Object?>{};
  @override
  String? get ownerId => owner;
  @override
  Future<Object?> readForOwner(String owner, String key) async =>
      values['$owner:$key'];
  @override
  Future<bool> writeForOwner(String owner, String key, Object? value) async {
    values['$owner:$key'] = value;
    return true;
  }
}

Future<void> _open(WidgetTester tester, Widget home) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(390, 1100);
  addTearDown(tester.view.reset);
  await tester.pumpWidget(MaterialApp(theme: buildKiviloTheme(), home: home));
  await tester.pumpAndSettle();
}

void main() {
  test(
    'default stays All properties after joining a team; an explicit Personal choice stays personal',
    () async {
      final api = _WorkspaceApi()..teams = [];
      final workspace = Workspace(api);
      await workspace.refresh();
      expect(workspace.all, isTrue);
      expect(api.preference, isNull);
      api.teams = [_team];
      await workspace.refresh();
      expect(workspace.all, isTrue);
      expect(workspace.agency, isNull);
      await workspace.select('personal');
      final reopened = Workspace(api);
      await reopened.refresh();
      expect(reopened.personal, isTrue);
    },
  );

  test(
    'removed membership cannot remain a selected creation destination',
    () async {
      final api = _WorkspaceApi()..preference = 'team';
      final workspace = Workspace(api);
      await workspace.refresh();
      expect(workspace.agency?.id, 'team');
      api.teams = [];
      await workspace.refresh();
      expect(workspace.all, isTrue);
      expect(workspace.agency, isNull);
      expect(api.preference, isNull);
      await expectLater(workspace.select('team'), throwsA(isA<ApiFailure>()));
    },
  );

  test(
    'offline upgrade opens All properties without a cached directory',
    () async {
      final api = _WorkspaceApi()
        ..directoryFailure = const ApiFailure('Offline', null);
      final workspace = Workspace(api);
      await workspace.refresh();
      expect(workspace.all, isTrue);
      api.directoryFailure = const ApiFailure('Unauthorized', 401);
      await expectLater(workspace.refresh(), throwsA(isA<ApiFailure>()));
    },
  );

  test(
    'workspace queries and offline copies remain separated by scope and account',
    () async {
      final cache = _MemoryCache();
      final dio = Dio();
      bool offline = false;
      final queries = <Map<String, dynamic>>[];
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (request, handler) {
            if (offline) {
              handler.reject(
                DioException(
                  requestOptions: request,
                  type: DioExceptionType.connectionError,
                ),
              );
              return;
            }
            queries.add(request.uri.queryParameters);
            handler.resolve(
              Response(
                requestOptions: request,
                statusCode: 200,
                data: [
                  {
                    'id': request.uri.queryParameters['agencyId'] ?? 'personal',
                    'kind': 'CHECK_IN',
                    'status': 'DRAFT',
                    'property': 'Demo',
                    'tenant': 'Tenant',
                    'rooms': 0,
                  },
                ],
              ),
            );
          },
        ),
      );
      final api = Api(dio: dio, cache: cache, attachAuth: false);
      await api.saveWorkspacePreference('team');
      await api.inspectionWork(agencyId: 'team');
      await api.inspectionWork(personal: true);
      expect(queries, [
        {'agencyId': 'team'},
        {'personal': 'true'},
      ]);
      offline = true;
      expect((await api.inspectionWork(agencyId: 'team')).single.id, 'team');
      expect((await api.inspectionWork(personal: true)).single.id, 'personal');
      cache.owner = 'nimin';
      expect(await api.workspacePreference(), isNull);
      await expectLater(
        api.inspectionWork(agencyId: 'team'),
        throwsA(isA<ApiFailure>()),
      );
      cache.owner = 'jac';
      expect(await api.workspacePreference(), 'team');
    },
  );

  testWidgets(
    'Home defaults to All my work, shares Personal selection with Properties and inherits it on creation',
    (tester) async {
      final api = _WorkspaceApi();
      await _open(tester, HomeScreen(api: api));
      expect(find.text('All my work'), findsOneWidget);
      expect(api.scopes, [(null, false)]);
      await tester.tap(find.text('New check-in').first);
      await tester.pumpAndSettle();
      expect(find.text('Workspace: Jac and Nimin'), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.tap(find.byType(KiviloSelectField<String>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Personal').last);
      await tester.pumpAndSettle();
      expect(api.scopes.last, (null, true));
      await tester.tap(find.text('Properties').last);
      await tester.pumpAndSettle();
      expect(find.text('Personal'), findsOneWidget);
      expect(api.scopes.last, (null, true));
      await tester.tap(find.text('New check-in'));
      await tester.pumpAndSettle();
      expect(find.text('Workspace: Personal'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'starting a check-in while workspace loads waits for the team default',
    (tester) async {
      final api = _WorkspaceApi()..directoryPending = Completer<AgencyIndex>();
      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          home: PropertiesScreen(api: api),
        ),
      );
      await tester.pump();
      await tester.tap(find.text('New check-in'));
      await tester.pump();
      expect(find.byType(NewInspectionScreen), findsNothing);
      api.directoryPending!.complete(
        const AgencyIndex(agencies: [_team], invitations: []),
      );
      await tester.pumpAndSettle();
      expect(find.text('Workspace: Jac and Nimin'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'offline upgrade reopens the legacy library in All properties',
    (tester) async {
      final cache = _MemoryCache();
      cache.values.addAll({
        'jac:me': {
          'id': 'jac',
          'name': 'Jac',
          'roles': ['AGENT'],
        },
        'jac:inspections': [
          {
            'id': 'report',
            'kind': 'CHECK_IN',
            'status': 'DRAFT',
            'property': 'Previously loaded home',
            'tenant': 'Tenant',
            'rooms': 1,
          },
        ],
        'jac:tenancies': [],
      });
      final dio = Dio();
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (request, handler) {
            handler.reject(
              DioException(
                requestOptions: request,
                type: DioExceptionType.connectionError,
              ),
            );
          },
        ),
      );
      await _open(
        tester,
        HomeScreen(
          api: Api(dio: dio, cache: cache, attachAuth: false),
        ),
      );
      // Home's tasks were never saved before the update; the work list was.
      expect(find.text('Previously loaded home'), findsOneWidget);
      expect(
        find.text(
          'Offline. Showing tasks as they were last loaded; '
          'some may already be done.',
        ),
        findsOneWidget,
      );
      expect(find.text('Continue the check-in'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  for (final personal in [false, true]) {
    testWidgets(
      'check-in sends selected ${personal ? 'Personal' : 'team'} destination without losing entered address',
      (tester) async {
        final api = _WorkspaceApi();
        await _open(
          tester,
          NewInspectionScreen(api: api, initialAgency: _team),
        );
        await tester.enterText(
          find.byType(TextFormField).at(0),
          '42 Sample Road',
        );
        if (personal) {
          await tester.tap(find.text('Workspace: Jac and Nimin'));
          await tester.pumpAndSettle();
          await tester.tap(find.text('Personal').last);
          await tester.pumpAndSettle();
          expect(find.text('42 Sample Road'), findsOneWidget);
        }
        await tester.enterText(find.byType(TextFormField).at(2), '238888');
        final furnishing = personal
            ? 'Partially furnished'
            : 'Fully furnished';
        await tester.ensureVisible(find.text(furnishing));
        await tester.tap(find.text(furnishing));
        await tester.pumpAndSettle();
        for (final label in [
          'Landlord name (required)',
          'Tenant name (required)',
        ]) {
          final field = find.widgetWithText(TextFormField, label);
          await tester.scrollUntilVisible(
            field,
            300,
            scrollable: find.byType(Scrollable).first,
          );
          await tester.enterText(
            field,
            label.startsWith('Landlord') ? 'Demo Landlord' : 'Demo Tenant',
          );
        }
        await tester.tap(find.text('Create check-in'));
        await tester.pumpAndSettle();
        expect(api.saved, hasLength(1));
        expect(api.saved.single['agencyId'], personal ? null : 'team');
        expect(api.saved.single['line1'], '42 Sample Road');
        expect(
          api.saved.single['furnishingLevel'],
          personal ? 'PARTIALLY_FURNISHED' : 'FULLY_FURNISHED',
        );
        expect(tester.takeException(), isNull);
      },
    );
  }
}
