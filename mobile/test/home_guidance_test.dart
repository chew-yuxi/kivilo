import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/models/maintenance.dart';
import 'package:kivilo/screens/home_screen.dart';
import 'package:kivilo/screens/tenancy_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

class _HomeApi extends Api {
  _HomeApi({this.statuses = const [], this.partyOnly = false})
    : super(attachAuth: false);

  final List<String> statuses;
  final bool partyOnly;
  String? propertyOpened;

  @override
  Future<UserProfile> me() async => UserProfile(
    id: 'agent',
    name: 'Alex Agent',
    roles: [partyOnly ? 'TENANT' : 'AGENT'],
  );

  @override
  Future<List<InspectionSummary>> inspections() async => [
    for (var i = 0; i < statuses.length; i++)
      InspectionSummary(
        id: 'inspection-$i',
        tenancyId: 'tenancy',
        kind: 'CHECK_IN',
        status: statuses[i],
        property: 'Property $i',
        tenant: 'Sam',
        rooms: 2,
      ),
  ];

  @override
  Future<List<TenancySummary>> tenancies() async => [
    TenancySummary(
      id: 'tenancy',
      role: partyOnly ? 'TENANT' : 'AGENT',
      propertyId: 'property',
      property: '42 Cairnhill Rise',
      postalCode: '229700',
      landlord: 'Pat',
      tenant: 'Sam',
      maintenanceCases: 0,
      inspections: statuses.length,
    ),
  ];

  @override
  Future<List<MaintenanceCaseSummary>> maintenanceCases(
    String tenancyId,
  ) async {
    propertyOpened = tenancyId;
    return [];
  }

  @override
  Future<List<PropertyAssetSummary>> propertyAssets(String propertyId) async =>
      [];

  @override
  Future<TenancyDetail> tenancy(String tenancyId) async => const TenancyDetail(
    id: 'tenancy',
    role: 'AGENT',
    agentMayAgreeCosts: false,
    canEditMinorRepairCap: false,
    canEditAgentAuthority: false,
  );
}

Future<void> _pumpHome(
  WidgetTester tester,
  _HomeApi api, {
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
  for (var i = 0; i < 20 && target.hitTestable().evaluate().isEmpty; i++) {
    await tester.drag(find.byType(ListView).first, const Offset(0, -240));
    await tester.pumpAndSettle();
  }
  expect(target.hitTestable(), findsOneWidget);
}

void main() {
  testWidgets(
    'home prioritises editable work over an earlier awaiting report',
    (tester) async {
      await _pumpHome(
        tester,
        _HomeApi(statuses: ['AWAITING_SIGNATURE', 'DRAFT']),
      );
      expect(find.text('Property 1'), findsOneWidget);
      expect(find.text('Property 0'), findsNothing);
      expect(find.text('Continue inspection'), findsOneWidget);
      expect(
        find.text('1 in progress · 1 awaiting signatures'),
        findsOneWidget,
      );
    },
  );

  testWidgets('awaiting signature is not presented as editable work', (
    tester,
  ) async {
    await _pumpHome(tester, _HomeApi(statuses: ['AWAITING_SIGNATURE']));
    expect(find.text('Check signatures'), findsOneWidget);
    expect(find.text('Continue inspection'), findsNothing);
    expect(find.textContaining('The inventory is frozen.'), findsOneWidget);
  });

  testWidgets(
    'completed work offers one start action and useful expandable guidance',
    (tester) async {
      await _pumpHome(tester, _HomeApi(statuses: ['COMPLETED']));
      expect(find.text('Start check-in'), findsOneWidget);
      expect(find.text('Continue inspection'), findsNothing);
      await _reveal(tester, find.text('Write what you see'));
      await tester.tap(find.text('Write what you see'));
      await tester.pumpAndSettle();
      expect(
        find.textContaining('Open a room and check its starter items.'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'property card always opens the property even with an active inspection',
    (tester) async {
      final api = _HomeApi(statuses: ['DRAFT']);
      await _pumpHome(tester, api);
      await _reveal(tester, find.text('42 Cairnhill Rise'));
      await tester.tap(find.text('42 Cairnhill Rise'));
      await tester.pumpAndSettle();
      expect(find.byType(TenancyScreen), findsOneWidget);
      expect(
        tester.widget<TenancyScreen>(find.byType(TenancyScreen)).currentInspection?.id,
        'inspection-0',
      );
      expect(api.propertyOpened, 'tenancy');
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'large text keeps home actions and lessons reachable without overflow',
    (tester) async {
      await _pumpHome(tester, _HomeApi(statuses: ['DRAFT']), scale: 2);
      await _reveal(tester, find.text('Agree and sign'));
      await tester.tap(find.text('Agree and sign'));
      await tester.pumpAndSettle();
      await _reveal(tester, find.text('Open property'));
      expect(find.text('Open property'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  for (final size in const [Size(390, 844), Size(320, 568)]) {
    testWidgets('home keeps the next action reachable without artwork at $size', (
      tester,
    ) async {
      await _pumpHome(tester, _HomeApi(statuses: ['DRAFT']), size: size);
      final action = find.text('Continue inspection');
      if (size.height >= 700) {
        expect(action.hitTestable(), findsOneWidget);
      }
      await _reveal(tester, action);
      await _reveal(tester, find.text('Agree and sign'));
      await tester.tap(find.text('Agree and sign'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Once both sign, the PDF is ready.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets(
    'tenant home keeps reports and repairs without inspector lessons',
    (tester) async {
      await _pumpHome(tester, _HomeApi(partyOnly: true));
      expect(find.text('Repairs'), findsOneWidget);
      expect(find.text('Your properties'), findsOneWidget);
      expect(find.text('A handover, in three steps'), findsNothing);
      expect(find.text('Inspections'), findsNothing);
    },
  );
}
