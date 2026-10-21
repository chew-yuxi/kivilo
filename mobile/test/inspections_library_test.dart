import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/models/renewal.dart';
import 'package:kivilo/screens/inspections_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

const _reports = [
  InspectionSummary(
    id: 'draft',
    kind: 'CHECK_IN',
    status: 'DRAFT',
    property: '12 Bayview Road',
    tenant: 'Alice Tan',
    rooms: 4,
  ),
  InspectionSummary(
    id: 'review',
    kind: 'CHECK_OUT',
    status: 'REVIEW',
    property: '8 Orchard Lane',
    tenant: 'Ben Lim',
    rooms: 3,
  ),
  InspectionSummary(
    id: 'awaiting',
    kind: 'CHECK_IN',
    status: 'AWAITING_SIGNATURE',
    property: '24 Bayview Road',
    tenant: 'Chandra Singh',
    rooms: 2,
  ),
  InspectionSummary(
    id: 'completed',
    kind: 'CHECK_OUT',
    status: 'COMPLETED',
    property: '3 Emerald Hill',
    tenant: 'Dana Lee',
    rooms: 5,
  ),
];

class _LibraryApi extends Api {
  _LibraryApi({this.reports = _reports})
    : super(attachAuth: false, cache: ReadCache());

  final List<InspectionSummary> reports;
  int inspectionReads = 0;

  @override
  Future<List<InspectionSummary>> inspections() async {
    inspectionReads++;
    return reports;
  }

  @override
  Future<List<RenewalReminder>> renewals() async => [];
}

Future<void> _open(WidgetTester tester, _LibraryApi api) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(390, 1400);
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      theme: buildKiviloTheme(),
      home: InspectionsScreen(api: api),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('searches property, tenant and report kind without reloading', (
    tester,
  ) async {
    final api = _LibraryApi();
    await _open(tester, api);

    await tester.enterText(find.byType(TextField), '  BAYVIEW  ');
    await tester.pumpAndSettle();
    expect(find.text('12 Bayview Road'), findsOneWidget);
    expect(find.text('24 Bayview Road'), findsOneWidget);
    expect(find.text('8 Orchard Lane'), findsNothing);
    expect(find.text('2 reports found'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'chandra');
    await tester.pumpAndSettle();
    expect(find.text('24 Bayview Road'), findsOneWidget);
    expect(find.text('12 Bayview Road'), findsNothing);
    expect(find.text('1 report found'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'check out');
    await tester.pumpAndSettle();
    expect(find.text('8 Orchard Lane'), findsOneWidget);
    expect(find.text('3 Emerald Hill'), findsOneWidget);
    expect(find.text('12 Bayview Road'), findsNothing);
    expect(find.text('24 Bayview Road'), findsNothing);
    expect(api.inspectionReads, 1);
    expect(tester.takeException(), isNull);
  });

  testWidgets('status filters distinguish work, signatures and completion', (
    tester,
  ) async {
    await _open(tester, _LibraryApi());

    await tester.tap(find.text('In progress · 2'));
    await tester.pumpAndSettle();
    expect(find.text('12 Bayview Road'), findsOneWidget);
    expect(find.text('8 Orchard Lane'), findsOneWidget);
    expect(find.text('24 Bayview Road'), findsNothing);
    expect(find.text('3 Emerald Hill'), findsNothing);

    await tester.tap(find.text('Awaiting signature · 1'));
    await tester.pumpAndSettle();
    expect(find.text('24 Bayview Road'), findsOneWidget);
    expect(find.text('12 Bayview Road'), findsNothing);
    expect(find.text('8 Orchard Lane'), findsNothing);
    expect(find.text('3 Emerald Hill'), findsNothing);

    await tester.tap(find.text('Completed · 1'));
    await tester.pumpAndSettle();
    expect(find.text('3 Emerald Hill'), findsOneWidget);
    expect(find.text('24 Bayview Road'), findsNothing);
    expect(find.text('12 Bayview Road'), findsNothing);
    expect(find.text('8 Orchard Lane'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('combines search and filters and recovers from no results', (
    tester,
  ) async {
    await _open(tester, _LibraryApi());
    await tester.enterText(find.byType(TextField), 'bayview');
    await tester.tap(find.text('Completed · 1'));
    await tester.pumpAndSettle();

    expect(find.text('No matching inspections'), findsOneWidget);
    expect(find.text('No inspections yet'), findsNothing);
    expect(find.text('0 reports found'), findsOneWidget);
    expect(find.text('3 Emerald Hill'), findsNothing);

    await tester.tap(find.text('Show all inspections'));
    await tester.pumpAndSettle();
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      '',
    );
    expect(find.text('No matching inspections'), findsNothing);
    expect(find.text('4 reports'), findsOneWidget);
    expect(find.text('12 Bayview Road'), findsOneWidget);
    expect(find.text('3 Emerald Hill'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('an empty library explains the first check-in', (tester) async {
    await _open(tester, _LibraryApi(reports: []));
    expect(find.text('No inspections yet'), findsOneWidget);
    expect(find.text('Start check-in'), findsOneWidget);
    expect(find.byType(TextField), findsNothing);
    expect(find.byType(ChoiceChip), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
