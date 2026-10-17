import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/screens/inspection_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/services/report_pdf_file.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

class _FakeApi extends Api {
  _FakeApi({this.activeLink = false})
    : super(attachAuth: false, cache: ReadCache());
  bool activeLink;
  int created = 0;
  int printed = 0;

  @override
  Future<InspectionDetail> inspection(String id) async =>
      InspectionDetail.fromJson({
        'id': id,
        'kind': 'CHECK_IN',
        'status': 'COMPLETED',
        'property': '12 Green Road',
        'landlord': 'Landlord',
        'tenant': 'Tenant',
        'landlordId': 'landlord-1',
        'tenantId': 'tenant-1',
        'summary': null,
        'baselineId': null,
        'checkOutId': null,
        'shareToken': activeLink ? 'report-token' : null,
        'shareUrl': activeLink
            ? 'https://kivilo.test/reports/report-token'
            : null,
        'rooms': [],
        'signatures': [],
        'findings': [],
        'maintenanceHistory': [],
        'checkOutItems': [],
        'checkInItems': [],
        'latestAssessment': null,
        'assessmentDraftChanged': false,
      });

  @override
  Future<String> share(String inspectionId) async {
    created++;
    activeLink = true;
    return 'https://kivilo.test/reports/report-token';
  }

  @override
  Future<String> reportPdf(String inspectionId) async {
    printed++;
    return 'https://storage.test/report.pdf?token=short-lived-secret';
  }
}

class _PdfFile extends ReportPdfFile {
  _PdfFile(this.file);
  final File file;
  String? requested;

  @override
  Future<File> download(String url, String name) async {
    requested = url;
    return file;
  }
}

void main() {
  late List<MethodCall> shares;
  const channel = MethodChannel('dev.fluttercommunity.plus/share');

  setUp(() {
    shares = [];
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          shares.add(call);
          return '';
        });
  });
  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  Future<void> open(
    WidgetTester tester,
    _FakeApi api, {
    ReportPdfFile? pdf,
  }) async {
    tester.view.physicalSize = const Size(1179, 4000);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      MaterialApp(
        theme: buildKiviloTheme(),
        home: InspectionScreen(id: 'inspection-1', api: api, reportPdf: pdf),
      ),
    );
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Share link'), 300);
    await tester.pumpAndSettle();
  }

  testWidgets(
    'share card offers PDF viewing and sharing, with no revoke action',
    (tester) async {
      await open(tester, _FakeApi());
      expect(find.text('View PDF'), findsOneWidget);
      expect(find.text('Share PDF'), findsOneWidget);
      expect(find.text('Share link'), findsOneWidget);
      expect(find.text('Revoke link'), findsNothing);
    },
  );

  for (final active in [false, true]) {
    testWidgets(
      'native link sharing ${active ? 'reuses an active link' : 'creates a link when needed'}',
      (tester) async {
        final api = _FakeApi(activeLink: active);
        await open(tester, api);
        await tester.tap(find.text('Share link'));
        await tester.pumpAndSettle();
        expect(api.created, active ? 0 : 1);
        final args = shares.single.arguments as Map;
        expect(args['text'], 'https://kivilo.test/reports/report-token');
        expect(args['originWidth'], greaterThan(0));
        expect(args['originHeight'], greaterThan(0));
      },
    );
  }

  testWidgets(
    'Share PDF sends a local attachment and never a signed storage URL',
    (tester) async {
      final root = Directory.systemTemp.createTempSync('kivilo-share-pdf-');
      addTearDown(() => root.deleteSync(recursive: true));
      final file = File('${root.path}/Kivilo report.pdf')
        ..writeAsStringSync('%PDF-1.7\nreport');
      final pdf = _PdfFile(file);
      final api = _FakeApi();
      await open(tester, api, pdf: pdf);
      await tester.tap(find.text('Share PDF'));
      await tester.pumpAndSettle();
      expect(api.printed, 1);
      expect(pdf.requested, contains('short-lived-secret'));
      final args = shares.single.arguments as Map;
      expect(args['paths'], [file.path]);
      expect(args['mimeTypes'], ['application/pdf']);
      expect(args['text'], isNull);
      expect(args['uri'], isNull);
      expect(args.toString(), isNot(contains('short-lived-secret')));
    },
  );
}
