import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/agency.dart';
import 'package:kivilo/models/home_tasks.dart';
import 'package:kivilo/models/maintenance.dart';
import 'package:kivilo/models/property_work.dart';
import 'package:kivilo/models/renewal.dart';
import 'package:kivilo/screens/home_screen.dart';
import 'package:kivilo/screens/home_tasks.dart';
import 'package:kivilo/screens/inspection_screen.dart';
import 'package:kivilo/screens/maintenance_case_screen.dart';
import 'package:kivilo/screens/party_homes_screen.dart';
import 'package:kivilo/screens/report_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/handover_guide.dart';
import 'package:kivilo/ui/kivilo_format.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

HomeTask task(
  String id, {
  String group = 'ACTION',
  String kind = 'CONTINUE_INSPECTION',
  String title = 'Continue the check-in',
  String property = '12 Cairnhill Rise, Singapore 229700',
  String? person,
  String? date,
  String? dateKind,
  bool overdue = false,
  String? href,
}) => HomeTask(
  id: id,
  group: group,
  kind: kind,
  capacity: 'AGENT',
  propertyId: 'property-$id',
  property: property,
  tenancyId: 'tenancy-$id',
  title: title,
  person: person,
  date: date,
  dateKind: dateKind,
  overdue: overdue,
  href: href ?? '/inspections/$id',
);

class _ReminderCache extends ReadCache {
  @override
  String ownerId = 'first-account';
  final files = <(String, String), Object?>{};
  bool failWrites = false;

  @override
  Future<Object?> readForOwner(String owner, String key) async => files[(owner, key)];

  @override
  Future<bool> writeForOwner(String owner, String key, Object? value) async {
    if (failWrites) return false;
    files[(owner, key)] = value;
    return true;
  }
}

class _HomeApi extends Api {
  _HomeApi({
    this.contexts = const UserContexts(work: true, landlord: false, tenant: false),
    Map<String, HomeTasks>? byContext,
    super.cache,
  }) : byContext = byContext ?? {},
       super(attachAuth: false);

  UserContexts contexts;
  final Map<String, HomeTasks> byContext;
  String? preference;
  Object? failure;
  Completer<HomeTasks>? pending;
  final requests = <String>[];
  final partyRequests = <String?>[];

  @override
  Future<UserProfile> me() async => UserProfile(
    id: 'mira',
    name: 'Mira Tan',
    roles: const ['AGENT'],
    contexts: contexts,
  );
  @override
  Future<AgencyIndex> agencies() async =>
      const AgencyIndex(agencies: [], invitations: []);
  @override
  Future<String?> workspacePreference() async => preference;
  @override
  Future<void> saveWorkspacePreference(String? value) async {
    if (readingSavedCopy) return;
    preference = value;
  }

  @override
  Future<HomeTasks> homeTasks({
    required String context,
    String? agencyId,
    bool personal = false,
  }) async {
    if (readingSavedCopy) throw StateError('nothing saved');
    requests.add(context);
    if (failure != null) throw failure!;
    if (pending != null) return pending!.future;
    return byContext[context] ?? const HomeTasks(tasks: []);
  }

  @override
  Future<List<TenancySummary>> tenancyWork({
    String? agencyId,
    bool personal = false,
    String? party,
  }) async {
    if (readingSavedCopy) throw StateError('nothing saved');
    partyRequests.add(party);
    return [
      TenancySummary(
        id: 'owned',
        role: party ?? 'AGENT',
        capacities: [?party],
        propertyId: 'b',
        property: '8 Owned Lane',
        postalCode: '111111',
        landlord: 'Mira Tan',
        tenant: 'Sam Lee',
        maintenanceCases: 0,
        inspections: 1,
        latestReportId: 'report-b',
        latestReportStatus: 'AWAITING_SIGNATURE',
        awaitingMySignature: true,
      ),
    ];
  }

  @override
  Future<List<PropertyWorkItem>> propertyWork({
    String? agencyId,
    String? assigneeId,
    bool personal = false,
    String state = 'active',
  }) async => [];
  @override
  Future<List<RenewalReminder>> renewalWork({
    String? agencyId,
    bool personal = false,
  }) async => [];
}

Future<void> _pump(
  WidgetTester tester,
  Api api, {
  double scale = 1,
  Size size = const Size(390, 844),
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = size;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      theme: buildKiviloTheme(),
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(
          context,
        ).copyWith(textScaler: TextScaler.linear(scale)),
        child: child!,
      ),
      home: HomeScreen(api: api),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _reveal(WidgetTester tester, Finder target) async {
  for (var i = 0; i < 30 && target.hitTestable().evaluate().isEmpty; i++) {
    await tester.drag(find.byType(ListView).first, const Offset(0, -240));
    await tester.pumpAndSettle();
  }
  expect(target.hitTestable(), findsOneWidget);
}

/// A renewal a month from whenever the test runs, so it is always still coming up.
final _renewalEnds = DateTime.now()
    .add(const Duration(days: 30))
    .toIso8601String()
    .substring(0, 10);

final _work = HomeTasks(
  tasks: [
    task('older', date: '2026-10-01T00:00:00Z', dateKind: 'STARTED'),
    task(
      'newer',
      title: 'Continue the check-out',
      property: '3 Newer Walk, Singapore 100003',
      date: '2026-10-20T00:00:00Z',
      dateKind: 'STARTED',
    ),
    task(
      'repair',
      kind: 'REPAIR_REPORTED',
      title: 'Acknowledge the repair: Leaking tap',
      date: '2026-10-22T00:00:00Z',
      dateKind: 'REPORTED',
      href: '/maintenance/case-1',
    ),
    task(
      'sign',
      group: 'WAITING',
      kind: 'SIGNATURES',
      title: 'Signatures on the check-in report',
      person: 'Waiting on Sam Lee (tenant)',
    ),
    task(
      'renew',
      group: 'COMING_UP',
      kind: 'RENEWAL_DUE',
      title: 'Decide on the renewal',
      date: _renewalEnds,
      dateKind: 'ENDS',
      href: '/renewals/t',
    ),
  ],
);

void main() {
  testWidgets(
    'groups work into action, waiting and coming up, with one shortcut to the newest inspection',
    (tester) async {
      final api = _HomeApi(byContext: {'work': _work});
      await _pump(tester, api);
      expect(find.text('Needs your action · 2'), findsOneWidget);
      expect(find.text('Continue where you left off'.toUpperCase()), findsOneWidget);
      // The shortcut is the newest open inspection; the button says what it does.
      expect(
        find.widgetWithText(FilledButton, 'Continue the check-out'),
        findsOneWidget,
      );
      expect(find.widgetWithText(OutlinedButton, 'New check-in'), findsOneWidget);
      expect(find.text('3 Newer Walk, Singapore 100003'), findsOneWidget);
      expect(
        tester.widgetList<HomeTaskRow>(find.byType(HomeTaskRow)).map(
          (row) => row.task.id,
        ),
        containsAll(['older', 'repair']),
      );
      expect(
        tester.widgetList<HomeTaskRow>(find.byType(HomeTaskRow)).map(
          (row) => row.task.id,
        ),
        isNot(contains('newer')),
      );
      await _reveal(tester, find.text('Waiting on others · 1'));
      expect(find.text('Waiting on Sam Lee (tenant)'), findsOneWidget);
      await _reveal(tester, find.text('Coming up · 1'));
      expect(find.text('Ends ${calendarDate(_renewalEnds)}'), findsOneWidget);
      // No tutorial in front of an agent who already works.
      expect(find.byType(HandoverGuide), findsNothing);
      expect(api.requests, ['work']);
      expect(tester.takeException(), isNull);
    },
  );

  for (final scale in [1.0, 2.0]) {
    testWidgets('reminder close aligns with the heading and card edge at ${scale}x', (tester) async {
      await _pump(tester, _HomeApi(byContext: {'work': _work}),
          size: const Size(320, 568), scale: scale);
      for (final (label, property) in [
        ('CONTINUE WHERE YOU LEFT OFF', '3 Newer Walk, Singapore 100003'),
        ('Continue the check-in', '12 Cairnhill Rise, Singapore 229700'),
      ]) {
        final close = find.byTooltip('Dismiss reminder for $property');
        await _reveal(tester, close);
        final bounds = tester.getRect(close);
        final icon = find.descendant(of: close, matching: find.byIcon(Icons.close));
        final card = find.ancestor(of: close, matching: find.byType(Card)).first;
        expect(tester.getCenter(icon).dy, closeTo(tester.getCenter(find.text(label)).dy, 0.5));
        expect(bounds.right, closeTo(tester.getRect(card).right, 0.5));
        expect(bounds.size, const Size.square(48));
      }
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('dismiss and undo the newest inspection without changing other work', (tester) async {
    final cache = _ReminderCache();
    final api = _HomeApi(cache: cache, byContext: {'work': _work});
    await _pump(tester, api);
    final close = find.byTooltip('Dismiss reminder for 3 Newer Walk, Singapore 100003');
    final checkout = find.widgetWithText(FilledButton, 'Continue the check-out');
    final checkin = find.widgetWithText(FilledButton, 'Continue the check-in');

    await tester.tap(close);
    await tester.pumpAndSettle();
    expect(checkout, findsNothing);
    expect(checkin, findsOneWidget);
    expect(find.text('Needs your action · 1'), findsOneWidget);
    expect(find.text('Acknowledge the repair: Leaking tap'), findsOneWidget);
    await tester.tap(find.text('Undo'));
    await tester.pumpAndSettle();
    expect(checkout, findsOneWidget);
    expect(find.text('Needs your action · 2'), findsOneWidget);

    await tester.tap(close);
    await tester.pumpAndSettle();
    await tester.pumpWidget(const SizedBox());
    await _pump(tester, _HomeApi(cache: cache, byContext: {'work': _work})..offlineCopy = true);
    expect(checkout, findsNothing);
    expect(checkin, findsOneWidget);

    await tester.pumpWidget(const SizedBox());
    cache.ownerId = 'second-account';
    await _pump(tester, _HomeApi(cache: cache, byContext: {'work': _work}));
    expect(checkout, findsOneWidget);
  });

  testWidgets('dismissing a reminder hides only that inspection in that stage', (tester) async {
    final cache = _ReminderCache()..failWrites = true;
    final api = _HomeApi(cache: cache, byContext: {'work': HomeTasks(tasks: [task('one')])});
    await _pump(tester, api, size: const Size(320, 568), scale: 2);
    final close = find.byTooltip('Dismiss reminder for 12 Cairnhill Rise, Singapore 229700');
    await _reveal(tester, close);
    expect(tester.getSize(close).shortestSide, greaterThanOrEqualTo(48));
    await tester.tap(close);
    await tester.pumpAndSettle();
    expect(find.text('Couldn’t save this reminder change.'), findsOneWidget);
    expect(close, findsOneWidget);
    cache.failWrites = false;
    await tester.tap(find.text('Retry'));
    await tester.pumpAndSettle();
    expect(close, findsNothing);
    expect(find.text('You’re all caught up'), findsNothing);

    await tester.pumpWidget(const SizedBox());
    api.byContext['work'] = HomeTasks(tasks: [
      task('one', group: 'WAITING', kind: 'SIGNATURES', title: 'Awaiting both signatures'),
      task('two', title: 'Continue the new check-out'),
    ]);
    await _pump(tester, api);
    expect(find.widgetWithText(FilledButton, 'Continue the new check-out'), findsOneWidget);
    await _reveal(tester, find.text('Awaiting both signatures'));
    final signature = find.widgetWithText(HomeTaskRow, 'Awaiting both signatures');
    expect(find.descendant(of: signature, matching: find.byType(IconButton)), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('View all dismisses individual rows and updates Home on return', (tester) async {
    final api = _HomeApi(cache: _ReminderCache(), byContext: {
      'work': HomeTasks(tasks: [
        for (var i = 0; i < 7; i++) task('i$i', property: 'Flat $i'),
      ]),
    });
    await _pump(tester, api);
    await _reveal(tester, find.text('View all 7'));
    await tester.tap(find.text('View all 7'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Dismiss reminder for Flat 0'));
    await tester.pumpAndSettle();
    expect(find.byType(HomeTaskListScreen), findsOneWidget);
    expect(find.text('Flat 0'), findsNothing);
    await tester.tap(find.text('Undo'));
    await tester.pumpAndSettle();
    expect(find.text('Flat 0'), findsOneWidget);
    await tester.tap(find.byTooltip('Dismiss reminder for Flat 1'));
    await tester.pumpAndSettle();
    expect(find.text('Flat 1'), findsNothing);
    await tester.pump(const Duration(seconds: 7));
    await tester.pumpAndSettle();
    expect(find.text('Undo'), findsNothing);
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.byType(HomeTaskListScreen), findsNothing);
    await _reveal(tester, find.text('View all 6'));
    expect(find.text('Flat 1'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  for (final waiting in [false, true]) {
    testWidgets('one inspection shortcut is still actionable with waiting=$waiting', (
      tester,
    ) async {
      final api = _HomeApi(byContext: {
        'work': HomeTasks(tasks: [
          task('only'),
          if (waiting)
            task('waiting', group: 'WAITING', kind: 'SIGNATURES'),
        ]),
      });
      await _pump(tester, api);
      expect(
        find.widgetWithText(FilledButton, 'Continue the check-in'),
        findsOneWidget,
      );
      expect(
        tester.widgetList<HomeTaskRow>(find.byType(HomeTaskRow)).map(
          (row) => row.task.id,
        ),
        isNot(contains('only')),
      );
      expect(find.textContaining('Needs your action'), findsNothing);
      expect(find.text('You’re all caught up'), findsNothing);
      expect(find.text('Nothing needs your action right now.'), findsNothing);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('client checks show as a card when something is due, and a button when not', (tester) async {
    await _pump(tester, _HomeApi(byContext: {
      'work': HomeTasks(tasks: [task('only')], dueDiligence: true, dueDiligenceCounts: (needsYou: 2, waiting: 1, freeLeft: null)),
    }));
    expect(find.text('Client checks (KYC/CDD)'), findsOneWidget);
    expect(find.text('2 need you · 1 waiting on clients'), findsOneWidget);

    await tester.pumpWidget(const SizedBox());
    await _pump(tester, _HomeApi(byContext: {
      'work': HomeTasks(tasks: [task('only')], dueDiligence: true, dueDiligenceCounts: (needsYou: 0, waiting: 0, freeLeft: 3)),
    }));
    expect(find.text('Client checks (KYC/CDD)'), findsNothing);
    expect(find.widgetWithText(OutlinedButton, 'Verify clients (KYC/CDD)'), findsOneWidget);

    await tester.pumpWidget(const SizedBox());
    await _pump(tester, _HomeApi(byContext: {'work': HomeTasks(tasks: [task('only')])}));
    expect(find.textContaining('KYC/CDD'), findsNothing, reason: 'outside the preview');
  });

  testWidgets('View all retains the inspection shown in the Home shortcut', (
    tester,
  ) async {
    final api = _HomeApi(byContext: {
      'work': HomeTasks(tasks: [
        for (var i = 0; i < 7; i++)
          task('inspection-$i', title: 'Inspection $i'),
      ]),
    });
    await _pump(tester, api);
    expect(find.widgetWithText(FilledButton, 'Inspection 0'), findsOneWidget);
    await _reveal(tester, find.text('View all 7'));
    await tester.tap(find.text('View all 7'));
    await tester.pumpAndSettle();
    expect(find.byType(HomeTaskListScreen), findsOneWidget);
    expect(
      tester.widgetList<HomeTaskRow>(find.byType(HomeTaskRow)).map(
        (row) => row.task.id,
      ),
      orderedEquals([for (var i = 0; i < 7; i++) 'inspection-$i']),
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('each row opens its exact screen and the list refreshes on return', (
    tester,
  ) async {
    final api = _HomeApi(byContext: {'work': _work});
    await _pump(tester, api);
    await _reveal(tester, find.text('Acknowledge the repair: Leaking tap'));
    await tester.tap(find.text('Acknowledge the repair: Leaking tap'));
    await tester.pumpAndSettle();
    expect(
      tester
          .widget<MaintenanceCaseScreen>(find.byType(MaintenanceCaseScreen))
          .caseId,
      'case-1',
    );
    api.byContext['work'] = HomeTasks(tasks: _work.tasks.take(2).toList());
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.text('Acknowledge the repair: Leaking tap'), findsNothing);
    expect(find.text('Needs your action · 1'), findsOneWidget);

    await tester.ensureVisible(find.text('Continue the check-in'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Continue the check-in'));
    await tester.pumpAndSettle();
    expect(
      tester.widget<InspectionScreen>(find.byType(InspectionScreen)).id,
      'older',
    );
  });

  testWidgets('a failed load is not an all-clear, and Try again recovers', (
    tester,
  ) async {
    final api = _HomeApi()..failure = const ApiFailure('Server down', 500);
    await _pump(tester, api);
    expect(find.text('Could not load your tasks'), findsOneWidget);
    expect(find.text('You’re all caught up'), findsNothing);
    api.failure = null;
    await tester.tap(find.text('Try again'));
    await tester.pumpAndSettle();
    expect(find.text('You’re all caught up'), findsOneWidget);
  });

  testWidgets('saved work is labelled while the fresh answer loads', (
    tester,
  ) async {
    final api = _HomeApi(byContext: {'work': _work});
    await _pump(tester, api);
    api.pending = Completer();
    await tester.drag(find.byType(ListView).first, const Offset(0, 300));
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    expect(find.text('Checking for updates…'), findsOneWidget);
    expect(find.text('Needs your action · 2'), findsOneWidget);
    api.pending!.complete(_work);
    await tester.pumpAndSettle();
    // The stream's done event reaches the screen through the real event loop, which
    // the test's fake clock does not run on its own.
    await tester.runAsync(() => Future<void>.delayed(Duration.zero));
    await tester.pump();
    expect(find.text('Checking for updates…'), findsNothing);
  });

  testWidgets(
    'one account switches between work and its homes, and Properties follows',
    (tester) async {
      final api = _HomeApi(
        contexts: const UserContexts(work: true, landlord: true, tenant: true),
        byContext: {
          'work': _work,
          'landlord': HomeTasks(
            tasks: [
              task(
                'own',
                kind: 'SIGN_REPORT',
                title: 'Review and sign the check-in report',
                person: 'As landlord',
                property: '8 Owned Lane',
                href: '/sign/report-b',
              ),
            ],
          ),
        },
      );
      await _pump(tester, api);
      await tester.tap(find.text('All my work'));
      await tester.pumpAndSettle();
      expect(find.text('MY WORK'), findsOneWidget);
      expect(find.text('YOUR HOMES'), findsOneWidget);
      expect(find.text('Homes I rent'), findsOneWidget);
      await tester.tap(find.text('Homes I own'));
      await tester.pumpAndSettle();
      expect(api.preference, 'landlord');
      // The previous context's rows never show under the new one.
      expect(find.text('Acknowledge the repair: Leaking tap'), findsNothing);
      expect(find.text('As landlord'), findsOneWidget);
      expect(find.text('New check-in'), findsNothing);

      await tester.tap(find.text('Review and sign the check-in report'));
      await tester.pumpAndSettle();
      expect(
        tester.widget<ReportScreen>(find.byType(ReportScreen)).id,
        'report-b',
      );
      await tester.pageBack();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Properties'));
      await tester.pumpAndSettle();
      expect(find.byType(PartyHomesScreen), findsOneWidget);
      expect(api.partyRequests.last, 'LANDLORD');
      expect(find.text('You are the landlord'), findsOneWidget);
      expect(find.text('Review and sign'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('a tenant with one home sees no picker and no agent tools', (
    tester,
  ) async {
    final api = _HomeApi(
      contexts: const UserContexts(work: false, landlord: false, tenant: true),
    );
    await _pump(tester, api);
    expect(api.requests, ['tenant']);
    expect(find.text('Showing'), findsNothing);
    expect(find.text('Teams'), findsNothing);
    expect(find.text('New check-in'), findsNothing);
    expect(find.byType(HandoverGuide), findsNothing);
    expect(find.text('You’re all caught up'), findsOneWidget);
  });

  testWidgets('a revoked saved context falls back without showing its records', (
    tester,
  ) async {
    final api = _HomeApi(
      contexts: const UserContexts(work: true, landlord: false, tenant: false),
    )..preference = 'landlord';
    await _pump(tester, api);
    expect(api.requests, ['work']);
    expect(api.preference, isNull);
  });

  testWidgets('a fresh account starts with one clear way in and the lessons', (
    tester,
  ) async {
    final api = _HomeApi(
      contexts: const UserContexts(work: false, landlord: false, tenant: false),
    );
    await _pump(tester, api);
    expect(find.text('Start check-in'), findsOneWidget);
    expect(find.text('You’re all caught up'), findsNothing);
    await _reveal(tester, find.text('A handover, in three steps'));
  });

  testWidgets('View all lists every row and says when the server stopped early', (
    tester,
  ) async {
    final many = HomeTasks(
      truncated: true,
      tasks: [
        for (var i = 0; i < 8; i++)
          task('w$i', group: 'WAITING', kind: 'SIGNATURES', title: 'Row $i'),
      ],
    );
    final api = _HomeApi(byContext: {'work': many});
    await _pump(tester, api);
    expect(find.text('Waiting on others · 5'), findsOneWidget);
    expect(find.text('Row 5'), findsNothing);
    await _reveal(tester, find.text('View all 8+'));
    await tester.tap(find.text('View all 8+'));
    await tester.pumpAndSettle();
    expect(find.byType(HomeTaskListScreen), findsOneWidget);
    await _reveal(tester, find.text('Row 7'));
    await _reveal(tester, find.textContaining('more than one screen of work'));
  });

  testWidgets('offline shows the saved copy with a warning', (tester) async {
    final api = _HomeApi(byContext: {'work': _work})..offlineCopy = true;
    await _pump(tester, api);
    expect(find.textContaining('Offline. Showing tasks'), findsOneWidget);
  });

  for (final size in const [Size(390, 844), Size(320, 568)]) {
    testWidgets('large text keeps every group reachable at $size', (
      tester,
    ) async {
      await _pump(
        tester,
        _HomeApi(byContext: {'work': _work}),
        scale: 2,
        size: size,
      );
      await _reveal(tester, find.text('Decide on the renewal'));
      expect(tester.takeException(), isNull);
    });
  }

  test('only a real passed deadline reads as overdue', () {
    final now = DateTime(2026, 10, 25);
    expect(
      homeTaskDate(
        task('a', date: '2026-10-01', dateKind: 'DEADLINE', overdue: true),
        now: now,
      ),
      'Overdue · was due by 1 Oct 2026',
    );
    expect(
      homeTaskDate(task('b', date: '2026-11-09', dateKind: 'DEADLINE'), now: now),
      'Due by 9 Nov 2026',
    );
    expect(
      homeTaskDate(task('c', date: '2026-10-20', dateKind: 'ENDS'), now: now),
      'Ended 20 Oct 2026',
    );
    expect(homeTaskDate(task('d'), now: now), isNull);
  });
}
