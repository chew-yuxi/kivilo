import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/models/agency.dart';
import 'package:kivilo/models/maintenance.dart';
import 'package:kivilo/models/renewal.dart';
import 'package:kivilo/screens/home_screen.dart';
import 'package:kivilo/models/property_work.dart';
import 'package:kivilo/screens/properties_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

class _WorkspaceApi extends Api {
  _WorkspaceApi({this.partyOnly = false}) : super(attachAuth: false);

  final bool partyOnly;
  int inspectionReads = 0;
  int propertyReads = 0;
  int renewalReads = 0;

  @override
  Future<List<PropertyWorkItem>> propertyWork({
    String? agencyId,
    String? assigneeId,
    bool personal = false,
    String state = 'active',
  }) async {
    if (readingSavedCopy) throw StateError('nothing saved');
    propertyReads++;
    return [
      for (var index = 1; index <= 20; index++)
        PropertyWorkItem(
          id: 'property-$index',
          address: 'Property $index at a long Cairnhill Rise address',
          state: 'ACTIVE',
          tenant: 'Tenant with a long name',
          stage: index <= 16 ? 'CHECK_IN_IN_PROGRESS' : 'RUNNING',
          stageLabel: index <= 16 ? 'Check-in in progress' : 'Tenancy running',
          reports: 1,
        ),
    ];
  }

  @override
  Future<AgencyIndex> agencies() async =>
      const AgencyIndex(agencies: [], invitations: []);
  @override
  Future<String?> workspacePreference() async => null;
  @override
  Future<void> saveWorkspacePreference(String? value) async {}
  @override
  Future<List<InspectionSummary>> inspectionWork({
    String? agencyId,
    String? assigneeId,
    bool personal = false,
  }) => inspections();
  @override
  Future<List<TenancySummary>> tenancyWork({
    String? agencyId,
    bool personal = false,
  }) => tenancies();
  @override
  Future<List<RenewalReminder>> renewalWork({
    String? agencyId,
    bool personal = false,
  }) => renewals();
  @override
  Future<UserProfile> me() async => UserProfile(
    id: 'agent',
    name: 'Alex Agent',
    roles: partyOnly ? ['TENANT'] : ['AGENT'],
  );

  @override
  Future<List<TenancySummary>> tenancies() async => [
    for (var index = 1; index <= 4; index++)
      TenancySummary(
        id: 'tenancy-$index',
        role: partyOnly ? 'TENANT' : 'AGENT',
        propertyId: 'property-$index',
        property: 'Property $index at Cairnhill Rise',
        postalCode: '229700',
        landlord: 'Landlord',
        tenant: 'Tenant',
        maintenanceCases: 0,
        inspections: 1,
      ),
  ];

  @override
  Future<List<InspectionSummary>> inspections() async {
    if (readingSavedCopy) throw StateError('nothing saved');
    inspectionReads++;
    if (partyOnly) return [];
    return [
      for (var index = 1; index <= 20; index++)
        InspectionSummary(
          id: 'inspection-$index',
          tenancyId: 'tenancy-$index',
          kind: 'CHECK_IN',
          status: index <= 16 ? 'DRAFT' : 'COMPLETED',
          property: 'Inspection $index at a long Cairnhill Rise address',
          tenant: 'Tenant with a long name',
          rooms: 5,
        ),
    ];
  }

  @override
  Future<List<RenewalReminder>> renewals() async {
    renewalReads++;
    return [];
  }
}

Finder _cardWith(String text) =>
    find.ancestor(of: find.text(text), matching: find.byType(Card)).first;

void main() {
  testWidgets(
    'resizing keeps the selected tab, loaded data and scroll position',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(390, 844);
      addTearDown(tester.view.reset);
      final api = _WorkspaceApi();
      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          home: HomeScreen(api: api),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(NavigationRail), findsNothing);
      expect(find.byType(BottomNavigationBar), findsOneWidget);

      await tester.tap(
        find.descendant(
          of: find.byType(BottomNavigationBar),
          matching: find.text('Properties'),
        ),
      );
      await tester.pumpAndSettle();
      final original = tester.state(find.byType(PropertiesScreen));
      final scrollable = tester.state<ScrollableState>(
        find.descendant(
          of: find.byType(PropertiesScreen),
          matching: find.byWidgetPredicate(
            (widget) => widget is Scrollable &&
                axisDirectionToAxis(widget.axisDirection) == Axis.vertical,
          ),
        ),
      );
      await tester.drag(find.byType(ListView), const Offset(0, -400));
      await tester.pumpAndSettle();
      final scrollOffset = scrollable.position.pixels;
      expect(scrollOffset, greaterThan(0));
      expect(api.inspectionReads, 1);
      expect(api.propertyReads, 1);
      expect(api.renewalReads, 1);

      tester.view.physicalSize = const Size(1024, 768);
      await tester.pumpAndSettle();
      expect(find.byType(BottomNavigationBar), findsNothing);
      final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
      expect(rail.destinations, hasLength(3));
      expect(rail.selectedIndex, 1);
      expect(tester.state(find.byType(PropertiesScreen)), same(original));
      expect(scrollable.position.pixels, scrollOffset);
      expect(api.inspectionReads, 1);
      expect(api.propertyReads, 1);
      expect(api.renewalReads, 1);
      expect(tester.takeException(), isNull);

      // A narrow iPad multitasking window uses the phone navigation again.
      tester.view.physicalSize = const Size(600, 800);
      await tester.pumpAndSettle();
      expect(find.byType(NavigationRail), findsNothing);
      expect(
        tester
            .widget<BottomNavigationBar>(find.byType(BottomNavigationBar))
            .currentIndex,
        1,
      );
      expect(tester.state(find.byType(PropertiesScreen)), same(original));
      expect(scrollable.position.pixels, scrollOffset);
      expect(api.inspectionReads, 1);
      expect(api.propertyReads, 1);
      expect(api.renewalReads, 1);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'party home uses two tablet columns and keeps party destinations',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(1024, 1366);
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(textScaler: TextScaler.linear(1.6)),
            child: child!,
          ),
          home: HomeScreen(api: _WorkspaceApi(partyOnly: true)),
        ),
      );
      await tester.pumpAndSettle();
      final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
      expect(rail.destinations, hasLength(2));
      expect(find.text('Properties'), findsNothing);
      final first = tester.getRect(_cardWith('Property 1 at Cairnhill Rise'));
      final second = tester.getRect(_cardWith('Property 2 at Cairnhill Rise'));
      expect(first.top, second.top);
      expect(first.right, lessThan(second.left));
      expect(first.width, lessThan(560));
      expect(tester.takeException(), isNull);

      tester.view.physicalSize = const Size(768, 1024);
      await tester.pumpAndSettle();
      await tester.drag(find.byType(ListView), const Offset(0, -300));
      await tester.pumpAndSettle();
      final narrowFirst = tester.getRect(
        _cardWith('Property 1 at Cairnhill Rise'),
      );
      final narrowSecond = tester.getRect(
        _cardWith('Property 2 at Cairnhill Rise'),
      );
      expect(narrowFirst.left, narrowSecond.left);
      expect(narrowFirst.bottom, lessThan(narrowSecond.top));
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'properties use natural-height tablet cards and fit split view',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(1600, 1100);
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(textScaler: TextScaler.linear(1.8)),
            child: child!,
          ),
          home: PropertiesScreen(api: _WorkspaceApi()),
        ),
      );
      await tester.pumpAndSettle();
      final first = tester.getRect(
        _cardWith('Property 1 at a long Cairnhill Rise address'),
      );
      final second = tester.getRect(
        _cardWith('Property 2 at a long Cairnhill Rise address'),
      );
      expect(first.top, second.top);
      expect(first.right, lessThan(second.left));
      expect(tester.getSize(find.byType(ListView)).width, 1200);
      expect(tester.getCenter(find.byType(ListView)).dx, 800);
      expect(tester.takeException(), isNull);

      tester.view.physicalSize = const Size(520, 900);
      await tester.pumpAndSettle();
      await tester.drag(find.byType(ListView), const Offset(0, -300));
      await tester.pumpAndSettle();
      final narrowFirst = tester.getRect(
        _cardWith('Property 1 at a long Cairnhill Rise address'),
      );
      final narrowSecond = tester.getRect(
        _cardWith('Property 2 at a long Cairnhill Rise address'),
      );
      expect(narrowFirst.left, narrowSecond.left);
      expect(narrowFirst.bottom, lessThan(narrowSecond.top));
      expect(narrowFirst.width, lessThan(520));
      expect(tester.takeException(), isNull);
    },
  );
}
