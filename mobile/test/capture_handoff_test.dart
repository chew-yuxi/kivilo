import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:dio/dio.dart';
import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kivilo/models/inspection.dart';
import 'package:kivilo/screens/capture_screen.dart';
import 'package:kivilo/services/api.dart';
import 'package:kivilo/services/capture_queue.dart';
import 'package:kivilo/services/read_cache.dart';
import 'package:kivilo/ui/kivilo_theme.dart';

class _PausedRoomApi extends Api {
  _PausedRoomApi(this.initial) : super(attachAuth: false, cache: ReadCache()) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (request, handler) => handler.reject(
          DioException(
            requestOptions: request,
            type: DioExceptionType.connectionError,
          ),
        ),
      ),
    );
  }

  final RoomDetail initial;
  final refreshes = <Completer<RoomDetail>>[];
  var reads = 0;

  @override
  Future<RoomDetail> room(String inspectionId, String roomId) {
    if (reads++ == 0) return Future.value(initial);
    final refresh = Completer<RoomDetail>();
    refreshes.add(refresh);
    return refresh.future;
  }
}

EvidenceCapture _saved(String clientId) => EvidenceCapture(
  id: 'server-$clientId',
  clientId: clientId,
  kind: 'PHOTO',
  url: 'https://evidence.test/$clientId.png',
  note: 'Photo $clientId',
);

RoomDetail _room(List<EvidenceCapture> captures, {List<String>? sofaIds}) =>
    RoomDetail(
      id: 'living',
      name: 'Living room',
      status: 'REVIEW',
      items: [
        InventoryItem(
          id: 'sofa',
          name: 'Sofa',
          category: 'FURNITURE',
          condition: 'GOOD',
          quantity: 1,
          evidenceCaptureIds:
              sofaIds ?? captures.map((photo) => photo.id).toList(),
        ),
        const InventoryItem(
          id: 'table',
          name: 'Table',
          category: 'FURNITURE',
          condition: 'GOOD',
          quantity: 1,
        ),
      ],
      captures: captures,
    );

void main() {
  late CaptureQueue queue;
  late Directory root;
  late List<int> png;
  late ui.Image remoteFrame;
  final remoteImages = <Completer<ImageInfo>>[];

  setUp(() async {
    final recorder = ui.PictureRecorder();
    ui.Canvas(recorder).drawColor(Colors.blue, ui.BlendMode.src);
    final picture = recorder.endRecording();
    final image = await picture.toImage(400, 300);
    png = (await image.toByteData(
      format: ui.ImageByteFormat.png,
    ))!.buffer.asUint8List();
    image.dispose();
    remoteFrame = await picture.toImage(240, 180);
    picture.dispose();
    queue = CaptureQueue(NativeDatabase.memory());
    root = Directory.systemTemp.createTempSync('kivilo-capture-handoff-');
    remoteImages.clear();
    PaintingBinding.instance.imageCache.clear();
    PaintingBinding.instance.imageCache.clearLiveImages();
  });

  tearDown(() async {
    for (final remote in remoteImages) {
      if (!remote.isCompleted) {
        remote.complete(ImageInfo(image: remoteFrame.clone()));
      }
    }
    remoteFrame.dispose();
    await queue.close();
    root.deleteSync(recursive: true);
    PaintingBinding.instance.imageCache.clear();
    PaintingBinding.instance.imageCache.clearLiveImages();
  });

  Future<void> settle(WidgetTester tester) async {
    for (var i = 0; i < 3; i++) {
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 20)),
      );
      await tester.pump(const Duration(milliseconds: 100));
    }
  }

  Future<int> enqueue(
    String clientId, {
    String? itemId = 'sofa',
    String ownerId = 'owner',
    String roomId = 'living',
    int order = 0,
  }) async {
    final path = '$clientId.png';
    File('${root.path}/$path').writeAsBytesSync(png);
    return queue.enqueue(
      PendingCapturesCompanion.insert(
        ownerId: Value(ownerId),
        clientId: Value(clientId),
        roomId: roomId,
        inspectionId: 'inspection',
        itemId: Value(itemId),
        kind: 'PHOTO',
        relativePath: path,
        filename: path,
        mimeType: 'image/png',
        sizeBytes: png.length,
        note: Value('Photo $clientId'),
        createdAt: DateTime(2026, 10, 22).add(Duration(seconds: order)),
        // Simulate a worker that already owns this upload; the screen must not
        // start a second worker while this test controls registration and cleanup.
        claimedAt: Value(DateTime.now()),
        leaseId: Value('lease-$clientId'),
      ),
    );
  }

  Future<Completer<ImageInfo>> pauseRemoteImage(
    String clientId, {
    bool wide = false,
  }) async {
    final image = ResizeImage.resizeIfNeeded(
      160, // The grid tile decodes at its largest cell, 160 at this ratio of 1.
      null,
      NetworkImage(_saved(clientId).url),
    );
    final key = await image.obtainKey(ImageConfiguration.empty);
    final frame = Completer<ImageInfo>();
    remoteImages.add(frame);
    PaintingBinding.instance.imageCache.putIfAbsent(
      key,
      () => OneFrameImageStreamCompleter(frame.future),
    );
    return frame;
  }

  Future<void> open(
    WidgetTester tester,
    _PausedRoomApi api, {
    String? itemId,
    bool wide = false,
  }) async {
    tester.view.physicalSize = wide
        ? const Size(1100, 1000)
        : const Size(393, 1500);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      MaterialApp(theme: buildKiviloTheme(), home: const SizedBox.shrink()),
    );
    await tester.runAsync(() async {
      final context = tester.element(find.byType(SizedBox).first);
      for (final row in await queue.forRoom('living', 'owner')) {
        await precacheImage(
          ResizeImage.resizeIfNeeded(
            160, // The grid tile decodes at its largest cell, 160 at this ratio of 1.
            null,
            FileImage(File('${root.path}/${row.relativePath}')),
          ),
          context,
        );
      }
    });
    await tester.runAsync(
      () => tester.pumpWidget(
        MaterialApp(
          theme: buildKiviloTheme(),
          home: CaptureScreen(
            inspectionId: 'inspection',
            roomId: 'living',
            itemId: itemId,
            api: api,
            queue: queue,
            ownerId: 'owner',
            supportDirectory: () async => root,
          ),
        ),
      ),
    );
    await settle(tester);
  }

  Finder card(String clientId) => find.byKey(ValueKey(clientId));
  Finder image(String clientId) =>
      find.descendant(of: card(clientId), matching: find.byType(Image));
  RawImage frame(WidgetTester tester, String clientId) =>
      tester.widget<RawImage>(
        find.descendant(of: card(clientId), matching: find.byType(RawImage)),
      );

  Future<void> finish(WidgetTester tester, int id) async {
    await tester.runAsync(() async {
      final row = (await queue.byId(id))!;
      await queue.markUploaded(
        id,
        'server-${row.clientId}',
        leaseId: row.leaseId,
      );
    });
    await settle(tester);
    await tester.runAsync(() async {
      final row = (await queue.byId(id))!;
      final removed = await queue.finishIfUnchanged(row, row.leaseId!);
      expect(removed, isNotNull);
      await queue.discardFile(root, removed!);
    });
    await settle(tester);
  }

  Future<void> close(WidgetTester tester) async {
    await tester.pumpWidget(const SizedBox.shrink());
    await settle(tester);
    expect(tester.takeException(), isNull);
  }

  for (final wide in [false, true]) {
    for (final itemId in <String?>[null, 'sofa']) {
      testWidgets(
        '${wide ? 'tablet' : 'phone'} ${itemId == null ? 'room' : 'item'} photo keeps its card and decoded frame through upload',
        (tester) async {
          final id = await enqueue('first');
          final remote = await pauseRemoteImage('first', wide: wide);
          final api = _PausedRoomApi(_room([]));
          await open(tester, api, itemId: itemId, wide: wide);
          expect(card('first'), findsOneWidget);
          final cardElement = tester.element(card('first'));
          final imageState = tester.state(image('first'));
          final localFrame = frame(tester, 'first').image;
          expect(localFrame, isNotNull);

          await finish(tester, id);
          expect(await queue.byId(id), isNull);
          expect(File('${root.path}/first.png').existsSync(), isFalse);
          expect(api.refreshes, hasLength(1));
          expect(card('first'), findsOneWidget);
          expect(tester.element(card('first')), same(cardElement));
          expect(tester.state(image('first')), same(imageState));
          expect(frame(tester, 'first').image, same(localFrame));
          expect(find.text('Adding'), findsOneWidget);

          api.refreshes.single.complete(_room([_saved('first')]));
          await settle(tester);
          expect(card('first'), findsOneWidget);
          expect(tester.element(card('first')), same(cardElement));
          expect(tester.state(image('first')), same(imageState));
          expect(frame(tester, 'first').image, same(localFrame));
          expect(
            find.bySemanticsLabel(RegExp(r'In the report$')),
            findsOneWidget,
          );

          remote.complete(ImageInfo(image: remoteFrame.clone()));
          await settle(tester);
          expect(tester.state(image('first')), same(imageState));
          expect(frame(tester, 'first').image!.width, 240);
          await close(tester);
        },
      );
    }
  }

  testWidgets('matching pending and server photos are deduplicated per item', (
    tester,
  ) async {
    final id = await enqueue('sofa-photo');
    await enqueue('table-photo', itemId: 'table', order: 1);
    await enqueue('room-photo', itemId: null, order: 2);
    await enqueue('other-owner', ownerId: 'someone-else', order: 3);
    await enqueue('other-room', roomId: 'kitchen', order: 4);
    await pauseRemoteImage('sofa-photo');
    final api = _PausedRoomApi(
      _room(
        [_saved('sofa-photo'), _saved('table-photo')],
        sofaIds: ['server-sofa-photo'],
      ),
    );
    await open(tester, api, itemId: 'sofa');
    expect(card('sofa-photo'), findsOneWidget);
    expect(find.text('Photo sofa-photo'), findsOneWidget);
    for (final excluded in [
      'table-photo',
      'room-photo',
      'other-owner',
      'other-room',
    ]) {
      expect(card(excluded), findsNothing);
    }
    final imageState = tester.state(image('sofa-photo'));
    await finish(tester, id);
    api.refreshes.single.complete(
      _room(
        [_saved('sofa-photo'), _saved('table-photo')],
        sofaIds: ['server-sofa-photo'],
      ),
    );
    await settle(tester);
    expect(card('sofa-photo'), findsOneWidget);
    expect(tester.state(image('sofa-photo')), same(imageState));
    expect(card('table-photo'), findsNothing);
    await close(tester);
  });

  for (final wide in [false, true]) {
    testWidgets(
      '${wide ? 'tablet' : 'phone'} out-of-order uploads retain order and ignore an older refresh',
      (tester) async {
        final first = await enqueue('first', order: 0);
        final second = await enqueue('second', order: 1);
        await pauseRemoteImage('first', wide: wide);
        await pauseRemoteImage('second', wide: wide);
        final api = _PausedRoomApi(_room([]));
        await open(tester, api, itemId: 'sofa', wide: wide);
        final firstState = tester.state(image('first'));
        final secondState = tester.state(image('second'));
        final firstFrame = frame(tester, 'first').image;
        final secondFrame = frame(tester, 'second').image;
        // Reading order in the grid: an earlier row, or further left on the same one.
        bool secondFirst() {
          final first = tester.getTopLeft(card('first'));
          final second = tester.getTopLeft(card('second'));
          return second.dy < first.dy ||
              (second.dy == first.dy && second.dx < first.dx);
        }

        expect(secondFirst(), isTrue);

        // The older photo completes first. The first refresh is already in flight
        // when the newer photo also completes, so it cannot retire either card.
        await finish(tester, first);
        await finish(tester, second);
        expect(api.refreshes, hasLength(1));
        expect(secondFirst(), isTrue);
        api.refreshes.first.complete(_room([_saved('first')]));
        await settle(tester);
        expect(api.refreshes, hasLength(2));
        expect(card('first'), findsOneWidget);
        expect(card('second'), findsOneWidget);
        expect(find.text('Adding'), findsNWidgets(2));
        expect(tester.state(image('first')), same(firstState));
        expect(tester.state(image('second')), same(secondState));
        expect(frame(tester, 'first').image, same(firstFrame));
        expect(frame(tester, 'second').image, same(secondFrame));

        // Registration order differs from local capture order.
        api.refreshes.last.complete(_room([_saved('second'), _saved('first')]));
        await settle(tester);
        expect(secondFirst(), isTrue);
        expect(tester.state(image('first')), same(firstState));
        expect(tester.state(image('second')), same(secondState));
        expect(frame(tester, 'first').image, same(firstFrame));
        expect(frame(tester, 'second').image, same(secondFrame));
        expect(
          find.bySemanticsLabel(RegExp(r'In the report$')),
          findsNWidgets(2),
        );
        await close(tester);
      },
    );
  }

  testWidgets('a deliberately deleted local photo is not kept as an upload', (
    tester,
  ) async {
    final id = await enqueue('deleted');
    final api = _PausedRoomApi(_room([]));
    await open(tester, api);
    expect(card('deleted'), findsOneWidget);
    await tester.runAsync(() => queue.requestDelete(id));
    await settle(tester);
    await tester.runAsync(() async {
      final deleted = (await queue.take(id))!;
      await queue.discardFile(root, deleted);
    });
    await settle(tester);
    expect(card('deleted'), findsNothing);
    expect(find.text('Adding'), findsNothing);
    api.refreshes.single.complete(_room([]));
    await settle(tester);
    expect(card('deleted'), findsNothing);
    await close(tester);
  });

  testWidgets('registration and cleanup in one queue update retain the photo', (
    tester,
  ) async {
    final id = await enqueue('coalesced');
    await pauseRemoteImage('coalesced');
    final api = _PausedRoomApi(_room([]));
    await open(tester, api, itemId: 'sofa');
    final imageState = tester.state(image('coalesced'));
    final localFrame = frame(tester, 'coalesced').image;
    expect(localFrame, isNotNull);

    await tester.runAsync(() async {
      final removed = await queue.transaction(() async {
        await queue.markUploaded(id, 'server-coalesced');
        final row = (await queue.byId(id))!;
        return queue.finishIfUnchanged(row, row.leaseId!);
      });
      await queue.discardFile(root, removed!);
    });
    await settle(tester);
    expect(card('coalesced'), findsOneWidget);
    expect(tester.state(image('coalesced')), same(imageState));
    expect(frame(tester, 'coalesced').image, same(localFrame));
    expect(find.text('Adding'), findsOneWidget);

    api.refreshes.single.complete(_room([_saved('coalesced')]));
    await settle(tester);
    expect(card('coalesced'), findsOneWidget);
    expect(tester.state(image('coalesced')), same(imageState));
    expect(frame(tester, 'coalesced').image, same(localFrame));
    expect(find.bySemanticsLabel(RegExp(r'In the report$')), findsOneWidget);
    await close(tester);
  });

  testWidgets(
    'a photo remains while a refresh lacks its saved item association',
    (tester) async {
      final id = await enqueue('awaiting-link');
      await pauseRemoteImage('awaiting-link');
      final api = _PausedRoomApi(_room([]));
      await open(tester, api, itemId: 'sofa');
      final imageState = tester.state(image('awaiting-link'));
      final localFrame = frame(tester, 'awaiting-link').image;
      await finish(tester, id);
      expect(card('awaiting-link'), findsOneWidget);
      api.refreshes.single.complete(
        _room([_saved('awaiting-link')], sofaIds: []),
      );
      await settle(tester);
      expect(card('awaiting-link'), findsOneWidget);
      expect(tester.state(image('awaiting-link')), same(imageState));
      expect(frame(tester, 'awaiting-link').image, same(localFrame));
      expect(find.text('Adding'), findsOneWidget);
      await tester.tap(find.byTooltip('Retry uploads'));
      await settle(tester);
      expect(api.refreshes, hasLength(2));
      api.refreshes.last.complete(_room([_saved('awaiting-link')]));
      await settle(tester);
      expect(card('awaiting-link'), findsOneWidget);
      expect(tester.state(image('awaiting-link')), same(imageState));
      expect(frame(tester, 'awaiting-link').image, same(localFrame));
      expect(find.bySemanticsLabel(RegExp(r'In the report$')), findsOneWidget);
      await close(tester);
    },
  );
}
