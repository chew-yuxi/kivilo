import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/services/report_pdf_file.dart';

class _PdfAdapter implements HttpClientAdapter {
  String body = '%PDF-1.7\nreport';
  final requests = <RequestOptions>[];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    return ResponseBody.fromString(
      body,
      200,
      headers: {
        Headers.contentTypeHeader: ['application/pdf'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  late Directory root;
  late _PdfAdapter adapter;
  late ReportPdfFile pdf;

  setUp(() {
    root = Directory.systemTemp.createTempSync('kivilo-pdf-test-');
    adapter = _PdfAdapter();
    pdf = ReportPdfFile(
      downloads: Dio()..httpClientAdapter = adapter,
      temporaryDirectory: () async => root,
    );
  });
  tearDown(() => root.deleteSync(recursive: true));

  test(
    'downloads real PDF bytes under a safe name without forwarding a bearer',
    () async {
      final file = await pdf.download(
        'https://storage.test/report.pdf?token=secret',
        'Kivilo 12/3 Road #04, Singapore',
      );
      expect(await file.readAsString(), '%PDF-1.7\nreport');
      expect(file.uri.pathSegments.last, 'Kivilo 12 3 Road  04  Singapore.pdf');
      expect(
        adapter.requests.single.headers.containsKey('Authorization'),
        isFalse,
      );
      expect(file.path, isNot(contains('secret')));
    },
  );

  test(
    'a later download cannot share an old PDF or overwrite one still open',
    () async {
      final first = await pdf.download(
        'https://storage.test/first.pdf',
        'Kivilo report',
      );
      adapter.body = '%PDF-1.7\nwith a published update';
      final second = await pdf.download(
        'https://storage.test/second.pdf',
        'Kivilo report',
      );
      expect(first.path, isNot(second.path));
      expect(await first.readAsString(), '%PDF-1.7\nreport');
      expect(await second.readAsString(), contains('published update'));
    },
  );

  test('an invalid download is removed and never offered as a PDF', () async {
    adapter.body = '<html>Storage failure</html>';
    await expectLater(
      pdf.download('https://storage.test/report.pdf', 'Kivilo report'),
      throwsFormatException,
    );
    expect(Directory('${root.path}/report-pdfs').listSync(), isEmpty);
  });
}
