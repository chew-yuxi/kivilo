import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/services/illustration_cache.dart';
import 'package:kivilo/ui/kivilo_illustration.dart';

class _ArtworkAdapter implements HttpClientAdapter {
  final requests = <RequestOptions>[];
  bool offline = false;
  Uint8List? replacement;
  Future<void>? gate;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    if (gate != null) await gate;
    if (offline) {
      throw DioException(
        requestOptions: options,
        type: DioExceptionType.connectionError,
        error: const SocketException('offline'),
      );
    }
    final bytes =
        replacement ??
        await File(
          '../public/illustrations/${options.uri.pathSegments.last}',
        ).readAsBytes();
    return ResponseBody.fromBytes(
      bytes,
      200,
      headers: {
        Headers.contentTypeHeader: ['image/webp'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Directory temporary;
  late _ArtworkAdapter adapter;
  late IllustrationCache cache;

  IllustrationCache newCache({String origin = 'https://kivilo.test'}) =>
      IllustrationCache(
        baseUrl: origin,
        downloads: Dio()..httpClientAdapter = adapter,
        temporaryDirectory: () async => temporary,
      );

  setUp(() {
    temporary = Directory.systemTemp.createTempSync('kivilo-art-test-');
    adapter = _ArtworkAdapter();
    cache = newCache();
  });
  tearDown(() async {
    PaintingBinding.instance.imageCache.clear();
    PaintingBinding.instance.imageCache.clearLiveImages();
    await temporary.delete(recursive: true);
  });

  test('all eight hosted WebPs decode at the manifest dimensions', () async {
    final manifest =
        jsonDecode(await File('design/illustration-assets.json').readAsString())
            as Map<String, dynamic>;
    for (final scene in manifest['scenes'] as List<dynamic>) {
      final catalog = KiviloScene.values.byName(scene['name'] as String);
      final variants = [catalog.small, catalog.large];
      for (var i = 0; i < variants.length; i++) {
        final expected = scene['variants'][i] as Map<String, dynamic>;
        final variant = variants[i];
        expect('/illustrations/${variant.filename}', expected['path']);
        expect(variant.bytes, expected['bytes']);
        final bytes = await File('../public${expected['path']}').readAsBytes();
        expect(bytes.length, variant.bytes);
        final codec = await ui.instantiateImageCodec(bytes);
        final frame = await codec.getNextFrame();
        expect(frame.image.width, expected['width']);
        expect(frame.image.height, expected['height']);
        expect(frame.image.width, variant.width);
        expect(frame.image.height, variant.height);
        frame.image.dispose();
        codec.dispose();
      }
    }
  });

  test('concurrent views share one unauthenticated atomic download', () async {
    final gate = Completer<void>();
    adapter.gate = gate.future;
    final first = cache.load(KiviloScene.capture.small);
    final second = cache.load(KiviloScene.capture.small);
    expect(identical(first, second), isTrue);
    gate.complete();
    final files = await Future.wait([first, second]);
    expect(files[0].path, files[1].path);
    expect(adapter.requests, hasLength(1));
    expect(
      adapter.requests.single.headers.containsKey('Authorization'),
      isFalse,
    );
    expect(adapter.requests.single.uri.origin, 'https://kivilo.test');
    expect(await files.first.length(), KiviloScene.capture.small.bytes);
    expect(
      files.first.parent.listSync().where(
        (file) => file.path.endsWith('.part'),
      ),
      isEmpty,
    );
  });

  test('a new cache instance serves downloaded art while offline', () async {
    final original = await cache.load(KiviloScene.inventory.large);
    adapter.offline = true;
    final reopened = await newCache().load(KiviloScene.inventory.large);
    expect(reopened.path, original.path);
    expect(adapter.requests, hasLength(1));
  });

  test('the same cache recovers after the OS removes its directory', () async {
    final file = await cache.load(KiviloScene.capture.small);
    await file.parent.delete(recursive: true);
    expect(
      await (await cache.load(KiviloScene.capture.small)).exists(),
      isTrue,
    );
    expect(adapter.requests, hasLength(2));
  });

  test(
    'same-size corrupt cached bytes are discarded and fetched again',
    () async {
      final variant = KiviloScene.sign.small;
      final file = await cache.load(variant);
      await file.writeAsBytes(Uint8List(variant.bytes), flush: true);
      final repaired = await cache.load(variant);
      expect(adapter.requests, hasLength(2));
      expect(
        await repaired.readAsBytes(),
        await File('../public/illustrations/${variant.filename}').readAsBytes(),
      );
    },
  );

  test('a failed first fetch does not poison a later retry', () async {
    adapter.offline = true;
    await expectLater(
      cache.load(KiviloScene.handover.small),
      throwsA(isA<IllustrationUnavailable>()),
    );
    adapter.offline = false;
    expect(
      await (await cache.load(KiviloScene.handover.small)).exists(),
      isTrue,
    );
    expect(adapter.requests, hasLength(2));
  });

  test('a temporary-directory failure is retried', () async {
    var attempts = 0;
    final recovering = IllustrationCache(
      baseUrl: 'https://kivilo.test',
      downloads: Dio()..httpClientAdapter = adapter,
      temporaryDirectory: () async {
        if (attempts++ == 0) {
          throw const FileSystemException('temporarily unavailable');
        }
        return temporary;
      },
    );
    await expectLater(
      recovering.load(KiviloScene.capture.small),
      throwsA(isA<IllustrationUnavailable>()),
    );
    expect(
      await (await recovering.load(KiviloScene.capture.small)).exists(),
      isTrue,
    );
    expect(attempts, 2);
  });

  test('invalid server bytes never become a cached image', () async {
    adapter.replacement = Uint8List(KiviloScene.handover.small.bytes);
    await expectLater(
      cache.load(KiviloScene.handover.small),
      throwsA(isA<IllustrationUnavailable>()),
    );
    expect(temporary.listSync(recursive: true).whereType<File>(), isEmpty);
  });

  test(
    'only current versioned artwork survives cache initialization',
    () async {
      final file = await cache.load(KiviloScene.capture.small);
      await File('${file.parent.path}/capture-old.webp').writeAsString('old');
      await File(
        '${file.parent.path}/interrupted.part',
      ).writeAsString('partial');
      await newCache().load(KiviloScene.capture.small);
      expect(file.parent.listSync().map((file) => file.uri.pathSegments.last), [
        KiviloScene.capture.small.filename,
      ]);
      expect(adapter.requests, hasLength(1));
    },
  );

  test('a stalled response is bounded and can be retried', () async {
    final gate = Completer<void>();
    adapter.gate = gate.future;
    final short = IllustrationCache(
      baseUrl: 'https://kivilo.test',
      downloads: Dio()..httpClientAdapter = adapter,
      temporaryDirectory: () async => temporary,
      timeout: const Duration(milliseconds: 30),
    );
    await expectLater(
      short.load(KiviloScene.sign.small),
      throwsA(isA<IllustrationUnavailable>()),
    );
    adapter.gate = null;
    gate.complete();
    expect(await (await cache.load(KiviloScene.sign.small)).exists(), isTrue);
    expect(adapter.requests, hasLength(2));
  });

  testWidgets(
    'small repeated art renders one download at the display resolution',
    (tester) async {
      tester.view.devicePixelRatio = 3;
      tester.view.physicalSize = const Size(1170, 2532);
      addTearDown(tester.view.reset);
      late Completer<void> gate;
      late Future<File> loading;
      await tester.runAsync(() async {
        gate = Completer<void>();
        adapter.gate = gate.future;
        loading = cache.load(KiviloScene.capture.small);
      });
      await tester.pumpWidget(
        MaterialApp(
          home: Row(
            children: [
              for (var i = 0; i < 2; i++)
                KiviloIllustration(
                  scene: KiviloScene.capture,
                  width: 56,
                  height: 56,
                  cache: cache,
                ),
            ],
          ),
        ),
      );
      await tester.runAsync(() async {
        gate.complete();
        final file = await loading;
        await precacheImage(
          ResizeImage(FileImage(file), width: 168),
          tester.element(find.byType(KiviloIllustration).first),
        );
      });
      await tester.pumpAndSettle();
      expect(adapter.requests, hasLength(1));
      expect(
        adapter.requests.single.uri.path,
        endsWith(KiviloScene.capture.small.filename),
      );
      final rendered = tester.widget<RawImage>(find.byType(RawImage).first);
      expect(rendered.image, isNotNull);
      expect(rendered.image!.width, 168);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'a failed first image leaves the next action and layout unchanged',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      adapter.offline = true;
      late Completer<void> gate;
      late Future<void> failed;
      await tester.runAsync(() async {
        gate = Completer<void>();
        adapter.gate = gate.future;
        failed = expectLater(
          cache.load(KiviloScene.handover.large),
          throwsA(isA<IllustrationUnavailable>()),
        );
      });
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Column(
              children: [
                KiviloIllustration(
                  scene: KiviloScene.handover,
                  width: 240,
                  height: 144,
                  cache: cache,
                ),
                FilledButton(
                  onPressed: () {},
                  child: const Text('Continue inspection'),
                ),
              ],
            ),
          ),
        ),
      );
      final before = tester.getRect(find.byType(FilledButton));
      await tester.runAsync(() async {
        gate.complete();
        await failed;
      });
      await tester.pumpAndSettle();
      expect(tester.getRect(find.byType(FilledButton)), before);
      expect(find.text('Continue inspection').hitTestable(), findsOneWidget);
      expect(find.byType(Image), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
}
