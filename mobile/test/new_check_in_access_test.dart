import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/agency.dart';
import 'package:kivilo/models/maintenance.dart';
import 'package:kivilo/screens/new_inspection_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

const _team = AgencySummary(
  id: 'team',
  name: 'Waterfall',
  role: 'OWNER',
  memberCount: 4,
);

AgencyMember _member(String id, String name, String role, [String? status]) =>
    AgencyMember(
      id: 'membership-$id',
      stakeholderId: id,
      name: name,
      email: '$id@example.test',
      role: role,
      status: status ?? 'ACTIVE',
      assignedTenancies: 0,
    );

class _Api extends Api {
  _Api() : super(attachAuth: false);
  ApiFailure? failure;
  final saved = <Map<String, dynamic>>[];

  @override
  Future<UserProfile> me() async =>
      const UserProfile(id: 'jen', name: 'Jen', roles: ['AGENT']);

  @override
  Future<AgencyDetail> agency(String id) async {
    if (failure != null) throw failure!;
    return AgencyDetail(
      id: id,
      name: 'Waterfall',
      role: 'OWNER',
      canManage: true,
      members: [
        _member('jen', 'Jen', 'OWNER'),
        _member('mia', 'Mia', 'MANAGER'),
        _member('nim', 'Nim', 'AGENT'),
        _member('sam', 'Sam', 'AGENT'),
        _member('pending', 'Pending Person', 'AGENT', 'INVITED'),
      ],
      tenancies: const [],
      activity: const [],
    );
  }

  @override
  Future<String> createInspection(Map<String, dynamic> body) async {
    saved.add(body);
    return 'new-inspection';
  }
}

class _NoDraft extends ReadCache {
  @override
  Future<Object?> read(String key) async => null;
  @override
  Future<bool> write(String key, Object? value) async => true;
  @override
  Future<void> remove(String key) async {}
}

Future<void> _open(WidgetTester tester, _Api api, {AgencySummary? team}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(390, 1400);
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      theme: buildKiviloTheme(),
      home: NewInspectionScreen(
        api: api,
        initialAgency: team,
        cache: _NoDraft(),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _fillAndCreate(WidgetTester tester) async {
  Future<void> reveal(Finder target) => tester.scrollUntilVisible(
    target,
    300,
    scrollable: find.byType(Scrollable).first,
  );
  for (final (label, text) in [
    ('Address (required)', '42 Sample Road'),
    ('Postal code (required)', '238888'),
  ]) {
    final field = find.widgetWithText(TextFormField, label);
    await reveal(field);
    await tester.enterText(field, text);
  }
  await reveal(find.text('Fully furnished'));
  // Mid-screen, clear of the Create check-in bar at the bottom.
  unawaited(
    Scrollable.ensureVisible(
      tester.element(find.text('Fully furnished')),
      alignment: 0.5,
    ),
  );
  await tester.pumpAndSettle();
  await tester.tap(find.text('Fully furnished'));
  await tester.pumpAndSettle();
  for (final label in ['Landlord name (required)', 'Tenant name (required)']) {
    final field = find.widgetWithText(TextFormField, label);
    await reveal(field);
    await tester.enterText(field, 'Demo Person');
  }
  await tester.tap(find.text('Create check-in'));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('a team check-in shows who gets access and sends who is ticked', (
    tester,
  ) async {
    final api = _Api();
    await _open(tester, api, team: _team);

    expect(find.text('Property access'), findsOneWidget);
    expect(find.text('Jen (you)'), findsOneWidget);
    expect(find.text('Responsible agent'), findsOneWidget);
    expect(find.text('Mia'), findsOneWidget);
    expect(find.text('Pending Person'), findsNothing);
    bool? ticked(String name) => tester
        .widget<CheckboxListTile>(find.widgetWithText(CheckboxListTile, name))
        .value;
    expect(ticked('Nim'), isFalse);
    expect(ticked('Sam'), isFalse);

    await tester.tap(find.text('Nim'));
    await tester.pumpAndSettle();
    await _fillAndCreate(tester);

    expect(api.saved.single['agencyId'], 'team');
    expect(api.saved.single['memberIds'], ['nim']);
  });

  testWidgets('nothing ticked sends no assignment', (tester) async {
    final api = _Api();
    await _open(tester, api, team: _team);
    await _fillAndCreate(tester);
    expect(api.saved.single.containsKey('memberIds'), isFalse);
  });

  testWidgets('a personal check-in has no access section', (tester) async {
    await _open(tester, _Api());
    expect(find.text('Property access'), findsNothing);
  });

  testWidgets('a team that fails to load still leaves the form usable', (
    tester,
  ) async {
    final api = _Api()..failure = const ApiFailure('Offline', null);
    await _open(tester, api, team: _team);
    expect(find.textContaining('Could not load the team'), findsOneWidget);
    await _fillAndCreate(tester);
    expect(api.saved.single['agencyId'], 'team');
    expect(api.saved.single.containsKey('memberIds'), isFalse);
  });
}
