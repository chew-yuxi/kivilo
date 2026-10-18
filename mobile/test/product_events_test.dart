import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/services/product_events.dart';

String _token(String owner) =>
    '${base64Url.encode(utf8.encode('{}'))}.${base64Url.encode(utf8.encode(jsonEncode({'sub': owner})))}.signature';
ProductEventSession _session(String owner) =>
    ProductEventSession(ownerId: owner, accessToken: _token(owner));

String _requestOwner(RequestOptions request) {
  final token = (request.headers['Authorization'] as String).substring(7);
  return (jsonDecode(
            utf8.decode(
              base64Url.decode(base64Url.normalize(token.split('.')[1])),
            ),
          )
          as Map)['sub']
      as String;
}

ResponseBody _response(int status, [Object body = const <String, Object?>{}]) =>
    ResponseBody.fromString(
      jsonEncode(body),
      status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );

class _Adapter implements HttpClientAdapter {
  _Adapter(this.respond);
  final Future<ResponseBody> Function(RequestOptions) respond;
  final requests = <RequestOptions>[];
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    return respond(options);
  }

  @override
  void close({bool force = false}) {}
}

Dio _dio(_Adapter adapter) =>
    Dio(BaseOptions(baseUrl: 'https://kivilo.test'))
      ..httpClientAdapter = adapter;
Future<Map<String, dynamic>> _pending(File file) async => await file.exists()
    ? jsonDecode(await file.readAsString()) as Map<String, dynamic>
    : {};

void main() {
  late File file;
  ProductEventSession? session;
  setUp(() async {
    final directory = await Directory.systemTemp.createTemp(
      'kivilo-product-events',
    );
    addTearDown(() => directory.delete(recursive: true));
    file = File('${directory.path}/events.json');
    session = _session('owner-a');
  });
  tearDown(() => ProductEvents.current = null);

  ProductEvents reporter(Dio dio, {String source = 'IOS'}) => ProductEvents(
    dio: dio,
    file: file,
    source: source,
    release: '1.0.0 (24) patch 2',
    session: () => session,
  );

  test(
    'offline events survive restart and retry with the same UUID and only allowed properties',
    () async {
      var online = false;
      var status = 503;
      final stored = <String>{};
      final adapter = _Adapter((request) async {
        if (!online) {
          throw DioException(
            requestOptions: request,
            type: DioExceptionType.connectionError,
          );
        }
        if (request.path == '/api/v1/me') {
          return _response(200, {'id': 'stakeholder-a'});
        }
        final events = (request.data as Map)['events'] as List;
        for (final event in events) {
          stored.add((event as Map)['id'] as String);
        }
        return _response(status);
      });
      await reporter(_dio(adapter)).record(ProductScreenName.capture);
      final queued = ((await _pending(file))['owner-a'] as List).single as Map;
      expect(queued.keys.toSet(), {
        'id',
        'name',
        'properties',
        'release',
        'occurredAt',
      });
      expect(
        queued['id'],
        matches(
          RegExp(
            r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
          ),
        ),
      );
      expect(queued['properties'], {'screen': 'capture'});
      expect(queued['release'], '1.0.0 (24) patch 2');
      expect(DateTime.parse(queued['occurredAt'] as String).isUtc, isTrue);
      online = true;
      final relaunched = reporter(_dio(adapter));
      await relaunched.flush();
      expect((await _pending(file))['owner-a'], hasLength(1));
      status = 200;
      await relaunched.flush();
      final posts = adapter.requests
          .where((request) => request.path == '/api/v1/events')
          .toList();
      expect(posts, hasLength(2));
      expect(posts.first.data, posts.last.data);
      expect(posts.first.headers['x-kivilo-owner'], 'stakeholder-a');
      expect((posts.first.data as Map)['source'], 'IOS');
      expect(
        stored,
        hasLength(1),
        reason:
            'a lost success response can be retried without another server row',
      );
      expect(await _pending(file), isEmpty);
    },
  );

  test(
    'the newest twenty are retained per owner and only three accounts are kept',
    () async {
      var online = false;
      final adapter = _Adapter((request) async {
        if (!online) {
          throw DioException(
            requestOptions: request,
            type: DioExceptionType.connectionError,
          );
        }
        return _response(200, {'id': 'stakeholder-${_requestOwner(request)}'});
      });
      final events = reporter(_dio(adapter));
      await Future.wait(
        List.generate(25, (_) => events.record(ProductScreenName.room)),
      );
      expect((await _pending(file))['owner-a'], hasLength(20));
      session = _session('owner-b');
      for (var i = 0; i < 22; i++) {
        await events.record(ProductScreenName.account);
      }
      session = _session('owner-c');
      await events.record(ProductScreenName.inspections);
      session = _session('owner-d');
      await events.record(ProductScreenName.report);
      final queues = await _pending(file);
      expect(queues.keys.toList(), ['owner-b', 'owner-c', 'owner-d']);
      expect(queues['owner-b'], hasLength(20));
      final requestCount = adapter.requests.length;
      session = null;
      await events.flush();
      expect(adapter.requests, hasLength(requestCount));
      session = _session('owner-b');
      online = true;
      await events.flush();
      final post = adapter.requests.last;
      expect(_requestOwner(post), 'owner-b');
      expect(post.headers['x-kivilo-owner'], 'stakeholder-owner-b');
      expect(
        ((post.data as Map)['events'] as List).map(
          (event) => (event as Map)['properties'],
        ),
        everyElement({'screen': 'account'}),
      );
      expect((await _pending(file)).keys.toSet(), {'owner-c', 'owner-d'});
    },
  );

  test(
    'switching accounts while verified owner lookup is pending never posts the old queue',
    () async {
      final lookupStarted = Completer<void>();
      final lookupFinished = Completer<void>();
      final adapter = _Adapter((request) async {
        final owner = _requestOwner(request);
        if (request.path == '/api/v1/me' && owner == 'owner-a') {
          lookupStarted.complete();
          await lookupFinished.future;
        }
        return _response(200, {'id': 'stakeholder-$owner'});
      });
      final events = reporter(_dio(adapter));
      final first = events.record(ProductScreenName.inspection);
      await lookupStarted.future;
      session = _session('owner-b');
      lookupFinished.complete();
      await first;
      expect(
        adapter.requests.where((request) => request.path == '/api/v1/events'),
        isEmpty,
      );
      await events.record(ProductScreenName.account);
      final post = adapter.requests.last;
      expect(_requestOwner(post), 'owner-b');
      expect(post.headers['x-kivilo-owner'], 'stakeholder-owner-b');
      expect((await _pending(file))['owner-a'], hasLength(1));
    },
  );

  test(
    'an Api-style bearer interceptor cannot replace the queued account token on POST',
    () async {
      final adapter = _Adapter(
        (request) async => _response(200, {'id': 'stakeholder-owner-a'}),
      );
      final dio = _dio(adapter);
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            if (options.path == '/api/v1/events') session = _session('owner-b');
            options.headers['Authorization'] = 'Bearer ${session!.accessToken}';
            handler.next(options);
          },
        ),
      );
      await reporter(dio).record(ProductScreenName.addenda);
      expect(adapter.requests.map((request) => request.path), ['/api/v1/me']);
      expect((await _pending(file))['owner-a'], hasLength(1));
    },
  );

  test(
    'an in-flight old-account success cannot remove or relabel another account events',
    () async {
      final postedA = Completer<void>();
      final finishA = Completer<void>();
      final stored = <String>{};
      var blockFirst = true;
      final adapter = _Adapter((request) async {
        final owner = _requestOwner(request);
        if (request.path == '/api/v1/me') {
          return _response(200, {'id': 'stakeholder-$owner'});
        }
        expect(request.headers['x-kivilo-owner'], 'stakeholder-$owner');
        for (final event in (request.data as Map)['events'] as List) {
          stored.add((event as Map)['id'] as String);
        }
        if (owner == 'owner-a' && blockFirst) {
          blockFirst = false;
          postedA.complete();
          await finishA.future;
        }
        return _response(200);
      });
      final events = reporter(_dio(adapter));
      final first = events.record(ProductScreenName.room);
      await postedA.future;
      session = _session('owner-b');
      final second = events.record(ProductScreenName.account);
      finishA.complete();
      await Future.wait([first, second]);
      expect((await _pending(file)).keys.toList(), ['owner-a']);
      session = _session('owner-a');
      await events.flush();
      final posts = adapter.requests
          .where((request) => request.path == '/api/v1/events')
          .toList();
      expect(posts.map(_requestOwner), ['owner-a', 'owner-b', 'owner-a']);
      expect(posts.first.data, posts.last.data);
      expect(stored, hasLength(2));
      expect(await _pending(file), isEmpty);
    },
  );

  test(
    'invalid tokens and unexpected stored properties never become analytics data',
    () async {
      final adapter = _Adapter((request) async => _response(503));
      final events = reporter(_dio(adapter));
      session = ProductEventSession(
        ownerId: 'owner-a',
        accessToken: _token('owner-b'),
      );
      await events.record(ProductScreenName.capture);
      expect(adapter.requests, isEmpty);
      expect(await _pending(file), isEmpty);
      session = _session('owner-a');
      await events.record(ProductScreenName.room);
      final queues = await _pending(file);
      final event = (queues['owner-a'] as List).single as Map;
      event.remove('release');
      event['path'] = '/reports/PRIVATE-TOKEN';
      await file.writeAsString(jsonEncode(queues));
      adapter.requests.clear();
      await events.flush();
      expect(
        adapter.requests,
        isEmpty,
        reason:
            'unexpected fields are never transmitted, even from an older or corrupt file',
      );
    },
  );

  test(
    '400 drops a permanent schema refusal, while 401 waits without Api refresh retry',
    () async {
      var status = 401;
      final adapter = _Adapter(
        (request) async => request.path == '/api/v1/me'
            ? _response(200, {'id': 'stakeholder-a'})
            : _response(status),
      );
      final dio = _dio(adapter);
      var refreshed = 0;
      dio.interceptors.add(
        InterceptorsWrapper(
          onError: (error, handler) {
            if (error.response?.statusCode == 401 &&
                error.requestOptions.extra['retried'] != true) {
              refreshed++;
            }
            handler.next(error);
          },
        ),
      );
      final events = reporter(dio, source: 'ANDROID');
      await events.record(ProductScreenName.newInspection);
      expect((await _pending(file))['owner-a'], hasLength(1));
      expect(refreshed, 0);
      status = 400;
      await events.flush();
      expect(await _pending(file), isEmpty);
      expect((adapter.requests.last.data as Map)['source'], 'ANDROID');
    },
  );

  testWidgets(
    'route and tab visibility count once, then count again when popped back',
    (tester) async {
      final recorded = <ProductScreenName>[];
      final events = _RecordingEvents(recorded, () => session);
      ProductEvents.current = events;
      var selected = ProductScreenName.inspections;
      await tester.pumpWidget(
        MaterialApp(
          navigatorObservers: [productRouteObserver],
          home: StatefulBuilder(
            builder: (context, setState) => ProductScreen(
              screen: selected,
              child: Scaffold(
                body: Column(
                  children: [
                    TextButton(
                      onPressed: () =>
                          setState(() => selected = ProductScreenName.account),
                      child: const Text('Account tab'),
                    ),
                    TextButton(
                      onPressed: () => setState(() {}),
                      child: const Text('Rebuild'),
                    ),
                    TextButton(
                      onPressed: () => showDialog<void>(
                        context: context,
                        builder: (context) => AlertDialog(
                          title: const Text('Choose a value'),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.of(context).pop(),
                              child: const Text('Done'),
                            ),
                          ],
                        ),
                      ),
                      child: const Text('Open selection'),
                    ),
                    TextButton(
                      onPressed: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const ProductScreen(
                            screen: ProductScreenName.report,
                            child: Scaffold(body: Text('Report')),
                          ),
                        ),
                      ),
                      child: const Text('Open report'),
                    ),
                    const ProductScreen(
                      screen: ProductScreenName.capture,
                      active: false,
                      child: Text('Hidden capture'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
      expect(recorded, [ProductScreenName.inspections]);
      await tester.tap(find.text('Account tab'));
      await tester.pump();
      await tester.tap(find.text('Rebuild'));
      await tester.pump();
      expect(recorded, [
        ProductScreenName.inspections,
        ProductScreenName.account,
      ]);
      await tester.tap(find.text('Open selection'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Done'));
      await tester.pumpAndSettle();
      expect(recorded, [
        ProductScreenName.inspections,
        ProductScreenName.account,
      ], reason: 'dismissing a field selection is not another page view');
      await tester.tap(find.text('Open report'));
      await tester.pumpAndSettle();
      expect(recorded.last, ProductScreenName.report);
      tester.state<NavigatorState>(find.byType(Navigator)).pop();
      await tester.pumpAndSettle();
      expect(recorded, [
        ProductScreenName.inspections,
        ProductScreenName.account,
        ProductScreenName.report,
        ProductScreenName.account,
      ]);
    },
  );
}

class _RecordingEvents extends ProductEvents {
  _RecordingEvents(this.recorded, ProductEventSession? Function() session)
    : super(
        dio: Dio(),
        file: File('/unused-product-events.json'),
        source: 'IOS',
        release: 'test',
        session: session,
      );
  final List<ProductScreenName> recorded;
  @override
  Future<void> record(ProductScreenName screen) async {
    recorded.add(screen);
  }
}
