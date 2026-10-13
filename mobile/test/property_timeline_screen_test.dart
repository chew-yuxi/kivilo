import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/maintenance.dart';
import 'package:kivilo/screens/property_timeline_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

class FakeTimelineApi extends Api {
  FakeTimelineApi(this.events) : super(attachAuth: false, cache: ReadCache());
  final List<Map<String, dynamic>> events;

  @override
  Future<PropertyTimeline> propertyTimeline(String propertyId) async =>
      PropertyTimeline.fromJson({
        'property': '#04-11, 12 Holland Avenue, Singapore 278991',
        'tenancies': <Map<String, dynamic>>[],
        'events': events,
      });
}

Map<String, dynamic> event(
  String kind,
  String title,
  String at, {
  String? detail,
  Map<String, dynamic>? link,
  String? reportId,
}) => {
  'id': '$kind:$at',
  'at': at,
  'kind': kind,
  'title': title,
  'detail': detail,
  'tenancyId': 'tenancy-1',
  'link': link,
  'reportId': reportId,
};

final sampleEvents = [
  event(
    'COST_AGREED',
    'Cost agreed: Cracked basin',
    '2026-10-12T09:00:00Z',
    detail:
        'Tenant pays the first S\$150, landlord pays the rest. '
        'Landlord arranges the repair.',
    link: {'type': 'maintenance', 'id': 'case-1'},
  ),
  event(
    'REPAIRED',
    'Repaired: Cracked basin',
    '2026-10-10T09:00:00Z',
    detail: 'S\$420.00',
    link: {'type': 'maintenance', 'id': 'case-1'},
  ),
  event(
    'PROBLEM_REPORTED',
    'Reported: Cracked basin',
    '2026-10-02T09:00:00Z',
    link: {'type': 'maintenance', 'id': 'case-1'},
  ),
  event(
    'CHECK_IN_SIGNED',
    'Check-in signed',
    '2025-02-02T10:00:00Z',
    detail: 'Signed by both parties',
  ),
  event(
    'TENANCY_STARTED',
    'Tenancy began',
    '2025-02-01T00:00:00Z',
    detail: 'Taylor Tenant',
  ),
];

Future<void> pumpTimeline(
  WidgetTester tester,
  List<Map<String, dynamic>> events,
) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: buildKiviloTheme(),
      home: PropertyTimelineScreen(
        propertyId: 'property-1',
        api: FakeTimelineApi(events),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('groups settled events by month, newest first', (tester) async {
    await pumpTimeline(tester, sampleEvents);
    expect(find.text('October 2026'), findsOneWidget);
    expect(find.text('Repaired: Cracked basin'), findsOneWidget);
    expect(find.text('S\$420.00'), findsOneWidget);
    expect(find.text('10 Oct 2026'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('February 2025'), 300);
    expect(find.text('Tenancy began'), findsOneWidget);
    // Only the three maintenance rows can be opened by this viewer.
    expect(find.byIcon(Icons.chevron_right), findsNWidgets(3));
  });

  testWidgets('lets a landlord or tenant open the report they signed', (
    tester,
  ) async {
    await pumpTimeline(tester, [
      event(
        'CHECK_IN_SIGNED',
        'Check-in signed',
        '2025-02-02T10:00:00Z',
        detail: 'Signed by both parties',
        reportId: 'inspection-1',
      ),
    ]);
    expect(find.byIcon(Icons.chevron_right), findsOneWidget);
  });

  testWidgets('says so when nothing has been settled yet', (tester) async {
    await pumpTimeline(tester, const []);
    expect(
      find.textContaining('Nothing has been settled here yet'),
      findsOneWidget,
    );
  });
}
