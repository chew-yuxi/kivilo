import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/maintenance.dart';
import 'package:kivilo/models/report.dart';
import 'package:kivilo/screens/photo_mark_screen.dart';
import 'package:kivilo/screens/report_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

Map<String, dynamic> reportJson({
  String status = 'AWAITING_SIGNATURE',
  String? signAs,
}) => {
  'id': 'inspection-1',
  'kind': 'CHECK_IN',
  'status': status,
  'signAs': signAs,
  'property': '#28-05, 2 Marina Boulevard, Singapore 018987',
  'landlord': 'Tan Wei Ming',
  'tenant': 'Priya Raman',
  'agent': 'Jocelyn Ng',
  'startDate': '2026-10-01T00:00:00.000Z',
  'endDate': '2027-09-30T00:00:00.000Z',
  'deposit': '6000',
  'conductedAt': '2026-10-01T02:00:00.000Z',
  'conductedBy': 'Jocelyn Ng',
  'rooms': [
    {
      'id': 'room-1',
      'name': 'Kitchen',
      'items': [
        {
          'id': 'item-1',
          'name': 'Fridge',
          'quantity': 1,
          'identifier': 'SAMSUNG RF48A4000S9',
          'condition': 'GOOD',
          'meterReading': null,
          'notes': 'Small dent on the left door',
        },
      ],
      'photos': [
        {
          'id': 'photo-1',
          'url': 'https://storage.test/photo-1.jpg',
          'note': 'Fridge door',
          'annotations': {
            'width': 1200,
            'height': 1600,
            'marks': [
              {
                'shape': 'ring',
                'cx': 0.4,
                'cy': 0.5,
                'rx': 0.1,
                'ry': 0.1,
                'note': 'Dent',
              },
            ],
          },
        },
        {
          'id': 'photo-2',
          'url': 'https://storage.test/photo-2.jpg',
          'note': null,
          'annotations': null,
        },
      ],
    },
  ],
  'signatures': [
    {
      'name': 'Priya Raman',
      'signedAt': '2026-10-01T03:00:00.000Z',
      'imageData': 'data:,',
    },
  ],
  'assessment': null,
};

class FakeReportApi extends Api {
  FakeReportApi(this.json) : super(attachAuth: false, cache: ReadCache());
  final Map<String, dynamic> json;

  @override
  Future<SignedReport> report(String inspectionId) async =>
      SignedReport.fromJson(json);
}

void main() {
  test(
    'a tenancy carries its latest report, and an old response still parses',
    () {
      final base = {
        'id': 'tenancy-1',
        'role': 'TENANT',
        'propertyId': 'property-1',
        'property': '2 Marina Boulevard #28-05',
        'postalCode': '018987',
        'landlord': 'Tan Wei Ming',
        'tenant': 'Priya Raman',
        'maintenanceCases': 0,
        'inspections': 1,
      };
      final current = TenancySummary.fromJson({
        ...base,
        'latestReport': {
          'id': 'inspection-1',
          'kind': 'CHECK_IN',
          'status': 'AWAITING_SIGNATURE',
          'awaitingMySignature': true,
        },
      });
      expect(current.latestReportId, 'inspection-1');
      expect(current.awaitingMySignature, isTrue);
      expect(current.latestReportStatus, 'AWAITING_SIGNATURE');
      expect(TenancySummary.fromJson(base).latestReportId, isNull);
    },
  );

  test('a timeline event carries the report a party may open', () {
    final event = TimelineEvent.fromJson({
      'id': 'inspection-1:signed',
      'at': '2026-10-01T03:00:00.000Z',
      'kind': 'CHECK_IN_SIGNED',
      'title': 'Check-in signed',
      'detail': 'Signed by both parties',
      'tenancyId': 'tenancy-1',
      'link': null,
      'reportId': 'inspection-1',
    });
    expect(event.linkId, isNull);
    expect(event.reportId, 'inspection-1');
  });

  testWidgets('shows a report awaiting signature, marks and all', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: ReportScreen(
          id: 'inspection-1',
          api: FakeReportApi(reportJson()),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Check-in report'), findsOneWidget);
    expect(find.text('Awaiting signatures'), findsOneWidget);
    expect(find.text('Kitchen'), findsOneWidget);
    expect(find.text('SAMSUNG RF48A4000S9'), findsOneWidget);
    expect(find.text('Good'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.textContaining('1 area marked'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.textContaining('1 area marked'), findsOneWidget);
    expect(find.textContaining('1. Dent'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) => widget is CustomPaint && widget.painter is MarkPainter,
      ),
      findsOneWidget,
    );
    await tester.scrollUntilVisible(
      find.text('Agreed and signed'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Priya Raman'), findsWidgets);
  });

  testWidgets('says when a room had nothing to record', (tester) async {
    final json = reportJson();
    (json['rooms'] as List).add({
      'id': 'room-2',
      'name': 'Store room',
      'items': <Map<String, dynamic>>[],
      'photos': <Map<String, dynamic>>[],
    });
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: ReportScreen(id: 'inspection-1', api: FakeReportApi(json)),
      ),
    );
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.text('Nothing recorded in this room.'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Store room'), findsOneWidget);
    expect(find.text('Nothing recorded in this room.'), findsOneWidget);
  });

  testWidgets('says both parties signed once it is complete', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: ReportScreen(
          id: 'inspection-1',
          api: FakeReportApi(reportJson(status: 'COMPLETED')),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Signed by both parties · 1 Oct 2026'), findsOneWidget);
    expect(find.textContaining('Sign as'), findsNothing);
  });

  testWidgets('offers the landlord their signature while the report waits', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: ReportScreen(
          id: 'inspection-1',
          api: FakeReportApi(reportJson(signAs: 'LANDLORD')),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Sign as landlord'), findsOneWidget);
  });
}
