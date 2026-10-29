import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/property_work.dart';
import 'package:kivilo/screens/property_card.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

Map<String, dynamic> _json(Map<String, dynamic> extra) => {
  'id': 'p1',
  'address': '12 Marina Boulevard #23-01, 018982',
  'state': 'ACTIVE',
  'tenant': 'Tan Wei Ling',
  'stage': 'RUNNING',
  'stageLabel': 'Tenancy running',
  'reports': 1,
  ...extra,
};

Future<void> _show(WidgetTester tester, PropertyWorkItem property) =>
    tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: Scaffold(
          body: PropertyCard(
            property: property,
            onTap: () {},
            now: DateTime(2026, 10, 29),
          ),
        ),
      ),
    );

void main() {
  testWidgets('shows the lease, the next step and what is waiting', (
    tester,
  ) async {
    await _show(
      tester,
      PropertyWorkItem.fromJson(
        _json({
          'stage': 'CHECK_IN_AWAITING',
          'stageLabel': 'Check-in awaiting signatures',
          'startDate': '2026-01-01T00:00:00Z',
          'endDate': '2027-03-01T00:00:00Z',
          'nextStep': 'Waiting on Lee and Tan to sign',
          'attention': {
            'openRepairs': 2,
            'pendingUpdates': 1,
            'depositAnswersMissing': 1,
          },
        }),
      ),
    );
    expect(find.text('Waiting on Lee and Tan to sign'), findsOneWidget);
    expect(find.text('Check-in awaiting signatures'), findsNothing);
    expect(find.text('4 months left'), findsOneWidget);
    expect(find.text('2 open repairs'), findsOneWidget);
    expect(find.text('1 update to acknowledge'), findsOneWidget);
    expect(find.text('Deposit: 1 answer pending'), findsOneWidget);
    expect(find.byIcon(Icons.home_outlined), findsOneWidget);
  });

  testWidgets('reads a copy saved before the card had these details', (
    tester,
  ) async {
    await _show(tester, PropertyWorkItem.fromJson(_json({})));
    expect(find.text('Tenancy running'), findsOneWidget);
    expect(find.byType(LinearProgressIndicator), findsNothing);
    expect(find.textContaining('open repair'), findsNothing);
  });

  testWidgets('words the lease by where today falls in it', (tester) async {
    Future<void> lease(String start, String end) => _show(
      tester,
      PropertyWorkItem.fromJson(_json({'startDate': start, 'endDate': end})),
    );
    await lease('2026-11-01T00:00:00Z', '2028-10-31T00:00:00Z');
    expect(find.text('Starts 1 Nov 2026'), findsOneWidget);
    await lease('2024-11-15T00:00:00Z', '2026-11-14T00:00:00Z');
    expect(find.text('16 days left'), findsOneWidget);
    await lease('2024-10-01T00:00:00Z', '2026-09-30T00:00:00Z');
    expect(find.textContaining('Ended 30 Sep 2026'), findsOneWidget);
  });
}
