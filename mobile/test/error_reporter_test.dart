import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/services/api_failure.dart';
import 'package:kivilo/services/error_reporter.dart';

/// A stand-in for /api/v1/errors that answers each request with the next status.
Future<({HttpServer server, List<Map<String, dynamic>> bodies})> _server(
  List<int> statuses,
) async {
  final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
  final bodies = <Map<String, dynamic>>[];
  server.listen((request) async {
    bodies.add(jsonDecode(await utf8.decodeStream(request)) as Map<String, dynamic>);
    final status = statuses.length > 1 ? statuses.removeAt(0) : statuses.single;
    request.response
      ..statusCode = status
      ..headers.contentType = ContentType.json
      ..write('{}');
    await request.response.close();
  });
  addTearDown(() => server.close(force: true));
  return (server: server, bodies: bodies);
}

ErrorReporter _reporter(File file, String baseUrl) => ErrorReporter(
  dio: Dio(BaseOptions(baseUrl: baseUrl)),
  file: file,
  source: 'ANDROID',
  release: '1.0.0 (22) patch 12',
);

Future<List<dynamic>> _pending(File file) async =>
    await file.exists() ? jsonDecode(await file.readAsString()) as List : [];

void main() {
  late File file;

  setUp(() async {
    final directory = await Directory.systemTemp.createTemp('kivilo-errors');
    addTearDown(() => directory.delete(recursive: true));
    file = File('${directory.path}/error-reports.json');
  });
  tearDown(() => ErrorReporter.current = null);

  test('a programmer error shown as a plain sentence is reported, once', () async {
    final api = await _server([200]);
    final reporter = _reporter(file, 'http://127.0.0.1:${api.server.port}');
    ErrorReporter.current = reporter;

    expect(
      plainError(StateError('Capture lease changed')),
      'Something went wrong. Please try again.',
    );
    plainError(StateError('Capture lease changed'));
    await pumpEventQueue();
    await reporter.flush();

    expect(api.bodies, hasLength(1));
    expect(api.bodies.single['source'], 'ANDROID');
    final report = (api.bodies.single['errors'] as List).single as Map;
    expect(report, containsPair('context', 'caught'));
    expect(report, containsPair('name', 'StateError'));
    expect(report['message'], contains('Capture lease changed'));
    expect(report, containsPair('release', '1.0.0 (22) patch 12'));
    expect(report['path'], isNull);
    expect(report['stack'], isNotEmpty);
    expect(await _pending(file), isEmpty);
  });

  /// The server records its own failures, and no signal is not a bug.
  test('a refusal, a server failure or no signal is never reported', () async {
    final api = await _server([200]);
    ErrorReporter.current = _reporter(file, 'http://127.0.0.1:${api.server.port}');
    final request = RequestOptions(path: '/api/v1/x');

    plainError(const ApiFailure('You have been signed out.', 401));
    plainError(ApiFailure.noConnection);
    plainError(DioException(requestOptions: request, response: Response(requestOptions: request, statusCode: 500)));
    ErrorReporter.report(const SocketException('Network is unreachable'), null, 'platform');
    ErrorReporter.report(TimeoutException('read'), null, 'platform');
    await pumpEventQueue();

    expect(api.bodies, isEmpty);
    expect(await _pending(file), isEmpty);
  });

  test('a report made with no signal waits on the phone until it can be sent', () async {
    // Nothing listens on port 1, so the post fails the way it does with no signal.
    final offline = _reporter(file, 'http://127.0.0.1:1');
    ErrorReporter.current = offline;
    plainError(StateError('taken offline'));
    await pumpEventQueue();
    await offline.flush();
    expect(await _pending(file), hasLength(1));

    final api = await _server([503, 200]);
    final online = _reporter(file, 'http://127.0.0.1:${api.server.port}');
    await online.flush();
    expect(await _pending(file), hasLength(1), reason: 'a failing server keeps it too');
    await online.flush();

    expect(api.bodies, hasLength(2));
    expect(await _pending(file), isEmpty);
  });

  test('a batch the server will never accept is dropped, not retried forever', () async {
    final api = await _server([400]);
    final reporter = _reporter(file, 'http://127.0.0.1:${api.server.port}');
    ErrorReporter.current = reporter;
    plainError(FormatException('bad'));
    await pumpEventQueue();
    await reporter.flush();

    expect(api.bodies, hasLength(1));
    expect(await _pending(file), isEmpty);
  });

  test('a phone offline for long keeps only the latest twenty', () async {
    final reporter = _reporter(file, 'http://127.0.0.1:1');
    ErrorReporter.current = reporter;
    for (var i = 0; i < 25; i++) {
      plainError(StateError('error $i'));
    }
    await pumpEventQueue();
    await reporter.flush();

    final pending = await _pending(file);
    expect(pending, hasLength(20));
    expect((pending.last as Map)['message'], contains('error 24'));
  });
}
